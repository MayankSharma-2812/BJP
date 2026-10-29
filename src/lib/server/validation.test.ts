// Tests for server validation rules & zero-plaintext security guards
import { describe, expect, it } from 'vitest';
import {
  assertZeroPlaintext,
  validateCreateVaultRequest,
  validateSetNomineesRequest,
  validateUpdateEnvelopeRequest,
  ValidationError,
} from './validation';

describe('Server Validation & Zero-Plaintext Security Guards', () => {
  const validVaultPayload = {
    schemaVersion: 1,
    cryptoVersion: 1,
    payloadCiphertext: 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eg',
    payloadNonce: 'MDEyMzQ1Njc4OTAx',
    payloadAadVersion: 1,
    wrappedDek: 'd3JhcHBlZERla0NpcGhlcnRleHRXaXRoVGFn',
    wrapNonce: 'OTg3NjU0MzIxMDk4',
    kdfName: 'scrypt',
    kdfParams: { N: 131072, r: 8, p: 1, dkLen: 32 },
    kdfSalt: 'cmFuZG9tU2FsdDE2Qnl0ZXM',
    checkinIntervalSeconds: 86400,
  };

  it('accepts a valid create vault request envelope', () => {
    const validated = validateCreateVaultRequest(validVaultPayload);
    expect(validated.schemaVersion).toBe(1);
    expect(validated.kdfName).toBe('scrypt');
    expect(validated.checkinIntervalSeconds).toBe(86400);
  });

  it('strictly rejects any forbidden plaintext keys (zero-plaintext guard)', () => {
    const forbiddenKeys = [
      'plaintext',
      'plaintextAsset',
      'rawKey',
      'rawDek',
      'share',
      'shares',
      'passphrase',
      'password',
      'pin',
      'secretKey',
    ];

    for (const key of forbiddenKeys) {
      const hostilePayload = {
        ...validVaultPayload,
        [key]: 'forbidden_sensitive_data',
      };
      expect(() => validateCreateVaultRequest(hostilePayload)).toThrow(ValidationError);
      expect(() => assertZeroPlaintext(hostilePayload)).toThrow(ValidationError);
    }
  });

  it('rejects nonce reuse between payloadNonce and wrapNonce', () => {
    const reusedNoncePayload = {
      ...validVaultPayload,
      wrapNonce: validVaultPayload.payloadNonce, // Illegal reuse
    };
    expect(() => validateCreateVaultRequest(reusedNoncePayload)).toThrow(
      'wrapNonce must not equal payloadNonce'
    );
  });

  it('rejects unsupported KDF or out-of-bounds KDF parameters', () => {
    expect(() =>
      validateCreateVaultRequest({
        ...validVaultPayload,
        kdfName: 'argon2id', // Only scrypt allowed in MVP
      })
    ).toThrow('Only "scrypt" KDF is supported');

    expect(() =>
      validateCreateVaultRequest({
        ...validVaultPayload,
        kdfParams: { N: 1024, r: 8, p: 1, dkLen: 32 }, // N too low (< 16384)
      })
    ).toThrow('kdfParams.N must be between');

    expect(() =>
      validateCreateVaultRequest({
        ...validVaultPayload,
        kdfParams: { N: 131072, r: 8, p: 1, dkLen: 64 }, // dkLen must be 32
      })
    ).toThrow('kdfParams.dkLen must be 32 bytes');
  });

  it('validates envelope update requests and checks revision', () => {
    const validUpdate = {
      expectedRevision: 1,
      payloadCiphertext: 'bmV3Q2lwaGVydGV4dERhdGE',
      payloadNonce: 'bmV3Tm9uY2UxMkJ5dGVz',
      payloadAadVersion: 1,
    };
    const validated = validateUpdateEnvelopeRequest(validUpdate);
    expect(validated.expectedRevision).toBe(1);

    expect(() =>
      validateUpdateEnvelopeRequest({
        ...validUpdate,
        expectedRevision: 0,
      })
    ).toThrow('Invalid or missing expectedRevision');
  });

  it('validates nominee roster: enforces exactly 3 distinct nominees with unique indices and emails', () => {
    const validNominees = {
      nominees: [
        { email: 'nominee1@example.com', displayName: 'Nominee One', shareIndex: 1 },
        { email: 'nominee2@example.com', displayName: 'Nominee Two', shareIndex: 2 },
        { email: 'nominee3@example.com', displayName: 'Nominee Three', shareIndex: 3 },
      ],
    };
    const validated = validateSetNomineesRequest(validNominees);
    expect(validated.nominees).toHaveLength(3);

    // Fewer than 3 nominees
    expect(() =>
      validateSetNomineesRequest({
        nominees: validNominees.nominees.slice(0, 2),
      })
    ).toThrow('Exactly 3 nominees must be provided');

    // Duplicate share index
    expect(() =>
      validateSetNomineesRequest({
        nominees: [
          { email: 'nominee1@example.com', displayName: 'One', shareIndex: 1 },
          { email: 'nominee2@example.com', displayName: 'Two', shareIndex: 1 }, // Duplicate 1
          { email: 'nominee3@example.com', displayName: 'Three', shareIndex: 3 },
        ],
      })
    ).toThrow('Duplicate shareIndex');

    // Duplicate email
    expect(() =>
      validateSetNomineesRequest({
        nominees: [
          { email: 'same@example.com', displayName: 'One', shareIndex: 1 },
          { email: 'same@example.com', displayName: 'Two', shareIndex: 2 }, // Duplicate email
          { email: 'nominee3@example.com', displayName: 'Three', shareIndex: 3 },
        ],
      })
    ).toThrow('Duplicate nominee email');
  });
});
