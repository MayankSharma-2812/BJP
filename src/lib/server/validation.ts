// Server-side validation rules & security guards
// References: docs/05_BACKEND_SCHEMA.md, docs/06_API_CONTRACT.md, docs/07_SECURITY_THREAT_MODEL.md

import type { CreateVaultRequest, SetNomineesRequest, UpdateEnvelopeRequest } from '@/types/api';

const FORBIDDEN_SECRET_KEYS = new Set([
  'plaintext',
  'plaintextasset',
  'assets',
  'items',
  'rawkey',
  'rawdek',
  'rawkek',
  'share',
  'shares',
  'passphrase',
  'password',
  'pin',
  'secretkey',
  'privatekey',
  'recoverycard',
]);

const BASE64URL_REGEX = /^[A-Za-z0-9_-]+$/;
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const MAX_PAYLOAD_SIZE = 1048576; // 1 MB

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Recursively inspect an object to verify that no plaintext asset fields
 * or secret key material are being transmitted.
 */
export function assertZeroPlaintext(data: unknown): void {
  if (!data || typeof data !== 'object') return;

  if (Array.isArray(data)) {
    for (const item of data) {
      assertZeroPlaintext(item);
    }
    return;
  }

  for (const [key, value] of Object.entries(data)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (FORBIDDEN_SECRET_KEYS.has(normalizedKey)) {
      throw new ValidationError(`Forbidden field detected: "${key}". Plaintext secrets and shares must never be transmitted.`);
    }
    assertZeroPlaintext(value);
  }
}

export function validateBase64Url(value: unknown, fieldName: string, minLen = 16, maxLen = 4096): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`Field "${fieldName}" must be a string.`);
  }
  const trimmed = value.trim();
  if (trimmed.length < minLen || trimmed.length > maxLen) {
    throw new ValidationError(`Field "${fieldName}" length must be between ${minLen} and ${maxLen} characters.`);
  }
  if (!BASE64URL_REGEX.test(trimmed)) {
    throw new ValidationError(`Field "${fieldName}" must be valid base64url encoded string.`);
  }
  return trimmed;
}

export function validateCreateVaultRequest(body: unknown): CreateVaultRequest {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a valid JSON object.');
  }

  assertZeroPlaintext(body);
  const data = body as Partial<CreateVaultRequest>;

  let id: string | undefined;
  if (data.id !== undefined) {
    if (typeof data.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id)) {
      throw new ValidationError('Invalid vault id format.');
    }
    id = data.id;
  }

  if (typeof data.schemaVersion !== 'number' || data.schemaVersion <= 0) {
    throw new ValidationError('Invalid or missing schemaVersion.');
  }
  if (typeof data.cryptoVersion !== 'number' || data.cryptoVersion <= 0) {
    throw new ValidationError('Invalid or missing cryptoVersion.');
  }

  const payloadCiphertext = validateBase64Url(data.payloadCiphertext, 'payloadCiphertext', 1, MAX_PAYLOAD_SIZE);
  const payloadNonce = validateBase64Url(data.payloadNonce, 'payloadNonce', 16, 24);
  const wrappedDek = validateBase64Url(data.wrappedDek, 'wrappedDek', 16, 4096);
  const wrapNonce = validateBase64Url(data.wrapNonce, 'wrapNonce', 16, 24);
  const kdfSalt = validateBase64Url(data.kdfSalt, 'kdfSalt', 16, 128);

  // Nonce reuse guard (ADR-002, TRD Section 3)
  if (payloadNonce === wrapNonce) {
    throw new ValidationError('wrapNonce must not equal payloadNonce.');
  }

  if (typeof data.payloadAadVersion !== 'number' || data.payloadAadVersion <= 0) {
    throw new ValidationError('Invalid or missing payloadAadVersion.');
  }

  if (data.kdfName !== 'scrypt') {
    throw new ValidationError('Only "scrypt" KDF is supported.');
  }

  const params = data.kdfParams;
  if (!params || typeof params !== 'object') {
    throw new ValidationError('kdfParams must be provided.');
  }
  if (typeof params.N !== 'number' || params.N < 16384 || params.N > 262144) {
    throw new ValidationError('kdfParams.N must be between 16,384 and 262,144.');
  }
  if (typeof params.r !== 'number' || params.r < 1 || params.r > 32) {
    throw new ValidationError('kdfParams.r must be between 1 and 32.');
  }
  if (typeof params.p !== 'number' || params.p < 1 || params.p > 32) {
    throw new ValidationError('kdfParams.p must be between 1 and 32.');
  }
  if (params.dkLen !== 32) {
    throw new ValidationError('kdfParams.dkLen must be 32 bytes.');
  }

  const interval = data.checkinIntervalSeconds;
  if (typeof interval !== 'number' || interval < 10) {
    throw new ValidationError('checkinIntervalSeconds must be at least 10 seconds.');
  }

  return {
    ...(id ? { id } : {}),
    schemaVersion: data.schemaVersion,
    cryptoVersion: data.cryptoVersion,
    payloadCiphertext,
    payloadNonce,
    payloadAadVersion: data.payloadAadVersion,
    wrappedDek,
    wrapNonce,
    kdfName: 'scrypt',
    kdfParams: {
      N: params.N,
      r: params.r,
      p: params.p,
      dkLen: 32,
    },
    kdfSalt,
    checkinIntervalSeconds: interval,
  };
}

export function validateUpdateEnvelopeRequest(body: unknown): UpdateEnvelopeRequest {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a valid JSON object.');
  }

  assertZeroPlaintext(body);
  const data = body as Partial<UpdateEnvelopeRequest>;

  if (typeof data.expectedRevision !== 'number' || data.expectedRevision < 1) {
    throw new ValidationError('Invalid or missing expectedRevision.');
  }

  const payloadCiphertext = validateBase64Url(data.payloadCiphertext, 'payloadCiphertext', 1, MAX_PAYLOAD_SIZE);
  const payloadNonce = validateBase64Url(data.payloadNonce, 'payloadNonce', 16, 24);

  if (typeof data.payloadAadVersion !== 'number' || data.payloadAadVersion <= 0) {
    throw new ValidationError('Invalid or missing payloadAadVersion.');
  }

  let wrappedDek: string | undefined;
  let wrapNonce: string | undefined;

  if (data.wrappedDek !== undefined) {
    wrappedDek = validateBase64Url(data.wrappedDek, 'wrappedDek', 16, 4096);
  }
  if (data.wrapNonce !== undefined) {
    wrapNonce = validateBase64Url(data.wrapNonce, 'wrapNonce', 16, 24);
  }

  if (wrapNonce && payloadNonce && wrapNonce === payloadNonce) {
    throw new ValidationError('wrapNonce must not equal payloadNonce.');
  }

  return {
    expectedRevision: data.expectedRevision,
    payloadCiphertext,
    payloadNonce,
    payloadAadVersion: data.payloadAadVersion,
    wrappedDek,
    wrapNonce,
  };
}

export function validateSetNomineesRequest(body: unknown): SetNomineesRequest {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a valid JSON object.');
  }

  assertZeroPlaintext(body);
  const data = body as Partial<SetNomineesRequest>;

  if (!Array.isArray(data.nominees) || data.nominees.length !== 3) {
    throw new ValidationError('Exactly 3 nominees must be provided for the 2-of-3 recovery policy.');
  }

  const seenEmails = new Set<string>();
  const seenIndices = new Set<number>();

  const validatedNominees = data.nominees.map((n, idx) => {
    if (!n || typeof n !== 'object') {
      throw new ValidationError(`Nominee at index ${idx} is invalid.`);
    }

    const email = typeof n.email === 'string' ? n.email.trim().toLowerCase() : '';
    if (!EMAIL_REGEX.test(email)) {
      throw new ValidationError(`Nominee at index ${idx} has invalid email address.`);
    }
    if (seenEmails.has(email)) {
      throw new ValidationError(`Duplicate nominee email: "${email}". Nominees must have distinct email addresses.`);
    }
    seenEmails.add(email);

    const displayName = typeof n.displayName === 'string' ? n.displayName.trim() : '';
    if (!displayName || displayName.length > 100) {
      throw new ValidationError(`Nominee at index ${idx} must have displayName between 1 and 100 characters.`);
    }

    const shareIndex = n.shareIndex;
    if (shareIndex !== 1 && shareIndex !== 2 && shareIndex !== 3) {
      throw new ValidationError(`Nominee at index ${idx} must have shareIndex 1, 2, or 3.`);
    }
    if (seenIndices.has(shareIndex)) {
      throw new ValidationError(`Duplicate shareIndex: ${shareIndex}. Indices 1, 2, and 3 must each be assigned once.`);
    }
    seenIndices.add(shareIndex);

    return {
      email,
      displayName,
      shareIndex: shareIndex as 1 | 2 | 3,
    };
  });

  return { nominees: validatedNominees };
}
