import { RecoveryCard, RecoveryCardSchema } from '@/types/crypto';
import { base64UrlToUint8Array, uint8ArrayToBase64Url } from './utils';

/**
 * Encode a raw share into a versioned RecoveryCard object.
 */
export function encodeRecoveryCard(
  vaultId: string,
  shareIndex: 1 | 2 | 3,
  shareBytes: Uint8Array,
  createdAt?: string
): RecoveryCard {
  if (shareBytes.byteLength === 0) {
    throw new Error('Share bytes cannot be empty');
  }

  const card: RecoveryCard = {
    format: 'last-mile-recovery-card',
    formatVersion: 1,
    vaultId,
    shareIndex,
    threshold: 2,
    totalShares: 3,
    share: uint8ArrayToBase64Url(shareBytes),
    createdAt: createdAt || new Date().toISOString(),
  };

  return RecoveryCardSchema.parse(card);
}

/**
 * Format a RecoveryCard as a printable / downloadable JSON string.
 */
export function serializeRecoveryCard(card: RecoveryCard): string {
  const validated = RecoveryCardSchema.parse(card);
  return JSON.stringify(validated, null, 2);
}

/**
 * Parse and validate a RecoveryCard from a raw string or JSON object.
 */
export function parseRecoveryCard(input: string | unknown): RecoveryCard {
  let parsed: unknown;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input.trim());
    } catch {
      throw new Error('Malformed recovery card: invalid JSON format');
    }
  } else {
    parsed = input;
  }

  try {
    return RecoveryCardSchema.parse(parsed);
  } catch {
    throw new Error('Invalid recovery card schema: incorrect format or missing fields');
  }
}

/**
 * Validate that two Recovery Cards belong to the same vault and possess distinct share indices.
 * Rejects duplicate cards (e.g. card 1 and card 1) or cross-vault cards.
 */
export function validateRecoveryCardPair(
  cardA: RecoveryCard,
  cardB: RecoveryCard
): { shareA: Uint8Array; shareB: Uint8Array } {
  const validA = RecoveryCardSchema.parse(cardA);
  const validB = RecoveryCardSchema.parse(cardB);

  // 1. Vault ID matching
  if (validA.vaultId !== validB.vaultId) {
    throw new Error(
      `Recovery cards belong to different vaults: ${validA.vaultId} vs ${validB.vaultId}`
    );
  }

  // 2. Distinct share indices (must NOT be the same share presented twice)
  if (validA.shareIndex === validB.shareIndex) {
    throw new Error(
      `Duplicate recovery share presented: both cards are share #${validA.shareIndex}. Two distinct shares are required.`
    );
  }

  // 3. Decode base64url share bytes
  const shareA = base64UrlToUint8Array(validA.share);
  const shareB = base64UrlToUint8Array(validB.share);

  if (shareA.byteLength === 0 || shareB.byteLength === 0) {
    throw new Error('Recovery card contains empty share bytes');
  }

  return { shareA, shareB };
}
