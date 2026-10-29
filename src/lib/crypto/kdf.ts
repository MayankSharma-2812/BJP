import { scryptAsync } from '@noble/hashes/scrypt.js';
import { ScryptKdfParams, ScryptKdfParamsSchema } from '@/types/crypto';
import { getRandomBytes, utf8Encode } from './utils';

export const DEFAULT_SCRYPT_PARAMS: ScryptKdfParams = {
  N: 131072, // 2^17
  r: 8,
  p: 1,
  dkLen: 32, // 256-bit KEK
};

export const SALT_LENGTH_BYTES = 16;

/**
 * Generate a cryptographically random 16-byte salt for scrypt KDF.
 */
export function generateKdfSalt(): Uint8Array {
  return getRandomBytes(SALT_LENGTH_BYTES);
}

/**
 * Derive a 256-bit Key Encryption Key (KEK) from a passphrase using scrypt.
 */
export async function deriveKek(
  passphrase: string,
  salt: Uint8Array,
  customParams?: Partial<ScryptKdfParams>
): Promise<{ kek: Uint8Array; params: ScryptKdfParams }> {
  if (!passphrase || passphrase.trim().length === 0) {
    throw new Error('Passphrase cannot be empty');
  }

  if (salt.byteLength < 16) {
    throw new Error('KDF salt must be at least 16 bytes');
  }

  const params = ScryptKdfParamsSchema.parse({
    ...DEFAULT_SCRYPT_PARAMS,
    ...customParams,
  });

  const passphraseBytes = utf8Encode(passphrase);

  // Derive key using audited scrypt implementation from @noble/hashes
  const derivedKey = await scryptAsync(passphraseBytes, salt, {
    N: params.N,
    r: params.r,
    p: params.p,
    dkLen: params.dkLen,
    maxmem: 1024 * 1024 * 256, // 256 MB max memory allocation bound
  });

  return {
    kek: derivedKey,
    params,
  };
}
