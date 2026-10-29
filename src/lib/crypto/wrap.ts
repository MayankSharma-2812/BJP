import {
  ScryptKdfParams,
  WrappedKeyEnvelope,
  WrappedKeyEnvelopeSchema,
} from '@/types/crypto';
import {
  base64UrlToUint8Array,
  getRandomBytes,
  uint8ArrayToBase64Url,
  utf8Encode,
} from './utils';

const AES_GCM_ALGORITHM = 'AES-GCM';
const WRAP_NONCE_LENGTH = 12;
const KEY_LENGTH_BYTES = 32;
const WRAP_AAD_CONTEXT_PREFIX = 'last-mile:dek-wrap:v1';

export function getWrapAad(vaultId: string): Uint8Array {
  return utf8Encode(`${WRAP_AAD_CONTEXT_PREFIX}:${vaultId}`);
}

/**
 * Wrap a random DEK under the derived KEK using AES-256-GCM.
 * Generates a fresh 12-byte nonce and binds the vaultId into AAD.
 */
export async function wrapDek(
  dek: Uint8Array,
  kek: Uint8Array,
  vaultId: string,
  salt: Uint8Array,
  kdfParams: ScryptKdfParams
): Promise<WrappedKeyEnvelope> {
  if (dek.byteLength !== KEY_LENGTH_BYTES) {
    throw new Error(`DEK must be exactly ${KEY_LENGTH_BYTES} bytes`);
  }
  if (kek.byteLength !== KEY_LENGTH_BYTES) {
    throw new Error(`KEK must be exactly ${KEY_LENGTH_BYTES} bytes`);
  }

  const nonce = getRandomBytes(WRAP_NONCE_LENGTH);
  const aad = getWrapAad(vaultId);

  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    kek as Uint8Array<ArrayBuffer>,
    { name: AES_GCM_ALGORITHM },
    false,
    ['encrypt']
  );

  const wrappedBuffer = await globalThis.crypto.subtle.encrypt(
    {
      name: AES_GCM_ALGORITHM,
      iv: nonce as Uint8Array<ArrayBuffer>,
      additionalData: aad as Uint8Array<ArrayBuffer>,
      tagLength: 128,
    },
    cryptoKey,
    dek as Uint8Array<ArrayBuffer>
  );

  const envelope: WrappedKeyEnvelope = {
    wrapVersion: 1,
    kdf: 'scrypt',
    kdfParams,
    salt: uint8ArrayToBase64Url(salt),
    algorithm: 'AES-256-GCM',
    nonce: uint8ArrayToBase64Url(nonce),
    wrappedDek: uint8ArrayToBase64Url(new Uint8Array(wrappedBuffer)),
  };

  return WrappedKeyEnvelopeSchema.parse(envelope);
}

/**
 * Unwrap a DEK using the derived KEK and AES-256-GCM.
 * Verifies the authentication tag and context-bound AAD.
 */
export async function unwrapDek(
  wrappedEnvelope: WrappedKeyEnvelope,
  kek: Uint8Array,
  expectedVaultId: string
): Promise<Uint8Array> {
  const validEnvelope = WrappedKeyEnvelopeSchema.parse(wrappedEnvelope);

  if (kek.byteLength !== KEY_LENGTH_BYTES) {
    throw new Error(`KEK must be exactly ${KEY_LENGTH_BYTES} bytes`);
  }

  const nonce = base64UrlToUint8Array(validEnvelope.nonce);
  const wrappedDekWithTag = base64UrlToUint8Array(validEnvelope.wrappedDek);
  const aad = getWrapAad(expectedVaultId);

  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    kek as Uint8Array<ArrayBuffer>,
    { name: AES_GCM_ALGORITHM },
    false,
    ['decrypt']
  );

  let decryptedBuffer: ArrayBuffer;
  try {
    decryptedBuffer = await globalThis.crypto.subtle.decrypt(
      {
        name: AES_GCM_ALGORITHM,
        iv: nonce as Uint8Array<ArrayBuffer>,
        additionalData: aad as Uint8Array<ArrayBuffer>,
        tagLength: 128,
      },
      cryptoKey,
      wrappedDekWithTag as Uint8Array<ArrayBuffer>
    );
  } catch {
    throw new Error('Key unwrap failed: invalid passphrase or corrupted key envelope');
  }

  const unwrappedDek = new Uint8Array(decryptedBuffer);
  if (unwrappedDek.byteLength !== KEY_LENGTH_BYTES) {
    throw new Error('Unwrapped key has invalid length');
  }

  return unwrappedDek;
}
