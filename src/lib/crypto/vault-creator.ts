import {
  EncryptedPayloadEnvelope,
  RecoveryCard,
  ScryptKdfParams,
  VaultAsset,
  VaultPayload,
  WrappedKeyEnvelope,
} from '@/types/crypto';
import { generateDek, encryptPayload } from './aes';
import { deriveKek, generateKdfSalt } from './kdf';
import { wrapDek } from './wrap';
import { splitDek } from './shamir';
import { encodeRecoveryCard, serializeRecoveryCard } from './recovery-card';

export interface CreateVaultPackageParams {
  vaultId?: string;
  vaultName: string;
  passphrase: string;
  assets?: VaultAsset[];
  kdfOptions?: Partial<ScryptKdfParams>;
}

export interface CreateVaultPackageResult {
  vaultId: string;
  payloadEnvelope: EncryptedPayloadEnvelope;
  wrappedKeyEnvelope: WrappedKeyEnvelope;
  recoveryCards: [RecoveryCard, RecoveryCard, RecoveryCard];
  recoveryCardStrings: [string, string, string];
}

/**
 * High-level client orchestrator to initialize and encrypt a new vault.
 * 
 * Steps performed client-side:
 * 1. Generates 256-bit cryptographically secure DEK.
 * 2. Derives scrypt KEK from owner passphrase.
 * 3. Wraps DEK with KEK (bound to vaultId AAD).
 * 4. Encrypts initial assets payload with DEK (bound to vaultId AAD).
 * 5. Splits DEK into 3 Shamir shares (2-of-3 threshold).
 * 6. Encodes and serializes 3 versioned Recovery Cards.
 * 7. Clears sensitive raw key buffers from memory (best effort).
 */
export async function createVaultPackage(
  params: CreateVaultPackageParams
): Promise<CreateVaultPackageResult> {
  const vaultId = params.vaultId || globalThis.crypto.randomUUID();
  const dek = generateDek();
  const salt = generateKdfSalt();

  try {
    // 1. Derive KEK and wrap DEK
    const { kek, params: kdfParams } = await deriveKek(
      params.passphrase,
      salt,
      params.kdfOptions
    );

    let wrappedKeyEnvelope: WrappedKeyEnvelope;
    try {
      wrappedKeyEnvelope = await wrapDek(dek, kek, vaultId, salt, kdfParams);
    } finally {
      kek.fill(0);
    }

    // 2. Encrypt asset payload
    const payload: VaultPayload = {
      schemaVersion: 1,
      vaultId,
      vaultName: params.vaultName,
      updatedAt: new Date().toISOString(),
      assets: params.assets || [],
    };

    const payloadEnvelope = await encryptPayload(payload, dek);

    // 3. Split DEK with 2-of-3 Shamir Secret Sharing
    const rawShares = await splitDek(dek);

    // 4. Encode and serialize 3 Recovery Cards
    const card1 = encodeRecoveryCard(vaultId, 1, rawShares[0]);
    const card2 = encodeRecoveryCard(vaultId, 2, rawShares[1]);
    const card3 = encodeRecoveryCard(vaultId, 3, rawShares[2]);

    const str1 = serializeRecoveryCard(card1);
    const str2 = serializeRecoveryCard(card2);
    const str3 = serializeRecoveryCard(card3);

    // Clear raw share buffers
    for (const share of rawShares) {
      share.fill(0);
    }

    return {
      vaultId,
      payloadEnvelope,
      wrappedKeyEnvelope,
      recoveryCards: [card1, card2, card3],
      recoveryCardStrings: [str1, str2, str3],
    };
  } finally {
    // Zero out raw DEK
    dek.fill(0);
    salt.fill(0);
  }
}
