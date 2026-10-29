// Step 4: Automated 7-Step Hackathon E2E Demo Sequence Test
// References: docs/Last_Mile_Task_Distribution_Mayank_Shyam.pdf (Page 5, Demo Sequence)
// Proves the complete end-to-end presentation flow with zero-plaintext cryptographic guarantees.

import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { getMockDb } from '@/lib/server/db';
import { createVaultPackage } from '@/lib/crypto';
import { recoverVault } from '@/lib/recovery';
import { verifyAuditChain } from '@/lib/audit';
import type { VaultAsset } from '@/types/crypto';

import { POST as createVaultHandler } from '@/app/api/vaults/route';
import { POST as setNomineesHandler } from '@/app/api/vaults/[vaultId]/nominees/route';
import { POST as acceptInviteHandler } from '@/app/api/invites/accept/route';
import { POST as demoClockHandler } from '@/app/api/dev/demo-clock/route';
import { POST as recoveryRequestsHandler } from '@/app/api/vaults/[vaultId]/recovery-requests/route';
import { POST as decisionHandler } from '@/app/api/recovery-requests/[requestId]/decision/route';
import { POST as cancelHandler } from '@/app/api/recovery-requests/[requestId]/cancel/route';
import { GET as auditHandler } from '@/app/api/vaults/[vaultId]/audit/route';

describe('Step 4: Hackathon 7-Step E2E Presentation Demo Sequence', () => {
  const OWNER_USER_ID = '11111111-1111-4111-8111-000000000001';
  const NOMINEE_A_USER_ID = '22222222-2222-4222-8222-000000000002';
  const NOMINEE_B_USER_ID = '33333333-3333-4333-8333-000000000003';
  const STRANGER_USER_ID = '99999999-9999-4999-8999-000000000009';

  // Compliant scrypt params for fast test validation (N >= 16384 as required by server validation)
  const TEST_SCRYPT_PARAMS = {
    N: 16384,
    r: 8,
    p: 1,
    dkLen: 32 as const,
  };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    getMockDb().reset();
  });

  function makePostRequest(url: string, body: unknown, userId?: string): NextRequest {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (userId) {
      headers['x-test-user-id'] = userId;
    }
    return new NextRequest(new URL(url, 'http://localhost:3000'), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }

  function makeGetRequest(url: string, userId?: string): NextRequest {
    const headers: Record<string, string> = {};
    if (userId) {
      headers['x-test-user-id'] = userId;
    }
    return new NextRequest(new URL(url, 'http://localhost:3000'), {
      method: 'GET',
      headers,
    });
  }

  it('executes the full 7-step zero-knowledge family continuity lifecycle', async () => {
    // =========================================================================
    // STEP 1: Synthetic Vault Created on Client
    // =========================================================================
    const masterPassphrase = 'Sharma-Family-Secret-Passphrase-2026!';
    const syntheticAssets: VaultAsset[] = [
      {
        id: '11111111-1111-4111-8111-000000000101',
        category: 'bank_account',
        institutionName: 'HDFC Bank Savings Account',
        accountReference: 'Acct #9876-5432-10',
        documentLocation: 'Safe locker #4 in Jaipur branch',
        claimInstructions: ['Submit Form DA-1 to branch manager', 'Original death certificate required'],
      },
      {
        id: '22222222-2222-4222-8222-000000000102',
        category: 'insurance_policy',
        institutionName: 'LIC Life Insurance (₹1 Cr Cover)',
        accountReference: 'Policy #123456789',
        documentLocation: 'Blue legal binder in home study safe',
        claimInstructions: ['Priya Sharma registered primary nominee'],
      },
      {
        id: '33333333-3333-4333-8333-000000000103',
        category: 'document',
        institutionName: 'Jaipur Registrar Office',
        accountReference: 'Property Deed Vol 42 Page 19',
        documentLocation: 'Jaipur Central Vault Locker 14',
        claimInstructions: ['Locker key held with family attorney R.K. Verma'],
      },
    ];

    const clientVaultPackage = await createVaultPackage({
      vaultName: 'Sharma Estate Family Continuity Vault',
      passphrase: masterPassphrase,
      assets: syntheticAssets,
      kdfOptions: TEST_SCRYPT_PARAMS,
    });

    const vaultId = clientVaultPackage.vaultId;
    expect(vaultId).toBeDefined();
    expect(clientVaultPackage.recoveryCards).toHaveLength(3);
    expect(clientVaultPackage.recoveryCardStrings).toHaveLength(3);

    // =========================================================================
    // STEP 2: Save Encrypted Envelope & Inspect DB for Zero-Plaintext Storage
    // =========================================================================
    const createVaultReq = makePostRequest(
      '/api/vaults',
      {
        id: vaultId,
        schemaVersion: clientVaultPackage.payloadEnvelope.schemaVersion,
        cryptoVersion: clientVaultPackage.payloadEnvelope.cryptoVersion,
        payloadCiphertext: clientVaultPackage.payloadEnvelope.ciphertext,
        payloadNonce: clientVaultPackage.payloadEnvelope.nonce,
        payloadAadVersion: clientVaultPackage.payloadEnvelope.aadVersion,
        wrappedDek: clientVaultPackage.wrappedKeyEnvelope.wrappedDek,
        wrapNonce: clientVaultPackage.wrappedKeyEnvelope.nonce,
        kdfName: 'scrypt',
        kdfParams: clientVaultPackage.wrappedKeyEnvelope.kdfParams,
        kdfSalt: clientVaultPackage.wrappedKeyEnvelope.salt,
        checkinIntervalSeconds: 86400 * 30, // 30 days
      },
      OWNER_USER_ID
    );

    const createVaultRes = await createVaultHandler(createVaultReq);
    expect(createVaultRes.status).toBe(201);
    const createdVaultJson = await createVaultRes.json();
    expect(createdVaultJson.vaultId).toBe(vaultId);
    expect(createdVaultJson.status).toBe('ACTIVE');

    // Configure 3 Nominees
    const setNomineesReq = makePostRequest(
      `/api/vaults/${vaultId}/nominees`,
      {
        nominees: [
          { email: 'nominee.a@example.com', displayName: 'Nominee A', shareIndex: 1 },
          { email: 'nominee.b@example.com', displayName: 'Nominee B', shareIndex: 2 },
          { email: 'nominee.c@example.com', displayName: 'Nominee C', shareIndex: 3 },
        ],
      },
      OWNER_USER_ID
    );
    const setNomineesRes = await setNomineesHandler(setNomineesReq, {
      params: Promise.resolve({ vaultId }),
    });
    expect(setNomineesRes.status).toBe(201);
    const setNomineesJson = await setNomineesRes.json();
    expect(setNomineesJson.nominees).toHaveLength(3);

    const tokenA = setNomineesJson.nominees[0].inviteToken;
    const tokenB = setNomineesJson.nominees[1].inviteToken;

    // Nominees accept invitations
    const acceptReqA = makePostRequest('/api/invites/accept', { inviteToken: tokenA }, NOMINEE_A_USER_ID);
    const acceptResA = await acceptInviteHandler(acceptReqA);
    expect(acceptResA.status).toBe(200);

    const acceptReqB = makePostRequest('/api/invites/accept', { inviteToken: tokenB }, NOMINEE_B_USER_ID);
    const acceptResB = await acceptInviteHandler(acceptReqB);
    expect(acceptResB.status).toBe(200);

    // Database Inspection: Assert strictly ZERO plaintext stored
    const db = getMockDb();
    const storedVault = db.vaults.get(vaultId);
    expect(storedVault).toBeDefined();
    expect(storedVault?.payload_ciphertext).toBe(clientVaultPackage.payloadEnvelope.ciphertext);

    // Verify raw secret keywords never appear in DB storage
    const allDbDump = JSON.stringify(Array.from(db.vaults.values())) + JSON.stringify(Array.from(db.nominees.values()));
    expect(allDbDump).not.toContain('HDFC Bank');
    expect(allDbDump).not.toContain('Acct #9876-5432-10');
    expect(allDbDump).not.toContain('LIC Life Insurance');
    expect(allDbDump).not.toContain('Property Deed');
    expect(allDbDump).not.toContain('Sharma-Family-Secret-Passphrase-2026!');
    expect(allDbDump).not.toContain('Safe locker #4 in Jaipur');

    // =========================================================================
    // STEP 3: Advance Demo Clock Through Configured Recovery States
    // =========================================================================
    // Advance clock past 30-day check-in deadline (+40 days)
    const demoClockReq = makePostRequest(
      '/api/dev/demo-clock',
      {
        action: 'advance_seconds',
        seconds: 86400 * 40,
        vaultId,
      },
      OWNER_USER_ID
    );
    const demoClockRes = await demoClockHandler(demoClockReq);
    expect(demoClockRes.status).toBe(200);

    // Open recovery request by active Nominee A
    const openRecoveryReq = makePostRequest(
      `/api/vaults/${vaultId}/recovery-requests`,
      {},
      NOMINEE_A_USER_ID
    );
    const openRecoveryRes = await recoveryRequestsHandler(openRecoveryReq, {
      params: Promise.resolve({ vaultId }),
    });
    expect(openRecoveryRes.status).toBe(201);
    const recoveryRequestJson = await openRecoveryRes.json();
    const requestId = recoveryRequestJson.id;
    expect(recoveryRequestJson.status).toBe('pending');
    expect(recoveryRequestJson.vault_id).toBe(vaultId);

    // =========================================================================
    // STEP 4: Capture Approvals from Two Distinct Nominees (Cooling-off triggered)
    // =========================================================================
    // Nominee A casts 1st approval
    const voteReqA = makePostRequest(
      `/api/recovery-requests/${requestId}/decision`,
      {
        decision: 'approve',
        idempotencyKey: '77777777-7777-4777-8777-000000000001',
      },
      NOMINEE_A_USER_ID
    );
    const voteResA = await decisionHandler(voteReqA, {
      params: Promise.resolve({ requestId }),
    });
    expect(voteResA.status).toBe(200);
    const voteJsonA = await voteResA.json();
    expect(voteJsonA.approvedCount).toBe(1);
    expect(voteJsonA.thresholdMet).toBe(false);

    // Nominee A duplicate approval attempt -> deduplicated, does not advance count
    const voteDupReq = makePostRequest(
      `/api/recovery-requests/${requestId}/decision`,
      {
        decision: 'approve',
        idempotencyKey: '77777777-7777-4777-8777-000000000002',
      },
      NOMINEE_A_USER_ID
    );
    const voteDupRes = await decisionHandler(voteDupReq, {
      params: Promise.resolve({ requestId }),
    });
    expect(voteDupRes.status).toBe(200);
    const voteDupJson = await voteDupRes.json();
    expect(voteDupJson.approvedCount).toBe(1);

    // Unauthorized non-nominee attempts approval -> 403 Forbidden
    const voteStrangerReq = makePostRequest(
      `/api/recovery-requests/${requestId}/decision`,
      {
        decision: 'approve',
        idempotencyKey: '77777777-7777-4777-8777-000000000009',
      },
      STRANGER_USER_ID
    );
    const voteStrangerRes = await decisionHandler(voteStrangerReq, {
      params: Promise.resolve({ requestId }),
    });
    expect(voteStrangerRes.status).toBe(403);

    // Nominee B casts 2nd approval (meets 2-of-3 threshold)
    const voteReqB = makePostRequest(
      `/api/recovery-requests/${requestId}/decision`,
      {
        decision: 'approve',
        idempotencyKey: '88888888-8888-4888-8888-000000000001',
      },
      NOMINEE_B_USER_ID
    );
    const voteResB = await decisionHandler(voteReqB, {
      params: Promise.resolve({ requestId }),
    });
    expect(voteResB.status).toBe(200);
    const voteJsonB = await voteResB.json();
    expect(voteJsonB.approvedCount).toBe(2);
    expect(voteJsonB.thresholdMet).toBe(true);
    expect(voteJsonB.status).toBe('cooling_off');
    expect(voteJsonB.coolingOffEndsAt).toBeDefined();

    // =========================================================================
    // STEP 5: Import 2 Recovery Cards Locally in Browser & Decrypt
    // =========================================================================
    // Offline local browser recovery using Card 1 and Card 2 strings
    const cardString1 = clientVaultPackage.recoveryCardStrings[0];
    const cardString2 = clientVaultPackage.recoveryCardStrings[1];

    const recoveredPayload = await recoverVault({
      cardA: cardString1,
      cardB: cardString2,
      payloadEnvelope: clientVaultPackage.payloadEnvelope,
      expectedVaultId: vaultId,
    });

    // 100% data fidelity check
    expect(recoveredPayload.vaultId).toBe(vaultId);
    expect(recoveredPayload.vaultName).toBe('Sharma Estate Family Continuity Vault');
    expect(recoveredPayload.assets).toHaveLength(3);
    expect(recoveredPayload.assets[0].institutionName).toBe('HDFC Bank Savings Account');
    expect(recoveredPayload.assets[1].institutionName).toBe('LIC Life Insurance (₹1 Cr Cover)');
    expect(recoveredPayload.assets[2].institutionName).toBe('Jaipur Registrar Office');

    // Negative security check: 2 identical cards fail-closed immediately
    await expect(
      recoverVault({
        cardA: cardString1,
        cardB: cardString1,
        payloadEnvelope: clientVaultPackage.payloadEnvelope,
      })
    ).rejects.toThrow(/Duplicate share index/);

    // =========================================================================
    // STEP 6: Owner Cancels Recovery During Cooling-Off ("I Am Safe" Override)
    // =========================================================================
    const cancelReq = makePostRequest(
      `/api/recovery-requests/${requestId}/cancel`,
      {},
      OWNER_USER_ID
    );
    const cancelRes = await cancelHandler(cancelReq, {
      params: Promise.resolve({ requestId }),
    });
    expect(cancelRes.status).toBe(200);
    const cancelJson = await cancelRes.json();
    expect(cancelJson.status).toBe('ACTIVE');

    // Confirm DB reflects safe state restoration
    const restoredVault = db.vaults.get(vaultId);
    expect(restoredVault?.status).toBe('ACTIVE');
    const cancelledRequest = db.recoveryRequests.get(requestId);
    expect(cancelledRequest?.status).toBe('cancelled');
    expect(cancelledRequest?.cancelled_by).toBe(OWNER_USER_ID);

    // =========================================================================
    // STEP 7: Cryptographic Audit Trail Verification
    // =========================================================================
    const auditReq = makeGetRequest(`/api/vaults/${vaultId}/audit`, OWNER_USER_ID);
    const auditRes = await auditHandler(auditReq, {
      params: Promise.resolve({ vaultId }),
    });
    expect(auditRes.status).toBe(200);
    const auditJson = await auditRes.json();

    // Verify all lifecycle events are present in sequence
    expect(auditJson.events.length).toBeGreaterThanOrEqual(5);
    const eventTypes = auditJson.events.map((e: { eventType: string }) => e.eventType);
    expect(eventTypes).toContain('vault_created');
    expect(eventTypes).toContain('recovery_request_opened');
    expect(eventTypes).toContain('nominee_approved');
    expect(eventTypes).toContain('recovery_cancelled');

    // Verify mathematical SHA-256 integrity report
    expect(auditJson.verification.verified).toBe(true);
    expect(auditJson.verification.hashChainIntact).toBe(true);

    // Verify using direct cryptographic verifier
    const directVerification = verifyAuditChain(auditJson.events);
    expect(directVerification.verified).toBe(true);
    expect(directVerification.totalEvents).toBe(auditJson.events.length);
    expect(directVerification.hashChainIntact).toBe(true);

    // Tamper Detection Proof: Tampering with any event payload breaks hash chain
    const tamperedEvents = JSON.parse(JSON.stringify(auditJson.events));
    tamperedEvents[1].metadata = { malicious_tamper: true };
    const tamperedVerification = verifyAuditChain(tamperedEvents);
    expect(tamperedVerification.verified).toBe(false);
  });
});
