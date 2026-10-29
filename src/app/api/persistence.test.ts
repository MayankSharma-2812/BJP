// Integration tests for Workstream B data persistence API routes
// References: docs/06_API_CONTRACT.md, docs/05_BACKEND_SCHEMA.md

import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as createVaultRoute } from '@/app/api/vaults/route';
import { GET as getVaultRoute } from '@/app/api/vaults/[vaultId]/route';
import { PUT as updateEnvelopeRoute } from '@/app/api/vaults/[vaultId]/envelope/route';
import { POST as setNomineesRoute } from '@/app/api/vaults/[vaultId]/nominees/route';
import { POST as acceptInviteRoute } from '@/app/api/invites/accept/route';
import { getMockDb } from '@/lib/server/db';

describe('Data Persistence Endpoints (Workstream B)', () => {
  const OWNER_ID = 'user-owner-1111-2222';
  const OTHER_USER_ID = 'user-intruder-3333-4444';
  const NOMINEE_USER_ID = 'user-nominee-5555-6666';

  const sampleVaultPayload = {
    schemaVersion: 1,
    cryptoVersion: 1,
    payloadCiphertext: 'ZW5jcnlwdGVkUGF5bG9hZENpcGhlcnRleHQ',
    payloadNonce: 'MDEyMzQ1Njc4OTAx',
    payloadAadVersion: 1,
    wrappedDek: 'd3JhcHBlZERla0J5dGVzV2l0aEF1dGhUYWc',
    wrapNonce: 'OTg3NjU0MzIxMDk4',
    kdfName: 'scrypt',
    kdfParams: { N: 131072, r: 8, p: 1, dkLen: 32 },
    kdfSalt: 'cmFuZG9tU2FsdEJ5dGVz',
    checkinIntervalSeconds: 86400,
  };

  beforeEach(() => {
    getMockDb().reset();
  });

  function makeRequest(url: string, method: string, body?: unknown, userId?: string): NextRequest {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (userId) {
      headers['x-test-user-id'] = userId;
    }
    return new NextRequest(new URL(url, 'http://localhost:3000'), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  it('rejects unauthenticated requests to POST /api/vaults', async () => {
    const req = makeRequest('/api/vaults', 'POST', sampleVaultPayload);
    const res = await createVaultRoute(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.error.code).toBe('UNAUTHENTICATED');
    expect(res.headers.get('cache-control')).toContain('no-store');
  });

  it('creates a vault envelope via POST /api/vaults', async () => {
    const req = makeRequest('/api/vaults', 'POST', sampleVaultPayload, OWNER_ID);
    const res = await createVaultRoute(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.vaultId).toBeDefined();
    expect(json.status).toBe('ACTIVE');
    expect(json.revision).toBe(1);
    expect(json.nextCheckinAt).toBeDefined();
    expect(res.headers.get('cache-control')).toContain('no-store');
  });

  it('retrieves vault envelope via GET /api/vaults/:vaultId and denies cross-user access', async () => {
    // 1. Create vault
    const createReq = makeRequest('/api/vaults', 'POST', sampleVaultPayload, OWNER_ID);
    const createRes = await createVaultRoute(createReq);
    const { vaultId } = await createRes.json();

    // 2. Owner can read vault
    const getOwnerReq = makeRequest(`/api/vaults/${vaultId}`, 'GET', undefined, OWNER_ID);
    const getOwnerRes = await getVaultRoute(getOwnerReq, { params: Promise.resolve({ vaultId }) });
    expect(getOwnerRes.status).toBe(200);
    const ownerJson = await getOwnerRes.json();
    expect(ownerJson.id).toBe(vaultId);
    expect(ownerJson.payloadCiphertext).toBe(sampleVaultPayload.payloadCiphertext);
    expect(ownerJson.wrappedDek).toBe(sampleVaultPayload.wrappedDek);

    // 3. Unauthorized other user cannot read vault (cross-user denial)
    const getIntruderReq = makeRequest(`/api/vaults/${vaultId}`, 'GET', undefined, OTHER_USER_ID);
    const getIntruderRes = await getVaultRoute(getIntruderReq, { params: Promise.resolve({ vaultId }) });
    expect(getIntruderRes.status).toBe(403);
    const intruderJson = await getIntruderRes.json();
    expect(intruderJson.error.code).toBe('FORBIDDEN');
  });

  it('updates vault envelope with optimistic locking via PUT /api/vaults/:vaultId/envelope', async () => {
    // 1. Create vault
    const createReq = makeRequest('/api/vaults', 'POST', sampleVaultPayload, OWNER_ID);
    const createRes = await createVaultRoute(createReq);
    const { vaultId } = await createRes.json();

    // 2. Successful update with expectedRevision: 1
    const updateReq = makeRequest(
      `/api/vaults/${vaultId}/envelope`,
      'PUT',
      {
        expectedRevision: 1,
        payloadCiphertext: 'bmV3Q2lwaGVydGV4dERhdGFVcGRhdGVk',
        payloadNonce: 'bmV3Tm9uY2UxMkJ5dGVz',
        payloadAadVersion: 2,
      },
      OWNER_ID
    );
    const updateRes = await updateEnvelopeRoute(updateReq, { params: Promise.resolve({ vaultId }) });
    expect(updateRes.status).toBe(200);
    const updateJson = await updateRes.json();
    expect(updateJson.revision).toBe(2);

    // Verify audit event has canonical 64-char hex hashes
    const updatedEvents = getMockDb().auditEvents.filter((e) => e.vault_id === vaultId);
    const lastEvent = updatedEvents[updatedEvents.length - 1];
    expect(lastEvent.event_type).toBe('payload_updated');
    expect(lastEvent.event_hash).toMatch(/^[a-f0-9]{64}$/i);
    expect(lastEvent.previous_hash).toMatch(/^[a-f0-9]{64}$/i);

    // 3. Conflict update with stale revision: 1 (expect 409 REVISION_CONFLICT)
    const staleReq = makeRequest(
      `/api/vaults/${vaultId}/envelope`,
      'PUT',
      {
        expectedRevision: 1, // Stale! Current revision is 2
        payloadCiphertext: 'Y29uZmxpY3RpbmdQYXlsb2Fk',
        payloadNonce: 'Y29uZmxpY3ROb25jZTEy',
        payloadAadVersion: 2,
      },
      OWNER_ID
    );
    const staleRes = await updateEnvelopeRoute(staleReq, { params: Promise.resolve({ vaultId }) });
    expect(staleRes.status).toBe(409);
    const staleJson = await staleRes.json();
    expect(staleJson.error.code).toBe('REVISION_CONFLICT');
  });

  it('configures 3-nominee roster and enables invite acceptance workflow', async () => {
    // 1. Create vault
    const createReq = makeRequest('/api/vaults', 'POST', sampleVaultPayload, OWNER_ID);
    const createRes = await createVaultRoute(createReq);
    const { vaultId } = await createRes.json();

    // 2. Owner configures 3 nominees
    const nomineesPayload = {
      nominees: [
        { email: 'nominee1@example.com', displayName: 'First Nominee', shareIndex: 1 },
        { email: 'nominee2@example.com', displayName: 'Second Nominee', shareIndex: 2 },
        { email: 'nominee3@example.com', displayName: 'Third Nominee', shareIndex: 3 },
      ],
    };
    const setNomReq = makeRequest(`/api/vaults/${vaultId}/nominees`, 'POST', nomineesPayload, OWNER_ID);
    const setNomRes = await setNomineesRoute(setNomReq, { params: Promise.resolve({ vaultId }) });
    expect(setNomRes.status).toBe(201);
    const nomJson = await setNomRes.json();
    expect(nomJson.nominees).toHaveLength(3);
    expect(nomJson.nominees[0].inviteToken).toBeDefined();

    const inviteToken1 = nomJson.nominees[0].inviteToken;

    // 3. Nominee accepts invitation via POST /api/invites/accept
    const acceptReq = makeRequest(
      '/api/invites/accept',
      'POST',
      { inviteToken: inviteToken1 },
      NOMINEE_USER_ID
    );
    const acceptRes = await acceptInviteRoute(acceptReq);
    expect(acceptRes.status).toBe(200);
    const acceptJson = await acceptRes.json();
    expect(acceptJson.status).toBe('active');
    expect(acceptJson.vaultId).toBe(vaultId);

    // Verify audit events emitted for nominee_added and invite_accepted
    const events = getMockDb().auditEvents.filter((e) => e.vault_id === vaultId);
    expect(events.some((e) => e.event_type === 'nominee_added')).toBe(true);
    expect(events.some((e) => e.event_type === 'invite_accepted')).toBe(true);

    // 4. Reusing or invalid token fails with 400 INVITE_INVALID_OR_EXPIRED
    const reuseReq = makeRequest(
      '/api/invites/accept',
      'POST',
      { inviteToken: inviteToken1 },
      NOMINEE_USER_ID
    );
    const reuseRes = await acceptInviteRoute(reuseReq);
    expect(reuseRes.status).toBe(400);
    const reuseJson = await reuseRes.json();
    expect(reuseJson.error.code).toBe('INVITE_INVALID_OR_EXPIRED');
  });
});
