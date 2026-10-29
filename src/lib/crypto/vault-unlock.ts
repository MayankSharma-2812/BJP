import {
  EncryptedPayloadEnvelope,
  VaultPayload,
  WrappedKeyEnvelope,
} from '@/types/crypto';
import { decryptPayload } from './aes';
import { deriveKek } from './kdf';
import { unwrapDek } from './wrap';
import { base64UrlToUint8Array } from './utils';

export interface UnlockVaultParams {
  passphrase: string;
  wrappedKeyEnvelope: WrappedKeyEnvelope;
  payloadEnvelope: EncryptedPayloadEnvelope;
  vaultId: string;
}

/**
 * High-level client orchestrator to unlock and decrypt a vault as the owner.
 *
 * Steps performed client-side:
 * 1. Extracts salt from wrappedKeyEnvelope and derives KEK via scrypt.
 * 2. Unwraps and authenticates the DEK using AES-256-GCM.
 * 3. Decrypts and authenticates the payload envelope using the DEK.
 * 4. Clears transient plaintext key buffers from memory (best effort).
 * 5. Returns parsed and validated confidential VaultPayload.
 */
export async function unlockVault(
  params: UnlockVaultParams
): Promise<VaultPayload> {
  const salt = base64UrlToUint8Array(params.wrappedKeyEnvelope.salt);

  const { kek } = await deriveKek(
    params.passphrase,
    salt,
    params.wrappedKeyEnvelope.kdfParams
  );

  let dek: Uint8Array | null = null;
  try {
    dek = await unwrapDek(params.wrappedKeyEnvelope, kek, params.vaultId);
    const payload = await decryptPayload(params.payloadEnvelope, dek, params.vaultId);
    return payload;
  } finally {
    kek.fill(0);
    if (dek) {
      dek.fill(0);
    }
  }
}
