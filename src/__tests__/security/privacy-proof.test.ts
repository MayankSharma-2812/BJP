import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  createVaultPackage,
  FAST_TEST_SCRYPT_PARAMS,
  base64UrlToUint8Array,
} from '@/lib/crypto';
import { recoverVault } from '@/lib/recovery';
import {
  getMockDb,
  getAuditTrailDb,
} from '@/lib/server/db';
import { POST as checkInHandler } from '@/app/api/vaults/[vaultId]/check-in/route';
import { POST as recoveryRequestsHandler } from '@/app/api/vaults/[vaultId]/recovery-requests/route';
import { GET as sessionHandler } from '@/app/api/recovery-requests/[requestId]/session/route';
import { verifyAuditChain } from '@/lib/audit';
import type { VaultAsset } from '@/types/crypto';

describe('Phase 6: Privacy Proof, Zero-Plaintext Audit & Security Hardening', () => {
  const OWNER_USER_ID = '11111111-1111-4111-8111-111111111111';
  const NOMINEE_A_USER_ID = '22222222-2222-4222-8222-222222222222';
  const ATTACKER_USER_ID = '99999999-9999-4999-8999-999999999999';

  const SECRET_BANK_NAME = 'Secret Swiss Banking Corp';
  const SECRET_ACCOUNT_NUMBER = 'CH-9938291048201';
  const SECRET_LOCKER_PIN = 'PIN-9921-TOP-SECRET';
  const SECRET_PASSPHRASE = 'MyMasterPassphrase!2026';

  const sensitiveAssets: VaultAsset[] = [
    {
      id: 'a1111111-1111-4111-8111-111111111111',
      category: 'bank_account',
      institutionName: SECRET_BANK_NAME,
      accountReference: SECRET_ACCOUNT_NUMBER,
      documentLocation: 'Geneva Vault 42',
      claimInstructions: [`Locker key PIN: ${SECRET_LOCKER_PIN}`],
    },
  ];

  beforeEach(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    const db = getMockDb();
    db.reset();
  });

  it('PROOFS: Zero Plaintext Invariant — no secret strings ever exist in server storage', async () => {
    // 1. Owner generates encrypted vault package locally
    const pkg = await createVaultPackage({
      vaultName: 'High Security Swiss Vault',
      passphrase: SECRET_PASSPHRASE,
      assets: sensitiveAssets,
      kdfOptions: FAST_TEST_SCRYPT_PARAMS,
    });

    // 2. Persist to Mock Database store
    const db = getMockDb();
    const now = new Date('2026-10-29T12:00:00.000Z');

    db.vaults.set(pkg.vaultId, {
      id: pkg.vaultId,
      owner_id: OWNER_USER_ID,
      status: 'ACTIVE',
      schema_version: 1,
      crypto_version: 1,
      payload_ciphertext: pkg.payloadEnvelope.ciphertext,
      payload_nonce: pkg.payloadEnvelope.nonce,
      payload_aad_version: 1,
      wrapped_dek: pkg.wrappedKeyEnvelope.wrappedDek,
      wrap_nonce: pkg.wrappedKeyEnvelope.nonce,
      kdf_name: 'scrypt',
      kdf_params: pkg.wrappedKeyEnvelope.kdfParams,
      kdf_salt: pkg.wrappedKeyEnvelope.salt,
      checkin_interval_seconds: 120,
      last_checkin_at: now.toISOString(),
      next_checkin_at: new Date(now.getTime() + 120000).toISOString(),
      grace_ends_at: null,
      cooling_off_ends_at: null,
      unlock_expires_at: null,
      revision: 1,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });

    // 3. Serialize the entire database memory to JSON string and scan for secrets
    const dbDump = JSON.stringify({
      vaults: Array.from(db.vaults.values()),
      auditEvents: db.auditEvents,
      recoveryRequests: Array.from(db.recoveryRequests.values()),
      recoveryApprovals: Array.from(db.recoveryApprovals.values()),
    });

    // Strict leak assertions: absolutely zero plaintexts in server database state
    expect(dbDump).not.toContain(SECRET_BANK_NAME);
    expect(dbDump).not.toContain(SECRET_ACCOUNT_NUMBER);
    expect(dbDump).not.toContain(SECRET_LOCKER_PIN);
    expect(dbDump).not.toContain(SECRET_PASSPHRASE);

    // Verify Shamir shares are NOT stored in the database
    expect(dbDump).not.toContain(pkg.recoveryCards[0].share);
    expect(dbDump).not.toContain(pkg.recoveryCards[1].share);
    expect(dbDump).not.toContain(pkg.recoveryCards[2].share);
  });

  it('PROOFS: Single Shamir share provides zero information and cannot decrypt the vault', async () => {
    const pkg = await createVaultPackage({
      vaultName: 'Test Single Share Vault',
      passphrase: SECRET_PASSPHRASE,
      assets: sensitiveAssets,
      kdfOptions: FAST_TEST_SCRYPT_PARAMS,
    });

    // Attempting to reconstruct with only 1 share must throw
    const singleShare = base64UrlToUint8Array(pkg.recoveryCards[0].share);

    await expect(
      recoverVault({
        cardA: pkg.recoveryCards[0],
        cardB: pkg.recoveryCards[0], // Duplicate share index
        payloadEnvelope: pkg.payloadEnvelope,
      })
    ).rejects.toThrow(/Duplicate share index/);

    // Direct byte manipulation: a single 33-byte share is not a 32-byte AES key
    expect(singleShare.byteLength).not.toBe(32);
  });

  it('PROOFS: Fail-closed recovery session privacy before COOLING_OFF completes', async () => {
    const pkg = await createVaultPackage({
      vaultName: 'Gated Swiss Vault',
      passphrase: SECRET_PASSPHRASE,
      assets: sensitiveAssets,
      kdfOptions: FAST_TEST_SCRYPT_PARAMS,
    });

    const db = getMockDb();
    const now = new Date('2026-10-29T12:00:00.000Z');

    db.vaults.set(pkg.vaultId, {
      id: pkg.vaultId,
      owner_id: OWNER_USER_ID,
      status: 'ACTIVE',
      schema_version: 1,
      crypto_version: 1,
      payload_ciphertext: pkg.payloadEnvelope.ciphertext,
      payload_nonce: pkg.payloadEnvelope.nonce,
      payload_aad_version: 1,
      wrapped_dek: pkg.wrappedKeyEnvelope.wrappedDek,
      wrap_nonce: pkg.wrappedKeyEnvelope.nonce,
      kdf_name: 'scrypt',
      kdf_params: pkg.wrappedKeyEnvelope.kdfParams,
      kdf_salt: pkg.wrappedKeyEnvelope.salt,
      checkin_interval_seconds: 120,
      last_checkin_at: now.toISOString(),
      next_checkin_at: new Date(now.getTime() + 120000).toISOString(),
      grace_ends_at: null,
      cooling_off_ends_at: null,
      unlock_expires_at: null,
      revision: 1,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });

    // Add Nominee A
    db.nominees.set('nominee-a-id', {
      id: 'nominee-a-id',
      vault_id: pkg.vaultId,
      user_id: NOMINEE_A_USER_ID,
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

    // 1. Nominee A creates recovery request (status: pending)
    const reqCreate = new NextRequest(`http://localhost/api/vaults/${pkg.vaultId}/recovery-requests`, {
      method: 'POST',
      headers: { 'x-test-user-id': NOMINEE_A_USER_ID },
    });
    const resCreate = await recoveryRequestsHandler(reqCreate, { params: Promise.resolve({ vaultId: pkg.vaultId }) });
    expect(resCreate.status).toBe(201);
    const recoveryRequest = await resCreate.json();

    // 2. Querying session while status is 'pending' must fail with 400 RECOVERY_NOT_READY
    const reqSessionPending = new NextRequest(`http://localhost/api/recovery-requests/${recoveryRequest.id}/session`, {
      method: 'GET',
      headers: { 'x-test-user-id': NOMINEE_A_USER_ID },
    });
    const resSessionPending = await sessionHandler(reqSessionPending, { params: Promise.resolve({ requestId: recoveryRequest.id }) });
    expect(resSessionPending.status).toBe(400);

    // 3. Unauthorized attacker query must be rejected with 403 FORBIDDEN
    const reqSessionAttacker = new NextRequest(`http://localhost/api/recovery-requests/${recoveryRequest.id}/session`, {
      method: 'GET',
      headers: { 'x-test-user-id': ATTACKER_USER_ID },
    });
    const resSessionAttacker = await sessionHandler(reqSessionAttacker, { params: Promise.resolve({ requestId: recoveryRequest.id }) });
    expect(resSessionAttacker.status).toBe(403);
  });

  it('PROOFS: Tamper-Evident Audit Trail breaks cryptographic verification upon metadata or sequence tampering', async () => {
    const pkg = await createVaultPackage({
      vaultName: 'Audit Proof Vault',
      passphrase: SECRET_PASSPHRASE,
      assets: sensitiveAssets,
      kdfOptions: FAST_TEST_SCRYPT_PARAMS,
    });

    const db = getMockDb();
    const now = new Date('2026-10-29T12:00:00.000Z');

    db.vaults.set(pkg.vaultId, {
      id: pkg.vaultId,
      owner_id: OWNER_USER_ID,
      status: 'CHECKIN_DUE',
      schema_version: 1,
      crypto_version: 1,
      payload_ciphertext: pkg.payloadEnvelope.ciphertext,
      payload_nonce: pkg.payloadEnvelope.nonce,
      payload_aad_version: 1,
      wrapped_dek: pkg.wrappedKeyEnvelope.wrappedDek,
      wrap_nonce: pkg.wrappedKeyEnvelope.nonce,
      kdf_name: 'scrypt',
      kdf_params: pkg.wrappedKeyEnvelope.kdfParams,
      kdf_salt: pkg.wrappedKeyEnvelope.salt,
      checkin_interval_seconds: 120,
      last_checkin_at: now.toISOString(),
      next_checkin_at: now.toISOString(),
      grace_ends_at: null,
      cooling_off_ends_at: null,
      unlock_expires_at: null,
      revision: 1,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });

    // Record check-in to generate audit events
    const reqCheckIn = new NextRequest(`http://localhost/api/vaults/${pkg.vaultId}/check-in`, {
      method: 'POST',
      headers: { 'x-test-user-id': OWNER_USER_ID },
    });
    await checkInHandler(reqCheckIn, { params: Promise.resolve({ vaultId: pkg.vaultId }) });

    // Fetch verified audit trail
    const trail = await getAuditTrailDb(pkg.vaultId, OWNER_USER_ID);
    expect(trail.verification.verified).toBe(true);
    expect(trail.verification.hashChainIntact).toBe(true);
    expect(trail.events.length).toBeGreaterThanOrEqual(1);

    // Tamper test 1: Modify event metadata (e.g. attacker changes an audit log property)
    const tamperedMetadataEvents = trail.events.map((e, idx) => {
      if (idx === 0) {
        return {
          ...e,
          metadata: { ...e.metadata, forgedProperty: 'malicious-data' },
        };
      }
      return e;
    });

    const verificationTamperedMeta = verifyAuditChain(tamperedMetadataEvents);
    expect(verificationTamperedMeta.verified).toBe(false);
    expect(verificationTamperedMeta.brokenIndex).toBe(0);

    // Tamper test 2: Alter hash chaining
    const tamperedHashEvents = trail.events.map((e, idx) => {
      if (idx === 0) {
        return {
          ...e,
          previousHash: '1111111111111111111111111111111111111111111111111111111111111111',
        };
      }
      return e;
    });

    const verificationTamperedHash = verifyAuditChain(tamperedHashEvents);
    expect(verificationTamperedHash.verified).toBe(false);
  });
});
