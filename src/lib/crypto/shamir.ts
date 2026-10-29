import { split, combine } from 'shamir-secret-sharing';

export const TOTAL_SHARES = 3;
export const THRESHOLD_SHARES = 2;
const EXPECTED_DEK_LENGTH = 32;

/**
 * Split a 256-bit (32-byte) Data Encryption Key (DEK) into 3 shares with a threshold of 2.
 */
export async function splitDek(dek: Uint8Array): Promise<Uint8Array[]> {
  if (dek.byteLength !== EXPECTED_DEK_LENGTH) {
    throw new Error(`DEK to split must be exactly ${EXPECTED_DEK_LENGTH} bytes`);
  }

  // Uses audited Privy shamir-secret-sharing package
  const shares = await split(dek, TOTAL_SHARES, THRESHOLD_SHARES);

  if (shares.length !== TOTAL_SHARES) {
    throw new Error(`Shamir split failed to produce ${TOTAL_SHARES} shares`);
  }

  return shares;
}

/**
 * Combine 2 or more shares to reconstruct the original 32-byte DEK.
 * Does not perform cryptographic authentication by itself — caller must
 * verify the reconstructed key by attempting AES-GCM decryption.
 */
export async function combineShares(shares: Uint8Array[]): Promise<Uint8Array> {
  if (!Array.isArray(shares) || shares.length < THRESHOLD_SHARES) {
    throw new Error(`At least ${THRESHOLD_SHARES} shares are required for key reconstruction`);
  }

  if (shares.length > TOTAL_SHARES) {
    throw new Error(`Cannot combine more than ${TOTAL_SHARES} shares`);
  }

  for (const share of shares) {
    if (!share || !(share instanceof Uint8Array) || share.byteLength === 0) {
      throw new Error('Each share must be a non-empty Uint8Array');
    }
  }

  try {
    const reconstructed = await combine(shares);
    return reconstructed;
  } catch {
    throw new Error('Shamir share reconstruction failed: corrupted or incompatible shares');
  }
}
