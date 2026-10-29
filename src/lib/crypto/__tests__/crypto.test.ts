import { describe, it, expect } from 'vitest';
import {
  generateDek,
  encryptPayload,
  decryptPayload,
  deriveKek,
  generateKdfSalt,
  wrapDek,
  unwrapDek,
  splitDek,
  combineShares,
  encodeRecoveryCard,
  parseRecoveryCard,
  validateRecoveryCardPair,
  serializeRecoveryCard,
  wipeBuffer,
} from '../index';
import { VaultPayload } from '@/types/crypto';

// Fast scrypt test parameters for rapid test execution while retaining memory-hard checks
const TEST_SCRYPT_PARAMS = {
  N: 2048,
  r: 8,
  p: 1,
  dkLen: 32 as const,
};

const MOCK_VAULT_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const MOCK_VAULT_ID_B = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

const MOCK_PAYLOAD: VaultPayload = {
  schemaVersion: 1,
  vaultId: MOCK_VAULT_ID,
  vaultName: 'Sharma Continuity Vault',
  updatedAt: '2026-10-29T14:30:00.000Z',
  assets: [
    {
      id: 'd9b2d63d-a233-4123-8478-83141f02c632',
      category: 'bank_account',
      institutionName: 'HDFC Bank',
      accountReference: 'Savings **4012',
      estimatedValue: '₹8,50,000',
      documentLocation: 'Master safe locker',
      claimInstructions: ['Contact branch manager with death cert and nominee form'],
    },
    {
      id: 'e1234567-e89b-12d3-a456-426614174000',
      category: 'insurance_policy',
      institutionName: 'LIC India',
      accountReference: 'Policy #LIC-998811',
      estimatedValue: '₹1,00,00,000',
      documentLocation: 'Desk drawer file 2',
      claimInstructions: ['Submit Form 3783', 'Original policy document in folder'],
    },
  ],
  generalInstructions: 'Emergency contact is advocate Verma.',
};

describe('Workstream A1: Browser-Side Cryptography Module', () => {
  describe('AES-256-GCM Payload Encryption & Decryption', () => {
    it('generates a random 256-bit DEK with non-constant bytes', () => {
      const dek1 = generateDek();
      const dek2 = generateDek();

      expect(dek1.byteLength).toBe(32);
      expect(dek2.byteLength).toBe(32);
      expect(dek1).not.toEqual(dek2);
    });

    it('encrypts and decrypts a VaultPayload round-trip preserving full fidelity', async () => {
      const dek = generateDek();
      const envelope = await encryptPayload(MOCK_PAYLOAD, dek);

      expect(envelope.algorithm).toBe('AES-256-GCM');
      expect(envelope.schemaVersion).toBe(1);
      expect(envelope.cryptoVersion).toBe(1);
      expect(envelope.nonce).toBeDefined();
      expect(envelope.ciphertext).toBeDefined();

      const decrypted = await decryptPayload(envelope, dek, MOCK_VAULT_ID);
      expect(decrypted).toEqual(MOCK_PAYLOAD);
    });

    it('fails decryption when ciphertext is tampered with (auth tag mismatch)', async () => {
      const dek = generateDek();
      const envelope = await encryptPayload(MOCK_PAYLOAD, dek);

      // Tamper with the ciphertext string
      const tamperedCiphertext =
        envelope.ciphertext.substring(0, envelope.ciphertext.length - 2) + 'AA';
      const tamperedEnvelope = { ...envelope, ciphertext: tamperedCiphertext };

      await expect(
        decryptPayload(tamperedEnvelope, dek, MOCK_VAULT_ID)
      ).rejects.toThrow(/Decryption failed/i);
    });

    it('fails decryption when wrong DEK is provided', async () => {
      const dek1 = generateDek();
      const wrongDek = generateDek();
      const envelope = await encryptPayload(MOCK_PAYLOAD, dek1);

      await expect(
        decryptPayload(envelope, wrongDek, MOCK_VAULT_ID)
      ).rejects.toThrow(/Decryption failed/i);
    });

    it('fails decryption if context-bound AAD (vaultId) does not match', async () => {
      const dek = generateDek();
      const envelope = await encryptPayload(MOCK_PAYLOAD, dek);

      await expect(
        decryptPayload(envelope, dek, MOCK_VAULT_ID_B)
      ).rejects.toThrow(/Decryption failed/i);
    });
  });

  describe('scrypt KDF & Passphrase DEK Wrapping', () => {
    it('derives a 32-byte KEK and wraps/unwraps a DEK with correct passphrase', async () => {
      const passphrase = 'correct horse battery staple 2026!';
      const salt = generateKdfSalt();
      const { kek, params } = await deriveKek(passphrase, salt, TEST_SCRYPT_PARAMS);
      expect(kek.byteLength).toBe(32);

      const originalDek = generateDek();
      const wrappedEnvelope = await wrapDek(
        originalDek,
        kek,
        MOCK_VAULT_ID,
        salt,
        params
      );

      expect(wrappedEnvelope.kdf).toBe('scrypt');
      expect(wrappedEnvelope.wrappedDek).toBeDefined();
      expect(wrappedEnvelope.salt).toBeDefined();

      // Unwrap with same KEK
      const unwrappedDek = await unwrapDek(wrappedEnvelope, kek, MOCK_VAULT_ID);
      expect(unwrappedDek).toEqual(originalDek);
    });

    it('fails unwrapping when wrong passphrase derived KEK is used', async () => {
      const salt = generateKdfSalt();
      const { kek: correctKek, params } = await deriveKek('strong-passphrase-1', salt, TEST_SCRYPT_PARAMS);
      const { kek: wrongKek } = await deriveKek('wrong-passphrase-2', salt, TEST_SCRYPT_PARAMS);

      const originalDek = generateDek();
      const wrappedEnvelope = await wrapDek(
        originalDek,
        correctKek,
        MOCK_VAULT_ID,
        salt,
        params
      );

      await expect(
        unwrapDek(wrappedEnvelope, wrongKek, MOCK_VAULT_ID)
      ).rejects.toThrow(/Key unwrap failed/i);
    });

    it('fails unwrapping if wrap AAD (vaultId) does not match', async () => {
      const salt = generateKdfSalt();
      const { kek, params } = await deriveKek('my-passphrase', salt, TEST_SCRYPT_PARAMS);
      const originalDek = generateDek();

      const wrappedEnvelope = await wrapDek(
        originalDek,
        kek,
        MOCK_VAULT_ID,
        salt,
        params
      );

      await expect(
        unwrapDek(wrappedEnvelope, kek, MOCK_VAULT_ID_B)
      ).rejects.toThrow(/Key unwrap failed/i);
    });
  });

  describe('2-of-3 Shamir Secret Sharing', () => {
    it('splits a 32-byte DEK into exactly 3 shares', async () => {
      const dek = generateDek();
      const shares = await splitDek(dek);

      expect(shares).toHaveLength(3);
      shares.forEach((share) => {
        expect(share.byteLength).toBeGreaterThan(0);
      });
    });

    it('reconstructs the exact DEK with any pair of shares: (0,1), (0,2), (1,2)', async () => {
      const dek = generateDek();
      const [share1, share2, share3] = await splitDek(dek);

      // Pair 1 & 2
      const combined12 = await combineShares([share1, share2]);
      expect(combined12).toEqual(dek);

      // Pair 1 & 3
      const combined13 = await combineShares([share1, share3]);
      expect(combined13).toEqual(dek);

      // Pair 2 & 3
      const combined23 = await combineShares([share2, share3]);
      expect(combined23).toEqual(dek);
    });

    it('fails reconstruction with only 1 share (threshold is 2)', async () => {
      const dek = generateDek();
      const [share1] = await splitDek(dek);

      await expect(combineShares([share1])).rejects.toThrow(/At least 2 shares are required/i);
    });

    it('fails decryption if a corrupted share is used to reconstruct the DEK', async () => {
      const dek = generateDek();
      const envelope = await encryptPayload(MOCK_PAYLOAD, dek);
      const [share1, share2] = await splitDek(dek);

      // Corrupt share2 by flipping bytes
      const corruptedShare2 = new Uint8Array(share2);
      corruptedShare2[5] ^= 0xff;

      let badDek: Uint8Array | null = null;
      try {
        badDek = await combineShares([share1, corruptedShare2]);
      } catch {
        // combineShares itself may fail or throw
      }

      if (badDek) {
        // If combine returned pseudo bytes, AES-GCM must reject it
        await expect(
          decryptPayload(envelope, badDek, MOCK_VAULT_ID)
        ).rejects.toThrow(/Decryption failed/i);
      }
    });
  });

  describe('Recovery Cards Serialization & Validation', () => {
    it('encodes, serializes and parses recovery cards correctly', async () => {
      const dek = generateDek();
      const [share1] = await splitDek(dek);

      const card = encodeRecoveryCard(MOCK_VAULT_ID, 1, share1);
      expect(card.format).toBe('last-mile-recovery-card');
      expect(card.shareIndex).toBe(1);
      expect(card.threshold).toBe(2);

      const jsonStr = serializeRecoveryCard(card);
      const parsedCard = parseRecoveryCard(jsonStr);
      expect(parsedCard).toEqual(card);
    });

    it('validates a pair of distinct recovery cards from the same vault', async () => {
      const dek = generateDek();
      const [share1, share2] = await splitDek(dek);

      const card1 = encodeRecoveryCard(MOCK_VAULT_ID, 1, share1);
      const card2 = encodeRecoveryCard(MOCK_VAULT_ID, 2, share2);

      const { shareA, shareB } = validateRecoveryCardPair(card1, card2);
      expect(shareA).toEqual(share1);
      expect(shareB).toEqual(share2);

      // Confirm they reconstruct the original DEK
      const reconstructed = await combineShares([shareA, shareB]);
      expect(reconstructed).toEqual(dek);
    });

    it('strictly rejects duplicate recovery cards (e.g. card 1 presented twice)', async () => {
      const dek = generateDek();
      const [share1] = await splitDek(dek);

      const card1 = encodeRecoveryCard(MOCK_VAULT_ID, 1, share1);
      const card1Duplicate = encodeRecoveryCard(MOCK_VAULT_ID, 1, share1);

      expect(() => validateRecoveryCardPair(card1, card1Duplicate)).toThrow(
        /Duplicate recovery share presented/i
      );
    });

    it('strictly rejects recovery cards from different vaults', async () => {
      const dek = generateDek();
      const [share1, share2] = await splitDek(dek);

      const card1 = encodeRecoveryCard(MOCK_VAULT_ID, 1, share1);
      const card2DifferentVault = encodeRecoveryCard(MOCK_VAULT_ID_B, 2, share2);

      expect(() => validateRecoveryCardPair(card1, card2DifferentVault)).toThrow(
        /Recovery cards belong to different vaults/i
      );
    });

    it('wipes buffer cleanly in memory', () => {
      const buf = new Uint8Array([1, 2, 3, 4, 5]);
      wipeBuffer(buf);
      expect(buf.every((b) => b === 0)).toBe(true);
    });
  });
});
