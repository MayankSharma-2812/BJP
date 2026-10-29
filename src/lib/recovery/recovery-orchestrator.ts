import {
  EncryptedPayloadEnvelope,
  RecoveryCard,
  VaultPayload,
} from '@/types/crypto';
import {
  base64UrlToUint8Array,
  combineShares,
  decryptPayload,
  parseRecoveryCard,
} from '@/lib/crypto';

export interface RecoverVaultParams {
  cardA: string | RecoveryCard;
  cardB: string | RecoveryCard;
  payloadEnvelope: EncryptedPayloadEnvelope;
  expectedVaultId?: string;
}

/**
 * High-level client orchestrator to recover confidential vault inventory
 * offline using any 2 distinct nominee Recovery Cards.
 *
 * Steps performed client-side:
 * 1. Parses and validates both Recovery Cards.
 * 2. Enforces cross-card consistency (matching vaultId, distinct share indices).
 * 3. Combines 2 Shamir shares to reconstruct the 256-bit DEK.
 * 4. Decrypts and authenticates ciphertext payload using AES-256-GCM.
 * 5. Clears transient key and share buffers from memory (best effort).
 * 6. Returns confidential VaultPayload.
 */
export async function recoverVault(
  params: RecoverVaultParams
): Promise<VaultPayload> {
  const parsedA: RecoveryCard =
    typeof params.cardA === 'string'
      ? parseRecoveryCard(params.cardA)
      : params.cardA;

  const parsedB: RecoveryCard =
    typeof params.cardB === 'string'
      ? parseRecoveryCard(params.cardB)
      : params.cardB;

  if (parsedA.vaultId !== parsedB.vaultId) {
    throw new Error(
      `Mismatched vault IDs: Card A (${parsedA.vaultId}) does not match Card B (${parsedB.vaultId})`
    );
  }

  if (params.expectedVaultId && parsedA.vaultId !== params.expectedVaultId) {
    throw new Error(
      `Recovery cards vault ID (${parsedA.vaultId}) does not match expected vault (${params.expectedVaultId})`
    );
  }

  if (parsedA.shareIndex === parsedB.shareIndex) {
    throw new Error(
      `Duplicate share index (${parsedA.shareIndex}): recovery requires two distinct shares`
    );
  }

  const shareA = base64UrlToUint8Array(parsedA.share);
  const shareB = base64UrlToUint8Array(parsedB.share);

  let reconstructedDek: Uint8Array | null = null;
  try {
    reconstructedDek = await combineShares([shareA, shareB]);
    const payload = await decryptPayload(
      params.payloadEnvelope,
      reconstructedDek,
      parsedA.vaultId
    );
    return payload;
  } finally {
    shareA.fill(0);
    shareB.fill(0);
    if (reconstructedDek) {
      reconstructedDek.fill(0);
    }
  }
}
