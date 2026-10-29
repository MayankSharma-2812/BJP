import { describe, it, expect } from 'vitest';
import {
  EncryptedPayloadEnvelopeSchema,
  WrappedKeyEnvelopeSchema,
  RecoveryCardSchema,
  VaultPayloadSchema,
  VaultStatusSchema,
  AuditEventSchema,
  GENESIS_PREVIOUS_HASH,
} from '../index';

describe('Phase 0 Contracts & Validation Schemas', () => {
  it('validates a correct EncryptedPayloadEnvelope', () => {
    const validEnvelope = {
      schemaVersion: 1,
      cryptoVersion: 1,
      algorithm: 'AES-256-GCM',
      nonce: 'dGVzdG5vbmNlMTIz', // 12-byte base64url
      aadVersion: 1,
      ciphertext: 'Y2lwaGVydGV4dGRhdGE=',
    };
    expect(() => EncryptedPayloadEnvelopeSchema.parse(validEnvelope)).not.toThrow();
  });

  it('rejects an EncryptedPayloadEnvelope with unsupported algorithm or invalid version', () => {
    const invalidEnvelope = {
      schemaVersion: 2,
      cryptoVersion: 1,
      algorithm: 'AES-128-CBC',
      nonce: 'short',
      aadVersion: 1,
      ciphertext: '',
    };
    expect(() => EncryptedPayloadEnvelopeSchema.parse(invalidEnvelope)).toThrow();
  });

  it('validates a correct WrappedKeyEnvelope with scrypt params', () => {
    const validWrapped = {
      wrapVersion: 1,
      kdf: 'scrypt',
      kdfParams: { N: 131072, r: 8, p: 1, dkLen: 32 },
      salt: 'c2FsdHNhbHRzYWx0MTIzNA==',
      algorithm: 'AES-256-GCM',
      nonce: 'd3JhcG5vbmNlMTIz',
      wrappedDek: 'd3JhcHBlZGRla2J5dGVz',
    };
    expect(() => WrappedKeyEnvelopeSchema.parse(validWrapped)).not.toThrow();
  });

  it('rejects unreasonable or dangerous scrypt parameters', () => {
    const dangerousWrapped = {
      wrapVersion: 1,
      kdf: 'scrypt',
      kdfParams: { N: 16, r: 8, p: 1, dkLen: 32 }, // N too low (below 1024)
      salt: 'c2FsdHNhbHRzYWx0MTIzNA==',
      algorithm: 'AES-256-GCM',
      nonce: 'd3JhcG5vbmNlMTIz',
      wrappedDek: 'd3JhcHBlZGRla2J5dGVz',
    };
    expect(() => WrappedKeyEnvelopeSchema.parse(dangerousWrapped)).toThrow();
  });

  it('validates a correct RecoveryCard', () => {
    const validCard = {
      format: 'last-mile-recovery-card',
      formatVersion: 1,
      vaultId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      shareIndex: 2,
      threshold: 2,
      totalShares: 3,
      share: 'c2hhcmVieXRlcw==',
      createdAt: '2026-10-29T12:00:00.000Z',
    };
    expect(() => RecoveryCardSchema.parse(validCard)).not.toThrow();
  });

  it('rejects a RecoveryCard with an invalid share index', () => {
    const invalidCard = {
      format: 'last-mile-recovery-card',
      formatVersion: 1,
      vaultId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      shareIndex: 4, // Only 1, 2, or 3 allowed
      threshold: 2,
      totalShares: 3,
      share: 'c2hhcmVieXRlcw==',
      createdAt: '2026-10-29T12:00:00.000Z',
    };
    expect(() => RecoveryCardSchema.parse(invalidCard)).toThrow();
  });

  it('validates a complete VaultPayload structure', () => {
    const validPayload = {
      schemaVersion: 1,
      vaultId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      vaultName: 'Sharma Family Emergency Vault',
      updatedAt: '2026-10-29T12:00:00.000Z',
      assets: [
        {
          id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
          category: 'insurance_policy',
          institutionName: 'HDFC Life',
          accountReference: 'Policy #TEST-1042',
          estimatedValue: '₹50,00,000',
          beneficiaryDetails: 'Spouse & Child',
          documentLocation: 'Master bedroom steel cabinet folder A',
          claimInstructions: [
            'Locate original physical bond in folder A',
            'Call customer care with policy number',
            'Submit claim form 101',
          ],
        },
      ],
      generalInstructions: 'In emergency, reach out to family CA first.',
    };
    expect(() => VaultPayloadSchema.parse(validPayload)).not.toThrow();
  });

  it('validates canonical AuditEvent schema with genesis hash', () => {
    const validEvent = {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      vaultId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      sequence: 0,
      eventType: 'vault_created',
      actorUserId: 'c9a646d3-9c61-4cd9-bc19-4704257870cb',
      serverTime: '2026-10-29T12:00:00.000Z',
      metadata: { initialStatus: 'ACTIVE', schemaVersion: 1 },
      previousHash: GENESIS_PREVIOUS_HASH,
      eventHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    };
    expect(() => AuditEventSchema.parse(validEvent)).not.toThrow();
  });

  it('validates all lifecycle VaultStatus values', () => {
    const statuses = [
      'ACTIVE',
      'CHECK_IN_DUE',
      'GRACE_PERIOD',
      'RECOVERY_PENDING',
      'COOLING_OFF',
      'RECOVERY_READY',
      'RECOVERED',
      'CANCELLED',
    ];
    for (const status of statuses) {
      expect(VaultStatusSchema.parse(status)).toBe(status);
    }
  });
});
