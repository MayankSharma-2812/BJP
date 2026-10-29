import { z } from 'zod';

// ==========================================
// 1. Encrypted Payload Envelope
// ==========================================

export const EncryptedPayloadEnvelopeSchema = z.object({
  schemaVersion: z.literal(1),
  cryptoVersion: z.literal(1),
  algorithm: z.literal('AES-256-GCM'),
  nonce: z.string().min(12, 'Nonce must be base64url encoded 12 bytes'),
  aadVersion: z.literal(1),
  ciphertext: z.string().min(1, 'Ciphertext cannot be empty'),
});

export type EncryptedPayloadEnvelope = z.infer<typeof EncryptedPayloadEnvelopeSchema>;

// ==========================================
// 2. Wrapped Data Encryption Key (DEK)
// ==========================================

export const ScryptKdfParamsSchema = z.object({
  N: z.number().int().min(1024).max(1048576), // 2^10 to 2^20 bounds
  r: z.number().int().min(1).max(32),
  p: z.number().int().min(1).max(16),
  dkLen: z.literal(32),
});

export type ScryptKdfParams = z.infer<typeof ScryptKdfParamsSchema>;

export const WrappedKeyEnvelopeSchema = z.object({
  wrapVersion: z.literal(1),
  kdf: z.literal('scrypt'),
  kdfParams: ScryptKdfParamsSchema,
  salt: z.string().min(16, 'Salt must be base64url encoded at least 16 bytes'),
  algorithm: z.literal('AES-256-GCM'),
  nonce: z.string().min(12, 'Wrap nonce must be base64url encoded 12 bytes'),
  wrappedDek: z.string().min(1, 'Wrapped DEK cannot be empty'),
});

export type WrappedKeyEnvelope = z.infer<typeof WrappedKeyEnvelopeSchema>;

// ==========================================
// 3. Shamir Recovery Card
// ==========================================

export const RecoveryCardSchema = z.object({
  format: z.literal('last-mile-recovery-card'),
  formatVersion: z.literal(1),
  vaultId: z.string().uuid('Vault ID must be a valid UUID'),
  shareIndex: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  threshold: z.literal(2),
  totalShares: z.literal(3),
  share: z.string().min(1, 'Share content cannot be empty'),
  createdAt: z.string().datetime(),
});

export type RecoveryCard = z.infer<typeof RecoveryCardSchema>;

// ==========================================
// 4. Client-Side Vault Plaintext Structure
// ==========================================

export const AssetCategorySchema = z.enum([
  'bank_account',
  'insurance_policy',
  'investment',
  'property',
  'subscription',
  'document',
  'other',
]);

export type AssetCategory = z.infer<typeof AssetCategorySchema>;

export const AssetEntrySchema = z.object({
  id: z.string().uuid(),
  category: AssetCategorySchema,
  institutionName: z.string().min(1).max(120),
  accountReference: z.string().min(1).max(120), // Policy #, nickname, etc.
  estimatedValue: z.string().max(60).optional(),
  beneficiaryDetails: z.string().max(250).optional(),
  documentLocation: z.string().max(250).optional(),
  claimInstructions: z.array(z.string().max(300)).max(20),
  contactPerson: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(),
});

export type AssetEntry = z.infer<typeof AssetEntrySchema>;

export const VaultPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  vaultId: z.string().uuid(),
  vaultName: z.string().min(1).max(100),
  updatedAt: z.string().datetime(),
  assets: z.array(AssetEntrySchema).max(500),
  generalInstructions: z.string().max(5000).optional(),
});

export type VaultPayload = z.infer<typeof VaultPayloadSchema>;
