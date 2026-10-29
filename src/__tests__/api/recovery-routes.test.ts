import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getMockDb } from '@/lib/server/db';
import { POST as checkInHandler } from '@/app/api/vaults/[vaultId]/check-in/route';
import { POST as recoveryRequestsHandler } from '@/app/api/vaults/[vaultId]/recovery-requests/route';
import { POST as decisionHandler } from '@/app/api/recovery-requests/[requestId]/decision/route';
import { POST as cancelHandler } from '@/app/api/recovery-requests/[requestId]/cancel/route';
import { GET as sessionHandler } from '@/app/api/recovery-requests/[requestId]/session/route';
import { POST as demoClockHandler } from '@/app/api/dev/demo-clock/route';
import { GET as auditHandler } from '@/app/api/vaults/[vaultId]/audit/route';

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const NOMINEE_A_USER = '22222222-2222-4222-8222-222222222222';
const NOMINEE_B_USER = '33333333-3333-4333-8333-333333333333';
const STRANGER_USER = '99999999-9999-4999-8999-999999999999';

const VAULT_ID = '44444444-4444-4444-8444-444444444444';
const NOMINEE_A_ID = '55555555-5555-4555-8555-555555555555';
const NOMINEE_B_ID = '66666666-6666-4666-8666-666666666666';

function setupMockDatabase() {
  const db = getMockDb();
  db.reset();

  const now = new Date('2026-10-29T12:00:00.000Z');

  // Vault
  db.vaults.set(VAULT_ID, {
    id: VAULT_ID,
    owner_id: OWNER_ID,
    status: 'ACTIVE',
    schema_version: 1,
    crypto_version: 1,
    payload_ciphertext: 'mockCiphertextPayload==',
    payload_nonce: 'mockPayloadNonce12',
    payload_aad_version: 1,
    wrapped_dek: 'mockWrappedDek==',
    wrap_nonce: 'mockWrapNonce123',
    kdf_name: 'scrypt',
    kdf_params: { N: 131072, r: 8, p: 1, dkLen: 32 },
    kdf_salt: 'mockKdfSalt16Bytes',
    checkin_interval_seconds: 120,
    last_checkin_at: now.toISOString(),
    next_checkin_at: new Date(now.getTime() + 120 * 1000).toISOString(),
    grace_ends_at: null,
    cooling_off_ends_at: null,
    unlock_expires_at: null,
    revision: 1,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });

  // Nominees
  db.nominees.set(NOMINEE_A_ID, {
    id: NOMINEE_A_ID,
    vault_id: VAULT_ID,
    user_id: NOMINEE_A_USER,
    email: 'nominee.a@example.com',
    display_name: 'Nominee A',
    share_index: 1,
    invite_token_hash: null,
    invite_expires_at: null,
    invite_accepted_at: now.toISOString(),
    status: 'active',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });

  db.nominees.set(NOMINEE_B_ID, {
    id: NOMINEE_B_ID,
    vault_id: VAULT_ID,
    user_id: NOMINEE_B_USER,
    email: 'nominee.b@example.com',
    display_name: 'Nominee B',
    share_index: 2,
    invite_token_hash: null,
    invite_expires_at: null,
    invite_accepted_at: now.toISOString(),
    status: 'active',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });
}

describe('Phase 4: Recovery & Workflow API Routes', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    setupMockDatabase();
  });

  describe('POST /api/vaults/[vaultId]/check-in', () => {
    it('returns 401 when unauthenticated', async () => {
      const req = new NextRequest(`http://localhost/api/vaults/${VAULT_ID}/check-in`, {
        method: 'POST',
      });
      const res = await checkInHandler(req, { params: Promise.resolve({ vaultId: VAULT_ID }) });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns 403 when a non-owner attempts check-in', async () => {
      const req = new NextRequest(`http://localhost/api/vaults/${VAULT_ID}/check-in`, {
        method: 'POST',
        headers: { 'x-test-user-id': STRANGER_USER },
      });
      const res = await checkInHandler(req, { params: Promise.resolve({ vaultId: VAULT_ID }) });
      expect(res.status).toBe(403);
    });

    it('records check-in successfully for authenticated owner', async () => {
      const req = new NextRequest(`http://localhost/api/vaults/${VAULT_ID}/check-in`, {
        method: 'POST',
        headers: { 'x-test-user-id': OWNER_ID },
      });
      const res = await checkInHandler(req, { params: Promise.resolve({ vaultId: VAULT_ID }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.status).toBe('ACTIVE');
      expect(json.nextCheckInAt).toBeDefined();
    });
  });

  describe('Recovery Requests & Nominee Approval Workflow', () => {
    it('creates or retrieves recovery request', async () => {
      const req = new NextRequest(`http://localhost/api/vaults/${VAULT_ID}/recovery-requests`, {
        method: 'POST',
        headers: { 'x-test-user-id': NOMINEE_A_USER },
      });
      const res = await recoveryRequestsHandler(req, { params: Promise.resolve({ vaultId: VAULT_ID }) });
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.status).toBe('pending');
      expect(json.vault_id).toBe(VAULT_ID);
    });

    it('records nominee approvals and triggers cooling-off upon 2nd approval', async () => {
      // 1. Open recovery request
      const reqOpen = new NextRequest(`http://localhost/api/vaults/${VAULT_ID}/recovery-requests`, {
        method: 'POST',
        headers: { 'x-test-user-id': NOMINEE_A_USER },
      });
      const resOpen = await recoveryRequestsHandler(reqOpen, { params: Promise.resolve({ vaultId: VAULT_ID }) });
      const recoveryRequest = await resOpen.json();
      const requestId = recoveryRequest.id;

      // 2. Nominee A approves (count 1/2)
      const reqVoteA = new NextRequest(`http://localhost/api/recovery-requests/${requestId}/decision`, {
        method: 'POST',
        headers: { 'x-test-user-id': NOMINEE_A_USER },
        body: JSON.stringify({
          decision: 'approve',
          idempotencyKey: '77777777-7777-4777-8777-777777777777',
        }),
      });
      const resVoteA = await decisionHandler(reqVoteA, { params: Promise.resolve({ requestId }) });
      expect(resVoteA.status).toBe(200);
      const jsonVoteA = await resVoteA.json();
      expect(jsonVoteA.approvedCount).toBe(1);
      expect(jsonVoteA.thresholdMet).toBe(false);

      // 3. Nominee B approves (count 2/2 -> cooling-off)
      const reqVoteB = new NextRequest(`http://localhost/api/recovery-requests/${requestId}/decision`, {
        method: 'POST',
        headers: { 'x-test-user-id': NOMINEE_B_USER },
        body: JSON.stringify({
          decision: 'approve',
          idempotencyKey: '88888888-8888-4888-8888-888888888888',
        }),
      });
      const resVoteB = await decisionHandler(reqVoteB, { params: Promise.resolve({ requestId }) });
      expect(resVoteB.status).toBe(200);
      const jsonVoteB = await resVoteB.json();
      expect(jsonVoteB.approvedCount).toBe(2);
      expect(jsonVoteB.thresholdMet).toBe(true);
      expect(jsonVoteB.status).toBe('cooling_off');
      expect(jsonVoteB.coolingOffEndsAt).toBeDefined();
    });

    it('allows owner to cancel recovery during cooling-off', async () => {
      // Create request and simulate cooling-off
      const db = getMockDb();
      const requestId = '99999999-1111-4111-8111-111111111111';
      db.recoveryRequests.set(requestId, {
        id: requestId,
        vault_id: VAULT_ID,
        status: 'cooling_off',
        started_at: new Date().toISOString(),
        cooling_off_ends_at: new Date(Date.now() + 120000).toISOString(),
        unlock_expires_at: null,
        cancelled_at: null,
        cancelled_by: null,
        revision: 1,
        created_at: new Date().toISOString(),
      });

      const cancelReq = new NextRequest(`http://localhost/api/recovery-requests/${requestId}/cancel`, {
        method: 'POST',
        headers: { 'x-test-user-id': OWNER_ID },
      });
      const resCancel = await cancelHandler(cancelReq, { params: Promise.resolve({ requestId }) });
      expect(resCancel.status).toBe(200);
      const jsonCancel = await resCancel.json();
      expect(jsonCancel.status).toBe('ACTIVE');

      // Verify DB was updated
      const updatedVault = db.vaults.get(VAULT_ID);
      expect(updatedVault?.status).toBe('ACTIVE');
    });

    it('protects recovery session until ready and enforces no-store cache headers', async () => {
      const db = getMockDb();
      const requestId = 'aaaaaaa1-1111-4111-8111-111111111111';

      // 1. When status is pending -> 400 RECOVERY_NOT_READY
      db.recoveryRequests.set(requestId, {
        id: requestId,
        vault_id: VAULT_ID,
        status: 'pending',
        started_at: new Date().toISOString(),
        cooling_off_ends_at: null,
        unlock_expires_at: null,
        cancelled_at: null,
        cancelled_by: null,
        revision: 1,
        created_at: new Date().toISOString(),
      });

      const reqNotReady = new NextRequest(`http://localhost/api/recovery-requests/${requestId}/session`, {
        method: 'GET',
        headers: { 'x-test-user-id': NOMINEE_A_USER },
      });
      const resNotReady = await sessionHandler(reqNotReady, { params: Promise.resolve({ requestId }) });
      expect(resNotReady.status).toBe(400);

      // 2. When status is ready -> 200 with encrypted payload envelope only
      db.recoveryRequests.set(requestId, {
        ...db.recoveryRequests.get(requestId)!,
        status: 'ready',
        unlock_expires_at: new Date(Date.now() + 86400000).toISOString(),
      });

      const reqReady = new NextRequest(`http://localhost/api/recovery-requests/${requestId}/session`, {
        method: 'GET',
        headers: { 'x-test-user-id': NOMINEE_A_USER },
      });
      const resReady = await sessionHandler(reqReady, { params: Promise.resolve({ requestId }) });
      expect(resReady.status).toBe(200);
      expect(resReady.headers.get('cache-control')).toContain('no-store');

      const jsonSession = await resReady.json();
      expect(jsonSession.payloadEnvelope.ciphertext).toBe('mockCiphertextPayload==');
      // Critical check: no plaintext, raw key, or share bytes returned!
      const rawObj = jsonSession as Record<string, unknown>;
      expect(rawObj.plaintext).toBeUndefined();
      expect(rawObj.share).toBeUndefined();
      expect(rawObj.dek).toBeUndefined();
    });
  });

  describe('Demo Clock & Audit Trail Endpoints', () => {
    it('advances simulated time via demo clock endpoint', async () => {
      const req = new NextRequest('http://localhost/api/dev/demo-clock', {
        method: 'POST',
        headers: { 'x-test-user-id': OWNER_ID },
        body: JSON.stringify({
          action: 'advance_seconds',
          seconds: 300,
          vaultId: VAULT_ID,
        }),
      });

      const res = await demoClockHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.simulatedTime).toBeDefined();
    });

    it('returns verified audit history with intact cryptographic hash chain', async () => {
      // Perform a check-in to generate audit events
      const reqCheckIn = new NextRequest(`http://localhost/api/vaults/${VAULT_ID}/check-in`, {
        method: 'POST',
        headers: { 'x-test-user-id': OWNER_ID },
      });
      await checkInHandler(reqCheckIn, { params: Promise.resolve({ vaultId: VAULT_ID }) });

      // Fetch audit trail
      const reqAudit = new NextRequest(`http://localhost/api/vaults/${VAULT_ID}/audit`, {
        method: 'GET',
        headers: { 'x-test-user-id': OWNER_ID },
      });
      const resAudit = await auditHandler(reqAudit, { params: Promise.resolve({ vaultId: VAULT_ID }) });
      expect(resAudit.status).toBe(200);

      const json = await resAudit.json();
      expect(json.events.length).toBeGreaterThan(0);
      expect(json.verification.verified).toBe(true);
      expect(json.verification.hashChainIntact).toBe(true);
    });
  });
});
