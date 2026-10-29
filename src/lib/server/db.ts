// Database access helpers and repository layer
// References: docs/05_BACKEND_SCHEMA.md, docs/06_API_CONTRACT.md

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  AuditEventRecord,
  NomineeRecord,
  ProfileRecord,
  VaultRecord,
} from '@/types/database';
import type {
  CreateVaultRequest,
  NomineeInput,
  NomineeItemResponse,
  UpdateEnvelopeRequest,
} from '@/types/api';

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

  reset() {
    this.profiles.clear();
    this.vaults.clear();
    this.nominees.clear();
    this.auditEvents = [];
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

export function getSupabaseServiceClient(): SupabaseClient | null {
  if (shouldUseMockDb()) return null;
  return createClient(supabaseUrl!, supabaseServiceKey!, {
    auth: { persistSession: false },
  });
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
  const vaultId = crypto.randomUUID();

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
    mockStore.auditEvents.push({
      id: crypto.randomUUID(),
      vault_id: vaultId,
      sequence: 1,
      event_type: 'vault_created',
      actor_user_id: ownerId,
      server_time: now.toISOString(),
      event_metadata: { schemaVersion: data.schemaVersion, cryptoVersion: data.cryptoVersion },
      previous_hash: '0000000000000000000000000000000000000000000000000000000000000000',
      event_hash: 'genesis-hash',
      request_id: null,
    });
  }

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
    mockStore.auditEvents.push({
      id: crypto.randomUUID(),
      vault_id: vaultId,
      sequence: mockStore.auditEvents.length + 1,
      event_type: 'payload_updated',
      actor_user_id: ownerId,
      server_time: now,
      event_metadata: { revision: newRevision, aadVersion: data.payloadAadVersion },
      previous_hash: 'hash-prev',
      event_hash: 'hash-new',
      request_id: null,
    });

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

    return {
      nomineeId: matched.id,
      vaultId: matched.vault_id,
      acceptedAt: now,
    };
  }
}
