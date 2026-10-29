import {
  EncryptedPayloadEnvelope,
  EncryptedPayloadEnvelopeSchema,
  VaultPayload,
  VaultPayloadSchema,
} from '@/types/crypto';
import {
  base64UrlToUint8Array,
  getRandomBytes,
  uint8ArrayToBase64Url,
  utf8Decode,
  utf8Encode,
} from './utils';

const AES_GCM_ALGORITHM = 'AES-GCM';
const NONCE_LENGTH_BYTES = 12; // 96 bits
const DEK_LENGTH_BYTES = 32; // 256 bits
const AAD_CONTEXT_PREFIX = 'last-mile:vault-payload:v1';

export function getPayloadAad(vaultId: string): Uint8Array {
  return utf8Encode(`${AAD_CONTEXT_PREFIX}:${vaultId}`);
}

/**
 * Generate a cryptographically random 256-bit Data Encryption Key (DEK).
 */
export function generateDek(): Uint8Array {
  return getRandomBytes(DEK_LENGTH_BYTES);
}

/**
 * Encrypt a VaultPayload object using AES-256-GCM and a random 12-byte nonce.
 * Binds the vaultId into Additional Authenticated Data (AAD).
 */
export async function encryptPayload(
  payload: VaultPayload,
  dek: Uint8Array
): Promise<EncryptedPayloadEnvelope> {
  // 1. Validate payload schema
  const validatedPayload = VaultPayloadSchema.parse(payload);

  if (dek.byteLength !== DEK_LENGTH_BYTES) {
    throw new Error(`DEK must be exactly ${DEK_LENGTH_BYTES} bytes (256-bit)`);
  }

  // 2. Generate unique 12-byte nonce
  const nonce = getRandomBytes(NONCE_LENGTH_BYTES);

  // 3. Serialize payload and construct context-bound AAD
  const serialized = utf8Encode(JSON.stringify(validatedPayload));
  const aad = getPayloadAad(validatedPayload.vaultId);

  // 4. Import raw DEK into Web Crypto CryptoKey
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    dek as Uint8Array<ArrayBuffer>,
    { name: AES_GCM_ALGORITHM },
    false, // non-extractable in Web Crypto workspace
    ['encrypt']
  );

  // 5. Encrypt with AES-GCM (appends 128-bit authentication tag automatically)
  const ciphertextBuffer = await globalThis.crypto.subtle.encrypt(
    {
      name: AES_GCM_ALGORITHM,
      iv: nonce as Uint8Array<ArrayBuffer>,
      additionalData: aad as Uint8Array<ArrayBuffer>,
      tagLength: 128,
    },
    cryptoKey,
    serialized as Uint8Array<ArrayBuffer>
  );

  const envelope: EncryptedPayloadEnvelope = {
    schemaVersion: 1,
    cryptoVersion: 1,
    algorithm: 'AES-256-GCM',
    nonce: uint8ArrayToBase64Url(nonce),
    aadVersion: 1,
    ciphertext: uint8ArrayToBase64Url(new Uint8Array(ciphertextBuffer)),
  };

  return EncryptedPayloadEnvelopeSchema.parse(envelope);
}

/**
 * Decrypt an EncryptedPayloadEnvelope using AES-256-GCM and verify AAD.
 * Returns the parsed and validated VaultPayload.
 */
export async function decryptPayload(
  envelope: EncryptedPayloadEnvelope,
  dek: Uint8Array,
  expectedVaultId: string
): Promise<VaultPayload> {
  // 1. Validate envelope structure
  const validEnvelope = EncryptedPayloadEnvelopeSchema.parse(envelope);

  if (dek.byteLength !== DEK_LENGTH_BYTES) {
    throw new Error(`DEK must be exactly ${DEK_LENGTH_BYTES} bytes (256-bit)`);
  }

  const nonce = base64UrlToUint8Array(validEnvelope.nonce);
  if (nonce.byteLength !== NONCE_LENGTH_BYTES) {
    throw new Error(`Invalid nonce length: expected ${NONCE_LENGTH_BYTES} bytes`);
  }

  const ciphertextWithTag = base64UrlToUint8Array(validEnvelope.ciphertext);
  const aad = getPayloadAad(expectedVaultId);

  // 2. Import raw DEK
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    dek as Uint8Array<ArrayBuffer>,
    { name: AES_GCM_ALGORITHM },
    false,
    ['decrypt']
  );

  // 3. Decrypt with AES-GCM (authenticates tag and AAD)
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
      ciphertextWithTag as Uint8Array<ArrayBuffer>
    );
  } catch {
    // Fail safely without leaking cryptographic internals
    throw new Error('Decryption failed: corrupted ciphertext, invalid key, or tampered AAD');
  }

  // 4. Parse UTF-8 JSON and validate schema
  const jsonText = utf8Decode(new Uint8Array(decryptedBuffer));
  const parsedData = JSON.parse(jsonText);

  return VaultPayloadSchema.parse(parsedData);
}
