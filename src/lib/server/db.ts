// Database access helpers and repository layer
// References: docs/05_BACKEND_SCHEMA.md, docs/06_API_CONTRACT.md

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  AuditEventRecord,
  NomineeRecord,
  ProfileRecord,
  RecoveryApprovalRecord,
  RecoveryRequestRecord,
  VaultRecord,
} from '@/types/database';
import type {
  CreateVaultRequest,
  NomineeInput,
  NomineeItemResponse,
  UpdateEnvelopeRequest,
  DecisionResponse,
  CheckInResponse,
  CancelRecoveryResponse,
} from '@/types/api';
import {
  processCheckIn,
  evaluateScheduledTransition,
  processNomineeDecision,
  cancelRecovery,
  VaultStateContext,
  getAuthoritativeTime,
  DEMO_GRACE_PERIOD_SECONDS,
  DEMO_COOLING_OFF_SECONDS,
  DEMO_UNLOCK_WINDOW_SECONDS,
} from '@/lib/recovery';
import { buildAuditEvent, verifyAuditChain } from '@/lib/audit';
import { GENESIS_PREVIOUS_HASH, AuditEvent, AuditEventType, AuditMetadata } from '@/types/audit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export class DbError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'DbError';
    this.code = code;
  }
}

/**
 * Hash single-use invitation tokens using SHA-256.
 * The raw token is sent to the recipient once; only the hash is persisted.
 */
export async function hashToken(token: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// In-Memory Test & Local Mock Store (For deterministic CI & local unit tests)
// ============================================================================
class MockDbStore {
  profiles = new Map<string, ProfileRecord>();
  vaults = new Map<string, VaultRecord>();
  nominees = new Map<string, NomineeRecord>();
  auditEvents: AuditEventRecord[] = [];
  recoveryRequests = new Map<string, RecoveryRequestRecord>();
  recoveryApprovals = new Map<string, RecoveryApprovalRecord>();

  reset() {
    this.profiles.clear();
    this.vaults.clear();
    this.nominees.clear();
    this.auditEvents = [];
    this.recoveryRequests.clear();
    this.recoveryApprovals.clear();
  }
}

const mockStore = new MockDbStore();

export function getMockDb() {
  return mockStore;
}

function shouldUseMockDb(): boolean {
  if (process.env.NODE_ENV === 'test') return true;
  if (!supabaseUrl || !supabaseServiceKey) return true;
  if (supabaseUrl.includes('example.supabase.co')) return true;
  return false;
}

let cachedSupabaseClient: SupabaseClient | null = null;

export function getSupabaseServiceClient(): SupabaseClient | null {
  if (shouldUseMockDb()) return null;
  if (!cachedSupabaseClient) {
    cachedSupabaseClient = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: { persistSession: false },
    });
  }
  return cachedSupabaseClient;
}

// ============================================================================
// Core Database Persistence Operations (Workstream B)
// ============================================================================

export async function createVault(
  ownerId: string,
  data: CreateVaultRequest
): Promise<VaultRecord> {
  const now = new Date();
  const nextCheckin = new Date(now.getTime() + data.checkinIntervalSeconds * 1000);
  const vaultId = data.id || crypto.randomUUID();

  const record: VaultRecord = {
    id: vaultId,
    owner_id: ownerId,
    status: 'ACTIVE',
    schema_version: data.schemaVersion,
    crypto_version: data.cryptoVersion,
    payload_ciphertext: data.payloadCiphertext,
    payload_nonce: data.payloadNonce,
    payload_aad_version: data.payloadAadVersion,
    wrapped_dek: data.wrappedDek,
    wrap_nonce: data.wrapNonce,
    kdf_name: data.kdfName,
    kdf_params: data.kdfParams,
    kdf_salt: data.kdfSalt,
    checkin_interval_seconds: data.checkinIntervalSeconds,
    last_checkin_at: now.toISOString(),
    next_checkin_at: nextCheckin.toISOString(),
    grace_ends_at: null,
    cooling_off_ends_at: null,
    unlock_expires_at: null,
    revision: 1,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const client = getSupabaseServiceClient();
  if (client) {
    const { error } = await client.from('vaults').insert(record);
    if (error) {
      throw new DbError('INTERNAL_ERROR', `Failed to create vault: ${error.message}`);
    }
  } else {
    mockStore.vaults.set(vaultId, record);
  }

  await appendAuditEventDb(
    vaultId,
    'vault_created',
    { schemaVersion: data.schemaVersion, cryptoVersion: data.cryptoVersion },
    ownerId
  );

  return record;
}

export async function getVaultById(
  vaultId: string,
  requestingUserId: string
): Promise<{ vault: VaultRecord; isOwner: boolean }> {
  const client = getSupabaseServiceClient();

  if (client) {
    const { data: vault, error } = await client
      .from('vaults')
      .select('*')
      .eq('id', vaultId)
      .maybeSingle();

    if (error || !vault) {
      throw new DbError('NOT_FOUND', 'Vault not found.');
    }

    const isOwner = vault.owner_id === requestingUserId;
    if (!isOwner) {
      // Check if user is an active nominee
      const { data: nominee } = await client
        .from('nominees')
        .select('id')
        .eq('vault_id', vaultId)
        .eq('user_id', requestingUserId)
        .eq('status', 'active')
        .maybeSingle();

      if (!nominee) {
        throw new DbError('FORBIDDEN', 'Access denied to this vault.');
      }
    }

    return { vault: vault as VaultRecord, isOwner };
  } else {
    const vault = mockStore.vaults.get(vaultId);
    if (!vault) {
      throw new DbError('NOT_FOUND', 'Vault not found.');
    }

    const isOwner = vault.owner_id === requestingUserId;
    if (!isOwner) {
      const isNominee = Array.from(mockStore.nominees.values()).some(
        (n) => n.vault_id === vaultId && n.user_id === requestingUserId && n.status === 'active'
      );
      if (!isNominee) {
        throw new DbError('FORBIDDEN', 'Access denied to this vault.');
      }
    }

    return { vault, isOwner };
  }
}

export async function updateVaultEnvelope(
  vaultId: string,
  ownerId: string,
  data: UpdateEnvelopeRequest
): Promise<VaultRecord> {
  const client = getSupabaseServiceClient();
  const now = new Date().toISOString();

  if (client) {
    // Verify ownership and check optimistic revision lock
    const { data: currentVault, error: fetchErr } = await client
      .from('vaults')
      .select('*')
      .eq('id', vaultId)
      .maybeSingle();

    if (fetchErr || !currentVault) {
      throw new DbError('NOT_FOUND', 'Vault not found.');
    }
    if (currentVault.owner_id !== ownerId) {
      throw new DbError('FORBIDDEN', 'Only the vault owner can update the envelope.');
    }
    if (currentVault.revision !== data.expectedRevision) {
      throw new DbError('REVISION_CONFLICT', 'Revision conflict. Vault envelope has changed.');
    }

    const updates: Partial<VaultRecord> = {
      payload_ciphertext: data.payloadCiphertext,
      payload_nonce: data.payloadNonce,
      payload_aad_version: data.payloadAadVersion,
      revision: currentVault.revision + 1,
      updated_at: now,
    };
    if (data.wrappedDek) updates.wrapped_dek = data.wrappedDek;
    if (data.wrapNonce) updates.wrap_nonce = data.wrapNonce;

    const { data: updatedVault, error: updateErr } = await client
      .from('vaults')
      .update(updates)
      .eq('id', vaultId)
      .eq('revision', data.expectedRevision)
      .select()
      .single();

    if (updateErr || !updatedVault) {
      throw new DbError('REVISION_CONFLICT', 'Failed to update envelope due to concurrency conflict.');
    }

    await appendAuditEventDb(
      vaultId,
      'payload_updated',
      { revision: currentVault.revision + 1, aadVersion: data.payloadAadVersion },
      ownerId
    );

    return updatedVault as VaultRecord;
  } else {
    const currentVault = mockStore.vaults.get(vaultId);
    if (!currentVault) {
      throw new DbError('NOT_FOUND', 'Vault not found.');
    }
    if (currentVault.owner_id !== ownerId) {
      throw new DbError('FORBIDDEN', 'Only the vault owner can update the envelope.');
    }
    if (currentVault.revision !== data.expectedRevision) {
      throw new DbError('REVISION_CONFLICT', 'Revision conflict. Vault envelope has changed.');
    }

    const newRevision = currentVault.revision + 1;
    const updated: VaultRecord = {
      ...currentVault,
      payload_ciphertext: data.payloadCiphertext,
      payload_nonce: data.payloadNonce,
      payload_aad_version: data.payloadAadVersion,
      wrapped_dek: data.wrappedDek ?? currentVault.wrapped_dek,
      wrap_nonce: data.wrapNonce ?? currentVault.wrap_nonce,
      revision: newRevision,
      updated_at: now,
    };

    mockStore.vaults.set(vaultId, updated);
    await appendAuditEventDb(
      vaultId,
      'payload_updated',
      { revision: newRevision, aadVersion: data.payloadAadVersion },
      ownerId
    );

    return updated;
  }
}

export async function setVaultNominees(
  vaultId: string,
  ownerId: string,
  nominees: NomineeInput[]
): Promise<NomineeItemResponse[]> {
  const { vault } = await getVaultById(vaultId, ownerId);
  if (vault.owner_id !== ownerId) {
    throw new DbError('FORBIDDEN', 'Only the vault owner can manage nominees.');
  }

  const now = new Date();
  const inviteExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const results: NomineeItemResponse[] = [];
  const records: NomineeRecord[] = [];

  for (const n of nominees) {
    const rawToken = `inv_${crypto.randomUUID().replace(/-/g, '')}`;
    const tokenHash = await hashToken(rawToken);
    const nomineeId = crypto.randomUUID();

    const record: NomineeRecord = {
      id: nomineeId,
      vault_id: vaultId,
      user_id: null,
      email: n.email,
      display_name: n.displayName,
      share_index: n.shareIndex,
      invite_token_hash: tokenHash,
      invite_expires_at: inviteExpiresAt,
      invite_accepted_at: null,
      status: 'pending',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    records.push(record);
    results.push({
      id: nomineeId,
      email: n.email,
      displayName: n.displayName,
      shareIndex: n.shareIndex,
      status: 'pending',
      inviteToken: rawToken,
      inviteExpiresAt,
    });
  }

  const client = getSupabaseServiceClient();
  if (client) {
    // Delete existing pending nominees and replace with new roster
    await client.from('nominees').delete().eq('vault_id', vaultId);
    const { error } = await client.from('nominees').insert(records);
    if (error) {
      throw new DbError('INTERNAL_ERROR', `Failed to set nominees: ${error.message}`);
    }
  } else {
    // In mock store, remove previous nominees for this vault
    for (const [id, nom] of Array.from(mockStore.nominees.entries())) {
      if (nom.vault_id === vaultId) {
        mockStore.nominees.delete(id);
      }
    }
    for (const r of records) {
      mockStore.nominees.set(r.id, r);
    }
  }

  await appendAuditEventDb(
    vaultId,
    'nominee_added',
    { nomineeCount: nominees.length },
    ownerId
  );

  return results;
}

export async function acceptInvite(
  inviteToken: string,
  userId: string
): Promise<{ nomineeId: string; vaultId: string; acceptedAt: string }> {
  const tokenHash = await hashToken(inviteToken);
  const now = new Date().toISOString();

  const client = getSupabaseServiceClient();
  if (client) {
    const { data: nominee, error } = await client
      .from('nominees')
      .select('*')
      .eq('invite_token_hash', tokenHash)
      .eq('status', 'pending')
      .maybeSingle();

    if (error || !nominee) {
      throw new DbError('INVITE_INVALID_OR_EXPIRED', 'Invalid or expired invitation.');
    }

    if (nominee.invite_expires_at && new Date(nominee.invite_expires_at) < new Date()) {
      throw new DbError('INVITE_INVALID_OR_EXPIRED', 'Invitation token has expired.');
    }

    const { error: updateErr } = await client
      .from('nominees')
      .update({
        user_id: userId,
        status: 'active',
        invite_accepted_at: now,
        invite_token_hash: null, // Clear token after use
      })
      .eq('id', nominee.id);

    if (updateErr) {
      throw new DbError('INTERNAL_ERROR', 'Failed to accept invitation.');
    }

    await appendAuditEventDb(
      nominee.vault_id,
      'invite_accepted',
      { nomineeId: nominee.id },
      userId
    );

    return {
      nomineeId: nominee.id,
      vaultId: nominee.vault_id,
      acceptedAt: now,
    };
  } else {
    let matched: NomineeRecord | null = null;
    for (const nom of mockStore.nominees.values()) {
      if (nom.invite_token_hash === tokenHash && nom.status === 'pending') {
        matched = nom;
        break;
      }
    }

    if (!matched) {
      throw new DbError('INVITE_INVALID_OR_EXPIRED', 'Invalid or expired invitation.');
    }

    if (matched.invite_expires_at && new Date(matched.invite_expires_at) < new Date()) {
      throw new DbError('INVITE_INVALID_OR_EXPIRED', 'Invitation token has expired.');
    }

    const updated: NomineeRecord = {
      ...matched,
      user_id: userId,
      status: 'active',
      invite_accepted_at: now,
      invite_token_hash: null,
      updated_at: now,
    };
    mockStore.nominees.set(matched.id, updated);

    await appendAuditEventDb(
      matched.vault_id,
      'invite_accepted',
      { nomineeId: matched.id },
      userId
    );

    return {
      nomineeId: matched.id,
      vaultId: matched.vault_id,
      acceptedAt: now,
    };
  }
}

// ============================================================================
// Recovery & Audit Operations (Workstream A2 / A3)
// ============================================================================

export async function getVaultAdminDb(vaultId: string): Promise<VaultRecord> {
  const client = getSupabaseServiceClient();
  if (client) {
    const { data, error } = await client.from('vaults').select('*').eq('id', vaultId).maybeSingle();
    if (error || !data) throw new DbError('NOT_FOUND', 'Vault not found.');
    return data as VaultRecord;
  } else {
    const v = mockStore.vaults.get(vaultId);
    if (!v) throw new DbError('NOT_FOUND', 'Vault not found.');
    return v;
  }
}

export function vaultRecordToContext(v: VaultRecord): VaultStateContext {
  return {
    vaultId: v.id,
    status: v.status as VaultStateContext['status'],
    checkinIntervalSeconds: v.checkin_interval_seconds,
    gracePeriodSeconds: DEMO_GRACE_PERIOD_SECONDS,
    coolingOffSeconds: DEMO_COOLING_OFF_SECONDS,
    unlockWindowSeconds: DEMO_UNLOCK_WINDOW_SECONDS,
    lastCheckInAt: v.last_checkin_at,
    nextCheckInAt: v.next_checkin_at,
    graceEndsAt: v.grace_ends_at,
    coolingOffEndsAt: v.cooling_off_ends_at,
    unlockExpiresAt: v.unlock_expires_at,
  };
}

export async function appendAuditEventDb(
  vaultId: string,
  eventType: AuditEventType,
  metadata: Record<string, unknown>,
  actorUserId?: string | null,
  requestId?: string | null
): Promise<AuditEventRecord> {
  const safeActor = actorUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actorUserId)
    ? actorUserId
    : null;

  const client = getSupabaseServiceClient();

  if (client) {
    const { data: latestEvents } = await client
      .from('audit_events')
      .select('sequence, event_hash')
      .eq('vault_id', vaultId)
      .order('sequence', { ascending: false })
      .limit(1);

    const prevHash = latestEvents && latestEvents.length > 0
      ? latestEvents[0].event_hash
      : GENESIS_PREVIOUS_HASH;
    const nextSeq = latestEvents && latestEvents.length > 0
      ? Number(latestEvents[0].sequence) + 1
      : 1;

    const event = buildAuditEvent({
      vaultId,
      sequence: nextSeq,
      eventType,
      actorUserId: safeActor,
      metadata,
      previousHash: prevHash,
      requestId,
    });

    const record: AuditEventRecord = {
      id: event.id,
      vault_id: event.vaultId,
      sequence: event.sequence,
      event_type: event.eventType,
      actor_user_id: event.actorUserId,
      server_time: event.serverTime,
      event_metadata: event.metadata,
      previous_hash: event.previousHash,
      event_hash: event.eventHash,
      request_id: event.requestId ?? null,
    };

    await client.from('audit_events').insert(record);
    return record;
  } else {
    const safeActor = actorUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actorUserId)
      ? actorUserId
      : null;

    const vaultEvents = mockStore.auditEvents.filter((e) => e.vault_id === vaultId);
    vaultEvents.sort((a, b) => a.sequence - b.sequence);

    const lastHash = vaultEvents.length > 0 ? vaultEvents[vaultEvents.length - 1].event_hash : null;
    const prevHash = lastHash && /^[a-f0-9]{64}$/i.test(lastHash)
      ? lastHash
      : GENESIS_PREVIOUS_HASH;
    const nextSeq = vaultEvents.length > 0
      ? vaultEvents[vaultEvents.length - 1].sequence + 1
      : 1;

    const event = buildAuditEvent({
      vaultId,
      sequence: nextSeq,
      eventType,
      actorUserId: safeActor,
      metadata,
      previousHash: prevHash,
      requestId,
    });

    const record: AuditEventRecord = {
      id: event.id,
      vault_id: event.vaultId,
      sequence: event.sequence,
      event_type: event.eventType,
      actor_user_id: event.actorUserId,
      server_time: event.serverTime,
      event_metadata: event.metadata,
      previous_hash: event.previousHash,
      event_hash: event.eventHash,
      request_id: event.requestId ?? null,
    };

    mockStore.auditEvents.push(record);
    return record;
  }
}

export async function recordCheckInDb(
  vaultId: string,
  ownerId: string
): Promise<CheckInResponse> {
  const { vault, isOwner } = await getVaultById(vaultId, ownerId);
  if (!isOwner) {
    throw new DbError('FORBIDDEN', 'Only the vault owner can record check-in.');
  }

  const context = vaultRecordToContext(vault);
  const currentTime = getAuthoritativeTime();
  const transition = processCheckIn(context, currentTime);

  const client = getSupabaseServiceClient();
  if (client) {
    const { error } = await client
      .from('vaults')
      .update({
        status: transition.newStatus,
        last_checkin_at: transition.updatedContext.lastCheckInAt,
        next_checkin_at: transition.updatedContext.nextCheckInAt,
        grace_ends_at: null,
        cooling_off_ends_at: null,
        unlock_expires_at: null,
        updated_at: currentTime.toISOString(),
      })
      .eq('id', vaultId);

    if (error) {
      throw new DbError('INTERNAL_ERROR', `Failed to record check-in: ${error.message}`);
    }
  } else {
    const existing = mockStore.vaults.get(vaultId)!;
    mockStore.vaults.set(vaultId, {
      ...existing,
      status: transition.newStatus as VaultRecord['status'],
      last_checkin_at: transition.updatedContext.lastCheckInAt,
      next_checkin_at: transition.updatedContext.nextCheckInAt,
      grace_ends_at: null,
      cooling_off_ends_at: null,
      unlock_expires_at: null,
      updated_at: currentTime.toISOString(),
    });
  }

  await appendAuditEventDb(vaultId, 'checkin_recorded', {
    nextCheckInAt: transition.updatedContext.nextCheckInAt,
    restoredStatus: transition.newStatus,
  }, ownerId);

  return {
    success: true,
    vaultId,
    status: transition.newStatus,
    lastCheckInAt: transition.updatedContext.lastCheckInAt,
    nextCheckInAt: transition.updatedContext.nextCheckInAt,
  };
}

export async function getOrCreateRecoveryRequestDb(
  vaultId: string,
  requestingUserId: string
): Promise<RecoveryRequestRecord> {
  await getVaultById(vaultId, requestingUserId);

  const client = getSupabaseServiceClient();
  const now = getAuthoritativeTime().toISOString();

  if (client) {
    const { data: existing } = await client
      .from('recovery_requests')
      .select('*')
      .eq('vault_id', vaultId)
      .in('status', ['pending', 'cooling_off', 'ready'])
      .maybeSingle();

    if (existing) {
      return existing as RecoveryRequestRecord;
    }

    const newRequest: RecoveryRequestRecord = {
      id: crypto.randomUUID(),
      vault_id: vaultId,
      status: 'pending',
      started_at: now,
      cooling_off_ends_at: null,
      unlock_expires_at: null,
      cancelled_at: null,
      cancelled_by: null,
      revision: 1,
      created_at: now,
    };

    const { error } = await client.from('recovery_requests').insert(newRequest);
    if (error) {
      throw new DbError('INTERNAL_ERROR', `Failed to open recovery request: ${error.message}`);
    }

    await appendAuditEventDb(vaultId, 'recovery_request_opened', {
      recoveryRequestId: newRequest.id,
      startedAt: now,
    }, requestingUserId, newRequest.id);

    return newRequest;
  } else {
    for (const req of mockStore.recoveryRequests.values()) {
      if (req.vault_id === vaultId && ['pending', 'cooling_off', 'ready'].includes(req.status)) {
        return req;
      }
    }

    const newRequest: RecoveryRequestRecord = {
      id: crypto.randomUUID(),
      vault_id: vaultId,
      status: 'pending',
      started_at: now,
      cooling_off_ends_at: null,
      unlock_expires_at: null,
      cancelled_at: null,
      cancelled_by: null,
      revision: 1,
      created_at: now,
    };

    mockStore.recoveryRequests.set(newRequest.id, newRequest);

    await appendAuditEventDb(vaultId, 'recovery_request_opened', {
      recoveryRequestId: newRequest.id,
      startedAt: now,
    }, requestingUserId, newRequest.id);

    return newRequest;
  }
}

export async function recordNomineeDecisionDb(
  recoveryRequestId: string,
  nomineeUserId: string,
  decision: 'approve' | 'decline',
  idempotencyKey: string
): Promise<DecisionResponse> {
  const client = getSupabaseServiceClient();
  const currentTime = getAuthoritativeTime();
  const nowIso = currentTime.toISOString();

  let recoveryRequest: RecoveryRequestRecord | null = null;
  let vault: VaultRecord | null = null;
  let nominee: NomineeRecord | null = null;
  let existingApprovals: RecoveryApprovalRecord[] = [];

  if (client) {
    const { data: req } = await client
      .from('recovery_requests')
      .select('*')
      .eq('id', recoveryRequestId)
      .maybeSingle();
    if (!req) throw new DbError('NOT_FOUND', 'Recovery request not found.');
    recoveryRequest = req as RecoveryRequestRecord;

    const { data: v } = await client.from('vaults').select('*').eq('id', req.vault_id).maybeSingle();
    if (!v) throw new DbError('NOT_FOUND', 'Associated vault not found.');
    vault = v as VaultRecord;

    const { data: nom } = await client
      .from('nominees')
      .select('*')
      .eq('vault_id', vault.id)
      .eq('user_id', nomineeUserId)
      .eq('status', 'active')
      .maybeSingle();
    if (!nom) throw new DbError('FORBIDDEN', 'Only active nominees can record approval decisions.');
    nominee = nom as NomineeRecord;

    const { data: approvals } = await client
      .from('recovery_approvals')
      .select('*')
      .eq('recovery_request_id', recoveryRequestId);
    existingApprovals = (approvals as RecoveryApprovalRecord[]) || [];
  } else {
    recoveryRequest = mockStore.recoveryRequests.get(recoveryRequestId) || null;
    if (!recoveryRequest) throw new DbError('NOT_FOUND', 'Recovery request not found.');

    vault = mockStore.vaults.get(recoveryRequest.vault_id) || null;
    if (!vault) throw new DbError('NOT_FOUND', 'Associated vault not found.');

    for (const nom of mockStore.nominees.values()) {
      if (nom.vault_id === vault.id && nom.user_id === nomineeUserId && nom.status === 'active') {
        nominee = nom;
        break;
      }
    }
    if (!nominee) throw new DbError('FORBIDDEN', 'Only active nominees can record approval decisions.');

    existingApprovals = Array.from(mockStore.recoveryApprovals.values()).filter(
      (a) => a.recovery_request_id === recoveryRequestId
    );
  }

  // Convert approvals to typed domain objects
  const domainApprovals = existingApprovals.map((a) => ({
    id: a.id,
    recoveryRequestId: a.recovery_request_id,
    nomineeId: a.nominee_id,
    decision: a.decision,
    createdAt: a.created_at,
    requestId: a.request_id || undefined,
  }));

  const vaultContext = vaultRecordToContext(vault);
  // Ensure context status matches recovery request state
  if (recoveryRequest.status === 'pending') {
    vaultContext.status = 'RECOVERY_PENDING';
  }

  const { transitionResult, approvedCount, thresholdMet, isDuplicate } = processNomineeDecision(
    vaultContext,
    domainApprovals,
    nominee.id,
    decision,
    currentTime
  );

  // Record approval entry
  const approvalRecordId = crypto.randomUUID();
  const approvalRecord: RecoveryApprovalRecord = {
    id: approvalRecordId,
    recovery_request_id: recoveryRequestId,
    nominee_id: nominee.id,
    decision,
    created_at: nowIso,
    request_id: idempotencyKey,
  };

  if (client) {
    if (!isDuplicate) {
      await client.from('recovery_approvals').upsert(approvalRecord, {
        onConflict: 'recovery_request_id,nominee_id',
      });
    }

    if (thresholdMet) {
      await client
        .from('recovery_requests')
        .update({
          status: 'cooling_off',
          cooling_off_ends_at: transitionResult.updatedContext.coolingOffEndsAt,
        })
        .eq('id', recoveryRequestId);

      await client
        .from('vaults')
        .update({
          status: 'RECOVERY_COOLING_OFF',
          cooling_off_ends_at: transitionResult.updatedContext.coolingOffEndsAt,
          updated_at: nowIso,
        })
        .eq('id', vault.id);
    }
  } else {
    mockStore.recoveryApprovals.set(
      `${recoveryRequestId}:${nominee.id}`,
      approvalRecord
    );

    if (thresholdMet) {
      mockStore.recoveryRequests.set(recoveryRequestId, {
        ...recoveryRequest,
        status: 'cooling_off',
        cooling_off_ends_at: transitionResult.updatedContext.coolingOffEndsAt,
      });

      mockStore.vaults.set(vault.id, {
        ...vault,
        status: 'RECOVERY_COOLING_OFF',
        cooling_off_ends_at: transitionResult.updatedContext.coolingOffEndsAt,
        updated_at: nowIso,
      });
    }
  }

  // Audit logging
  const auditEventType: AuditEventType = decision === 'approve' ? 'nominee_approved' : 'nominee_declined';
  await appendAuditEventDb(vault.id, auditEventType, {
    recoveryRequestId,
    nomineeId: nominee.id,
    decision,
    approvedCount,
    thresholdMet,
  }, nomineeUserId, recoveryRequestId);

  if (thresholdMet) {
    await appendAuditEventDb(vault.id, 'cooling_off_started', {
      recoveryRequestId,
      coolingOffEndsAt: transitionResult.updatedContext.coolingOffEndsAt,
    }, null, recoveryRequestId);
  }

  return {
    success: true,
    recoveryRequestId,
    status: thresholdMet ? 'cooling_off' : recoveryRequest.status,
    approvedCount,
    thresholdMet,
    coolingOffEndsAt: transitionResult.updatedContext.coolingOffEndsAt ?? undefined,
  };
}

export async function cancelRecoveryDb(
  recoveryRequestId: string,
  ownerId: string
): Promise<CancelRecoveryResponse> {
  const client = getSupabaseServiceClient();
  const currentTime = getAuthoritativeTime();
  const nowIso = currentTime.toISOString();

  let recoveryRequest: RecoveryRequestRecord | null = null;
  let vault: VaultRecord | null = null;

  if (client) {
    const { data: req } = await client
      .from('recovery_requests')
      .select('*')
      .eq('id', recoveryRequestId)
      .maybeSingle();
    if (!req) throw new DbError('NOT_FOUND', 'Recovery request not found.');
    recoveryRequest = req as RecoveryRequestRecord;

    const { data: v } = await client.from('vaults').select('*').eq('id', req.vault_id).maybeSingle();
    if (!v) throw new DbError('NOT_FOUND', 'Associated vault not found.');
    vault = v as VaultRecord;
  } else {
    recoveryRequest = mockStore.recoveryRequests.get(recoveryRequestId) || null;
    if (!recoveryRequest) throw new DbError('NOT_FOUND', 'Recovery request not found.');

    vault = mockStore.vaults.get(recoveryRequest.vault_id) || null;
    if (!vault) throw new DbError('NOT_FOUND', 'Associated vault not found.');
  }

  if (vault.owner_id !== ownerId) {
    throw new DbError('FORBIDDEN', 'Only the vault owner can cancel recovery.');
  }

  const vaultContext = vaultRecordToContext(vault);
  if (recoveryRequest.status === 'cooling_off') {
    vaultContext.status = 'COOLING_OFF';
  } else if (recoveryRequest.status === 'pending') {
    vaultContext.status = 'RECOVERY_PENDING';
  }

  const transition = cancelRecovery(vaultContext, currentTime);

  if (client) {
    const { error: reqErr } = await client
      .from('recovery_requests')
      .update({
        status: 'cancelled',
        cancelled_at: nowIso,
        cancelled_by: ownerId,
      })
      .eq('id', recoveryRequestId);

    if (reqErr) {
      throw new DbError('INTERNAL_ERROR', `Failed to cancel recovery request: ${reqErr.message}`);
    }

    const { error: vaultErr } = await client
      .from('vaults')
      .update({
        status: 'ACTIVE',
        last_checkin_at: transition.updatedContext.lastCheckInAt,
        next_checkin_at: transition.updatedContext.nextCheckInAt,
        cooling_off_ends_at: null,
        grace_ends_at: null,
        unlock_expires_at: null,
        updated_at: nowIso,
      })
      .eq('id', vault.id);

    if (vaultErr) {
      throw new DbError('INTERNAL_ERROR', `Failed to restore active vault status: ${vaultErr.message}`);
    }
  } else {
    mockStore.recoveryRequests.set(recoveryRequestId, {
      ...recoveryRequest,
      status: 'cancelled',
      cancelled_at: nowIso,
      cancelled_by: ownerId,
    });

    mockStore.vaults.set(vault.id, {
      ...vault,
      status: 'ACTIVE',
      last_checkin_at: transition.updatedContext.lastCheckInAt,
      next_checkin_at: transition.updatedContext.nextCheckInAt,
      cooling_off_ends_at: null,
      grace_ends_at: null,
      unlock_expires_at: null,
      updated_at: nowIso,
    });
  }

  await appendAuditEventDb(vault.id, 'recovery_cancelled', {
    recoveryRequestId,
    cancelledAt: nowIso,
  }, ownerId, recoveryRequestId);

  return {
    success: true,
    vaultId: vault.id,
    status: 'ACTIVE',
    cancelledAt: nowIso,
  };
}

export async function getRecoverySessionDb(
  recoveryRequestId: string,
  requestingUserId: string
) {
  const client = getSupabaseServiceClient();
  const currentTime = getAuthoritativeTime();

  let recoveryRequest: RecoveryRequestRecord | null = null;
  let vault: VaultRecord | null = null;

  if (client) {
    const { data: req } = await client
      .from('recovery_requests')
      .select('*')
      .eq('id', recoveryRequestId)
      .maybeSingle();
    if (!req) throw new DbError('NOT_FOUND', 'Recovery request not found.');
    recoveryRequest = req as RecoveryRequestRecord;

    const { data: v } = await client.from('vaults').select('*').eq('id', req.vault_id).maybeSingle();
    if (!v) throw new DbError('NOT_FOUND', 'Vault not found.');
    vault = v as VaultRecord;

    const isOwner = vault.owner_id === requestingUserId;
    if (!isOwner) {
      const { data: nom } = await client
        .from('nominees')
        .select('id')
        .eq('vault_id', vault.id)
        .eq('user_id', requestingUserId)
        .eq('status', 'active')
        .maybeSingle();
      if (!nom) throw new DbError('FORBIDDEN', 'Access denied to recovery session.');
    }
  } else {
    recoveryRequest = mockStore.recoveryRequests.get(recoveryRequestId) || null;
    if (!recoveryRequest) throw new DbError('NOT_FOUND', 'Recovery request not found.');

    vault = mockStore.vaults.get(recoveryRequest.vault_id) || null;
    if (!vault) throw new DbError('NOT_FOUND', 'Vault not found.');

    const isOwner = vault.owner_id === requestingUserId;
    if (!isOwner) {
      const isNominee = Array.from(mockStore.nominees.values()).some(
        (n) => n.vault_id === vault!.id && n.user_id === requestingUserId && n.status === 'active'
      );
      if (!isNominee) throw new DbError('FORBIDDEN', 'Access denied to recovery session.');
    }
  }

  // Check state: must be ready
  const isReady = recoveryRequest.status === 'ready' || vault.status === 'RECOVERY_READY';
  if (!isReady) {
    throw new DbError(
      'RECOVERY_NOT_READY',
      'Recovery is not ready: nominee approvals or cooling-off period have not completed.'
    );
  }

  // Check expiry
  if (recoveryRequest.unlock_expires_at) {
    const expiresMs = new Date(recoveryRequest.unlock_expires_at).getTime();
    if (currentTime.getTime() > expiresMs) {
      throw new DbError('RECOVERY_WINDOW_EXPIRED', 'Recovery session has expired.');
    }
  }

  return {
    recoveryRequestId: recoveryRequest.id,
    vaultId: vault.id,
    status: recoveryRequest.status,
    unlockExpiresAt: recoveryRequest.unlock_expires_at || new Date(Date.now() + 86400000).toISOString(),
    payloadEnvelope: {
      schemaVersion: vault.schema_version as 1,
      cryptoVersion: vault.crypto_version as 1,
      algorithm: 'AES-256-GCM' as const,
      nonce: vault.payload_nonce,
      aadVersion: vault.payload_aad_version as 1,
      ciphertext: vault.payload_ciphertext,
    },
  };
}

export async function recordClientCompletionDb(
  recoveryRequestId: string,
  clientSessionId: string,
  completedAt: string
) {
  let vaultId = '';
  const client = getSupabaseServiceClient();

  if (client) {
    const { data: req } = await client
      .from('recovery_requests')
      .select('vault_id')
      .eq('id', recoveryRequestId)
      .maybeSingle();
    if (req) vaultId = req.vault_id;
  } else {
    const req = mockStore.recoveryRequests.get(recoveryRequestId);
    if (req) vaultId = req.vault_id;
  }

  if (vaultId) {
    await appendAuditEventDb(vaultId, 'client_reported_recovery_complete', {
      recoveryRequestId,
      clientSessionId,
      completedAt,
    }, null, recoveryRequestId);
  }

  return { success: true };
}

export async function advanceWorkflowsDb() {
  const currentTime = getAuthoritativeTime();
  const transitionedVaults: string[] = [];

  const client = getSupabaseServiceClient();
  if (client) {
    const nowIso = currentTime.toISOString();
    const { data: vaults } = await client
      .from('vaults')
      .select('*')
      .or(`next_checkin_at.lte.${nowIso},grace_ends_at.lte.${nowIso},cooling_off_ends_at.lte.${nowIso},unlock_expires_at.lte.${nowIso}`);
    for (const v of vaults || []) {
      const context = vaultRecordToContext(v as VaultRecord);
      const res = evaluateScheduledTransition(context, currentTime);
      if (res.transitionOccurred) {
        await client
          .from('vaults')
          .update({
            status: res.newStatus,
            grace_ends_at: res.updatedContext.graceEndsAt,
            cooling_off_ends_at: res.updatedContext.coolingOffEndsAt,
            unlock_expires_at: res.updatedContext.unlockExpiresAt,
            updated_at: currentTime.toISOString(),
          })
          .eq('id', v.id);

        transitionedVaults.push(v.id);
        await appendAuditEventDb(v.id, 'state_transitioned', {
          previousStatus: res.previousStatus,
          newStatus: res.newStatus,
          reason: res.transitionReason,
        });
      }
    }
  } else {
    for (const [id, v] of mockStore.vaults.entries()) {
      const context = vaultRecordToContext(v);
      const res = evaluateScheduledTransition(context, currentTime);
      if (res.transitionOccurred) {
        mockStore.vaults.set(id, {
          ...v,
          status: res.newStatus as VaultRecord['status'],
          grace_ends_at: res.updatedContext.graceEndsAt,
          cooling_off_ends_at: res.updatedContext.coolingOffEndsAt,
          unlock_expires_at: res.updatedContext.unlockExpiresAt,
          updated_at: currentTime.toISOString(),
        });
        transitionedVaults.push(id);
        await appendAuditEventDb(id, 'state_transitioned', {
          previousStatus: res.previousStatus,
          newStatus: res.newStatus,
          reason: res.transitionReason,
        });
      }
    }
  }

  return {
    success: true,
    transitionedCount: transitionedVaults.length,
    transitionedVaults,
    evaluatedAt: currentTime.toISOString(),
  };
}

export async function getAuditTrailDb(
  vaultId: string,
  requestingUserId: string
) {
  // Check authorization
  await getVaultById(vaultId, requestingUserId);

  const client = getSupabaseServiceClient();
  let rawEvents: AuditEventRecord[] = [];

  if (client) {
    const { data: events } = await client
      .from('audit_events')
      .select('*')
      .eq('vault_id', vaultId)
      .order('sequence', { ascending: true });
    rawEvents = (events as AuditEventRecord[]) || [];
  } else {
    rawEvents = mockStore.auditEvents.filter((e) => e.vault_id === vaultId);
    rawEvents.sort((a, b) => a.sequence - b.sequence);
  }

  const domainEvents: AuditEvent[] = rawEvents.map((e) => ({
    id: e.id,
    vaultId: e.vault_id,
    sequence: Number(e.sequence),
    eventType: e.event_type,
    actorUserId: e.actor_user_id,
    serverTime: e.server_time,
    metadata: e.event_metadata as AuditMetadata,
    previousHash: e.previous_hash,
    eventHash: e.event_hash,
    requestId: e.request_id || undefined,
  }));

  const verification = verifyAuditChain(domainEvents);

  return {
    vaultId,
    events: domainEvents,
    verification,
  };
}
