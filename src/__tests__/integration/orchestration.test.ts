import { describe, it, expect } from 'vitest';
import {
  createVaultPackage,
  unlockVault,
  FAST_TEST_SCRYPT_PARAMS,
} from '@/lib/crypto';
import { recoverVault } from '@/lib/recovery';
import type { VaultAsset } from '@/types/crypto';

describe('Phase 5: High-Level Client Orchestrators & E2E Lifecycle', () => {
  const sampleAssets: VaultAsset[] = [
    {
      id: 'a1111111-1111-4111-8111-111111111111',
      category: 'bank_account',
      institutionName: 'State Bank of India',
      accountReference: 'Acct #9876-5432-10',
      documentLocation: 'Master bedroom safe deposit box',
      claimInstructions: ['Submit Form DA-1 to branch manager', 'Original death certificate required'],
    },
    {
      id: 'a2222222-2222-4222-8222-222222222222',
      category: 'insurance_policy',
      institutionName: 'HDFC Life Super Income',
      accountReference: 'Policy #HD-4482910',
      documentLocation: 'Blue legal binder in library',
      claimInstructions: ['Nominee payout code: 49201'],
    },
    {
      id: 'a3333333-3333-4333-8333-333333333333',
      category: 'document',
      institutionName: 'Jaipur Registrar Office',
      accountReference: 'Property Deed Vol 42 Page 19',
      documentLocation: 'Jaipur Central Vault Locker 14',
      claimInstructions: ['Locker key with family attorney R.K. Verma'],
    },
  ];

  it('orchestrates complete vault creation, owner unlock, and 2-of-3 nominee recovery', async () => {
    const passphrase = 'Ultra-Secure-Master-Passphrase-2026!';

    // 1. Vault Creator Orchestrator: Generate encrypted package + 3 recovery cards
    const pkg = await createVaultPackage({
      vaultName: 'Sharma Estate Continuity Vault',
      passphrase,
      assets: sampleAssets,
      kdfOptions: FAST_TEST_SCRYPT_PARAMS,
    });

    expect(pkg.vaultId).toBeDefined();
    expect(pkg.payloadEnvelope.ciphertext).toBeDefined();
    expect(pkg.payloadEnvelope.algorithm).toBe('AES-256-GCM');
    expect(pkg.wrappedKeyEnvelope.wrappedDek).toBeDefined();
    expect(pkg.recoveryCards).toHaveLength(3);
    expect(pkg.recoveryCardStrings).toHaveLength(3);

    // Verify recovery card metadata
    expect(pkg.recoveryCards[0].shareIndex).toBe(1);
    expect(pkg.recoveryCards[1].shareIndex).toBe(2);
    expect(pkg.recoveryCards[2].shareIndex).toBe(3);
    expect(pkg.recoveryCards[0].vaultId).toBe(pkg.vaultId);
    expect(pkg.recoveryCards[1].vaultId).toBe(pkg.vaultId);
    expect(pkg.recoveryCards[2].vaultId).toBe(pkg.vaultId);

    // 2. Owner Unlock Orchestrator: Unlock as owner with passphrase
    const unlockedPayload = await unlockVault({
      passphrase,
      wrappedKeyEnvelope: pkg.wrappedKeyEnvelope,
      payloadEnvelope: pkg.payloadEnvelope,
      vaultId: pkg.vaultId,
    });

    expect(unlockedPayload.vaultId).toBe(pkg.vaultId);
    expect(unlockedPayload.vaultName).toBe('Sharma Estate Continuity Vault');
    expect(unlockedPayload.assets).toHaveLength(3);
    expect(unlockedPayload.assets[0].institutionName).toBe('State Bank of India');
    expect(unlockedPayload.assets[1].institutionName).toBe('HDFC Life Super Income');

    // 3. Nominee Recovery Orchestrator: Recover with any 2 cards
    // Combination A: Cards 1 and 2
    const recoveredWith1and2 = await recoverVault({
      cardA: pkg.recoveryCards[0],
      cardB: pkg.recoveryCards[1],
      payloadEnvelope: pkg.payloadEnvelope,
    });
    expect(recoveredWith1and2.vaultId).toBe(pkg.vaultId);
    expect(recoveredWith1and2.assets).toHaveLength(3);

    // Combination B: Cards 2 and 3
    const recoveredWith2and3 = await recoverVault({
      cardA: pkg.recoveryCards[1],
      cardB: pkg.recoveryCards[2],
      payloadEnvelope: pkg.payloadEnvelope,
    });
    expect(recoveredWith2and3.vaultId).toBe(pkg.vaultId);
    expect(recoveredWith2and3.assets).toHaveLength(3);

    // Combination C: Cards 1 and 3 (using serialized JSON strings as in real web forms)
    const recoveredWith1and3Strings = await recoverVault({
      cardA: pkg.recoveryCardStrings[0],
      cardB: pkg.recoveryCardStrings[2],
      payloadEnvelope: pkg.payloadEnvelope,
      expectedVaultId: pkg.vaultId,
    });
    expect(recoveredWith1and3Strings.vaultId).toBe(pkg.vaultId);
    expect(recoveredWith1and3Strings.assets).toHaveLength(3);
  });

  it('rejects owner unlock when passphrase is wrong', async () => {
    const pkg = await createVaultPackage({
      vaultName: 'Sharma Estate',
      passphrase: 'correct-passphrase',
      assets: sampleAssets,
      kdfOptions: FAST_TEST_SCRYPT_PARAMS,
    });

    await expect(
      unlockVault({
        passphrase: 'wrong-passphrase',
        wrappedKeyEnvelope: pkg.wrappedKeyEnvelope,
        payloadEnvelope: pkg.payloadEnvelope,
        vaultId: pkg.vaultId,
      })
    ).rejects.toThrow(/Key unwrap failed/);
  });

  it('rejects recovery when duplicate cards (same share index) are presented', async () => {
    const pkg = await createVaultPackage({
      vaultName: 'Sharma Estate',
      passphrase: 'correct-passphrase',
      assets: sampleAssets,
      kdfOptions: FAST_TEST_SCRYPT_PARAMS,
    });

    await expect(
      recoverVault({
        cardA: pkg.recoveryCards[0],
        cardB: pkg.recoveryCards[0], // Duplicate Card 1
        payloadEnvelope: pkg.payloadEnvelope,
      })
    ).rejects.toThrow(/Duplicate share index/);
  });

  it('rejects recovery when cards belong to different vaults', async () => {
    const pkgA = await createVaultPackage({
      vaultName: 'Vault A',
      passphrase: 'passphrase-a',
      assets: sampleAssets,
      kdfOptions: FAST_TEST_SCRYPT_PARAMS,
    });

    const pkgB = await createVaultPackage({
      vaultName: 'Vault B',
      passphrase: 'passphrase-b',
      assets: sampleAssets,
      kdfOptions: FAST_TEST_SCRYPT_PARAMS,
    });

    await expect(
      recoverVault({
        cardA: pkgA.recoveryCards[0],
        cardB: pkgB.recoveryCards[1], // Belongs to Vault B
        payloadEnvelope: pkgA.payloadEnvelope,
      })
    ).rejects.toThrow(/Mismatched vault IDs/);
  });

  it('rejects recovery when expected vaultId does not match recovery cards', async () => {
    const pkg = await createVaultPackage({
      vaultName: 'Sharma Estate',
      passphrase: 'correct-passphrase',
      assets: sampleAssets,
      kdfOptions: FAST_TEST_SCRYPT_PARAMS,
    });

    await expect(
      recoverVault({
        cardA: pkg.recoveryCards[0],
        cardB: pkg.recoveryCards[1],
        payloadEnvelope: pkg.payloadEnvelope,
        expectedVaultId: '00000000-0000-4000-8000-000000000000',
      })
    ).rejects.toThrow(/does not match expected vault/);
  });

  it('fails cleanly when encrypted ciphertext is modified or tampered with', async () => {
    const pkg = await createVaultPackage({
      vaultName: 'Sharma Estate',
      passphrase: 'correct-passphrase',
      assets: sampleAssets,
      kdfOptions: FAST_TEST_SCRYPT_PARAMS,
    });

    // Tamper with payload ciphertext
    const tamperedPayload = {
      ...pkg.payloadEnvelope,
      ciphertext: pkg.payloadEnvelope.ciphertext.slice(0, -4) + 'AAAA',
    };

    await expect(
      recoverVault({
        cardA: pkg.recoveryCards[0],
        cardB: pkg.recoveryCards[1],
        payloadEnvelope: tamperedPayload,
      })
    ).rejects.toThrow(/Decryption failed/);
  });
});
