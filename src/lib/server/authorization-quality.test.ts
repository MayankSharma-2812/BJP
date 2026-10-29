// Comprehensive Authorization Quality & End-to-End Recovery Roundtrip Tests (Workstream B3)
// References: docs/05_BACKEND_SCHEMA.md, docs/06_API_CONTRACT.md, docs/9_TEST_PLAN.md

import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as createVaultRoute } from '@/app/api/vaults/route';
import { GET as getVaultRoute } from '@/app/api/vaults/[vaultId]/route';
import { PUT as updateEnvelopeRoute } from '@/app/api/vaults/[vaultId]/envelope/route';
import { POST as setNomineesRoute } from '@/app/api/vaults/[vaultId]/nominees/route';
import { POST as acceptInviteRoute } from '@/app/api/invites/accept/route';
import { getMockDb } from '@/lib/server/db';
import {
  generateDek,
  encryptPayload,
  decryptPayload,
  deriveKek,
  wrapDek,
  splitDek,
  combineShares,
  generateKdfSalt,
  encodeRecoveryCard,
  base64UrlToUint8Array,
} from '@/lib/crypto';
import type { VaultPayload } from '@/types/crypto';

describe('Workstream B3: Authorization Quality & End-to-End Crypto Roundtrip', () => {
  const OWNER_USER_ID = 'owner-shyam-uuid-1111';
  const INTRUDER_USER_ID = 'intruder-hacker-uuid-2222';
  const NOMINEE_USER_ID = 'nominee-brother-uuid-3333';

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

  it('guarantees complete cross-user denial for vault reads and writes', async () => {
    // 1. Owner creates vault
    const dek = generateDek();
    const vaultId = crypto.randomUUID();
    const payload: VaultPayload = {
      schemaVersion: 1,
      vaultId,
      vaultName: 'Isolated Owner Vault',
      updatedAt: new Date().toISOString(),
      assets: [
        {
          id: crypto.randomUUID(),
          category: 'bank_account',
          institutionName: 'Secret Bank Account',
          accountReference: 'Acct-SECRET-999',
          documentLocation: 'Private safe',
          claimInstructions: ['Never leak this'],
        },
      ],
    };

    const encryptedEnvelope = await encryptPayload(payload, dek);
    const salt = generateKdfSalt();
    const { kek, params: kdfParams } = await deriveKek('owner-passphrase-strong', salt);
    const wrappedEnvelope = await wrapDek(dek, kek, vaultId, salt, kdfParams);

    const createReq = makeRequest(
      '/api/vaults',
      'POST',
      {
        schemaVersion: encryptedEnvelope.schemaVersion,
        cryptoVersion: encryptedEnvelope.cryptoVersion,
        payloadCiphertext: encryptedEnvelope.ciphertext,
        payloadNonce: encryptedEnvelope.nonce,
        payloadAadVersion: encryptedEnvelope.aadVersion,
        wrappedDek: wrappedEnvelope.wrappedDek,
        wrapNonce: wrappedEnvelope.nonce,
        kdfName: 'scrypt',
        kdfParams: wrappedEnvelope.kdfParams,
        kdfSalt: wrappedEnvelope.salt,
        checkinIntervalSeconds: 86400,
      },
      OWNER_USER_ID
    );
    const createRes = await createVaultRoute(createReq);
    expect(createRes.status).toBe(201);
    const { vaultId: createdId } = await createRes.json();

    // 2. Intruder attempts to read vault -> Expect 403 FORBIDDEN
    const readReq = makeRequest(`/api/vaults/${createdId}`, 'GET', undefined, INTRUDER_USER_ID);
    const readRes = await getVaultRoute(readReq, { params: Promise.resolve({ vaultId: createdId }) });
    expect(readRes.status).toBe(403);
    const readJson = await readRes.json();
    expect(readJson.error.code).toBe('FORBIDDEN');

    // 3. Intruder attempts to overwrite envelope -> Expect 403 FORBIDDEN
    const updateReq = makeRequest(
      `/api/vaults/${createdId}/envelope`,
      'PUT',
      {
        expectedRevision: 1,
        payloadCiphertext: 'aGVsby1tYWxpY2lvdXM',
        payloadNonce: 'MDEyMzQ1Njc4OTAx',
        payloadAadVersion: 1,
      },
      INTRUDER_USER_ID
    );
    const updateRes = await updateEnvelopeRoute(updateReq, { params: Promise.resolve({ vaultId: createdId }) });
    expect(updateRes.status).toBe(403);
    const updateJson = await updateRes.json();
    expect(updateJson.error.code).toBe('FORBIDDEN');

    // 4. Intruder attempts to reconfigure nominees -> Expect 403 FORBIDDEN
    const nomineeReq = makeRequest(
      `/api/vaults/${createdId}/nominees`,
      'POST',
      {
        nominees: [
          { email: 'hacker1@example.com', displayName: 'Hacker One', shareIndex: 1 },
          { email: 'hacker2@example.com', displayName: 'Hacker Two', shareIndex: 2 },
          { email: 'hacker3@example.com', displayName: 'Hacker Three', shareIndex: 3 },
        ],
      },
      INTRUDER_USER_ID
    );
    const nomineeRes = await setNomineesRoute(nomineeReq, { params: Promise.resolve({ vaultId: createdId }) });
    expect(nomineeRes.status).toBe(403);
  });

  it('proves nominee-restricted views: nominee never receives owner wrapped DEK or KDF salt', async () => {
    // 1. Owner creates vault
    const dek = generateDek();
    const vaultId = crypto.randomUUID();
    const payload: VaultPayload = {
      schemaVersion: 1,
      vaultId,
      vaultName: 'Nominee Protected Vault',
      updatedAt: new Date().toISOString(),
      assets: [],
    };
    const encryptedEnvelope = await encryptPayload(payload, dek);
    const salt = generateKdfSalt();
    const { kek, params: kdfParams } = await deriveKek('owner-passphrase-strong', salt);
    const wrappedEnvelope = await wrapDek(dek, kek, vaultId, salt, kdfParams);

    const createReq = makeRequest(
      '/api/vaults',
      'POST',
      {
        schemaVersion: encryptedEnvelope.schemaVersion,
        cryptoVersion: encryptedEnvelope.cryptoVersion,
        payloadCiphertext: encryptedEnvelope.ciphertext,
        payloadNonce: encryptedEnvelope.nonce,
        payloadAadVersion: encryptedEnvelope.aadVersion,
        wrappedDek: wrappedEnvelope.wrappedDek,
        wrapNonce: wrappedEnvelope.nonce,
        kdfName: 'scrypt',
        kdfParams: wrappedEnvelope.kdfParams,
        kdfSalt: wrappedEnvelope.salt,
        checkinIntervalSeconds: 86400,
      },
      OWNER_USER_ID
    );
    const createRes = await createVaultRoute(createReq);
    const { vaultId: createdId } = await createRes.json();

    // 2. Owner configures nominees
    const setNomReq = makeRequest(
      `/api/vaults/${createdId}/nominees`,
      'POST',
      {
        nominees: [
          { email: 'brother@example.com', displayName: 'Brother Nominee', shareIndex: 1 },
          { email: 'sister@example.com', displayName: 'Sister Nominee', shareIndex: 2 },
          { email: 'friend@example.com', displayName: 'Friend Nominee', shareIndex: 3 },
        ],
      },
      OWNER_USER_ID
    );
    const setNomRes = await setNomineesRoute(setNomReq, { params: Promise.resolve({ vaultId: createdId }) });
    const { nominees } = await setNomRes.json();
    const inviteToken = nominees[0].inviteToken;

    // 3. Nominee accepts invitation
    const acceptReq = makeRequest('/api/invites/accept', 'POST', { inviteToken }, NOMINEE_USER_ID);
    const acceptRes = await acceptInviteRoute(acceptReq);
    expect(acceptRes.status).toBe(200);

    // 4. Nominee requests vault
    const getNomReq = makeRequest(`/api/vaults/${createdId}`, 'GET', undefined, NOMINEE_USER_ID);
    const getNomRes = await getVaultRoute(getNomReq, { params: Promise.resolve({ vaultId: createdId }) });
    expect(getNomRes.status).toBe(200);
    const nomJson = await getNomRes.json();

    // Zero-knowledge verification: Nominee gets ciphertext but NEVER owner's wrapped DEK or KDF salt
    expect(nomJson.wrappedDek).toBe('');
    expect(nomJson.kdfSalt).toBe('');
    expect(nomJson.wrapNonce).toBe('');
  });

  it('performs complete end-to-end client encryption, persistence, and 2-of-3 Shamir recovery', async () => {
    // 1. Client generates DEK and encrypts confidential assets locally
    const originalDek = generateDek();
    const vaultId = crypto.randomUUID();
    const confidentialAssets: VaultPayload = {
      schemaVersion: 1,
      vaultId,
      vaultName: 'Sharma Real Family Vault',
      updatedAt: '2026-10-29T12:00:00.000Z',
      assets: [
        {
          id: crypto.randomUUID(),
          category: 'bank_account',
          institutionName: 'HDFC Bank',
          accountReference: 'Acct #4321',
          documentLocation: 'Safe #4 in Jaipur',
          claimInstructions: ['Nominee claim requires Form A'],
        },
        {
          id: crypto.randomUUID(),
          category: 'insurance_policy',
          institutionName: 'LIC Jeevan Anand',
          accountReference: 'Policy #123456789',
          documentLocation: 'Blue study binder',
          claimInstructions: ['Priya Sharma registered nominee'],
        },
      ],
    };

    const envelope = await encryptPayload(confidentialAssets, originalDek);

    // 2. Owner wraps DEK with scrypt KEK
    const salt = generateKdfSalt();
    const { kek, params: kdfParams } = await deriveKek('strong-vault-passphrase-2026', salt);
    const wrappedEnvelope = await wrapDek(originalDek, kek, vaultId, salt, kdfParams);

    // 3. Split DEK with Shamir 2-of-3
    const rawShares = await splitDek(originalDek);
    expect(rawShares).toHaveLength(3);

    const card1 = encodeRecoveryCard(vaultId, 1, rawShares[0]);
    const card2 = encodeRecoveryCard(vaultId, 2, rawShares[1]);
    const card3 = encodeRecoveryCard(vaultId, 3, rawShares[2]);

    // 4. Save to persistence route POST /api/vaults
    const createReq = makeRequest(
      '/api/vaults',
      'POST',
      {
        schemaVersion: envelope.schemaVersion,
        cryptoVersion: envelope.cryptoVersion,
        payloadCiphertext: envelope.ciphertext,
        payloadNonce: envelope.nonce,
        payloadAadVersion: envelope.aadVersion,
        wrappedDek: wrappedEnvelope.wrappedDek,
        wrapNonce: wrappedEnvelope.nonce,
        kdfName: 'scrypt',
        kdfParams: wrappedEnvelope.kdfParams,
        kdfSalt: wrappedEnvelope.salt,
        checkinIntervalSeconds: 86400,
      },
      OWNER_USER_ID
    );
    const createRes = await createVaultRoute(createReq);
    expect(createRes.status).toBe(201);
    const { vaultId: savedVaultId } = await createRes.json();

    // 5. Inspect database to prove Zero-Plaintext: no plaintext assets or shares exist remotely
    const dbRecord = getMockDb().vaults.get(savedVaultId);
    expect(dbRecord).toBeDefined();
    expect(dbRecord!.payload_ciphertext).toBe(envelope.ciphertext);
    expect(JSON.stringify(dbRecord)).not.toContain('HDFC Bank');
    expect(JSON.stringify(dbRecord)).not.toContain('LIC Jeevan Anand');
    expect(JSON.stringify(dbRecord)).not.toContain(card1.share);

    // 6. Test Shamir combinations:
    // Combination A: Card 1 + Card 2
    const reconDekA = await combineShares([
      base64UrlToUint8Array(card1.share),
      base64UrlToUint8Array(card2.share),
    ]);
    const decryptedA = await decryptPayload(envelope, reconDekA, vaultId);
    expect(decryptedA.assets).toHaveLength(2);
    expect(decryptedA.assets[0].institutionName).toBe('HDFC Bank');

    // Combination B: Card 2 + Card 3
    const reconDekB = await combineShares([
      base64UrlToUint8Array(card2.share),
      base64UrlToUint8Array(card3.share),
    ]);
    const decryptedB = await decryptPayload(envelope, reconDekB, vaultId);
    expect(decryptedB.assets[1].institutionName).toBe('LIC Jeevan Anand');

    // Combination C: Card 1 + Card 3
    const reconDekC = await combineShares([
      base64UrlToUint8Array(card1.share),
      base64UrlToUint8Array(card3.share),
    ]);
    const decryptedC = await decryptPayload(envelope, reconDekC, vaultId);
    expect(decryptedC.vaultName).toBe('Sharma Real Family Vault');

    // Negative Test: 1 share alone cannot decrypt
    await expect(combineShares([base64UrlToUint8Array(card1.share)])).rejects.toThrow(
      'At least 2 shares are required'
    );

    // Negative Test: Duplicate shares fail reconstruction
    await expect(
      combineShares([
        base64UrlToUint8Array(card1.share),
        base64UrlToUint8Array(card1.share),
      ])
    ).rejects.toThrow('Shamir share reconstruction failed');

    // Negative Test: Tampered ciphertext fails authentication
    const tamperedEnvelope = {
      ...envelope,
      ciphertext: envelope.ciphertext.slice(0, -6) + 'AAAAAA',
    };
    await expect(decryptPayload(tamperedEnvelope, reconDekA, vaultId)).rejects.toThrow();
  });
});
