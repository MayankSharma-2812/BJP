import { z } from 'zod';
import { EncryptedPayloadEnvelopeSchema } from './crypto';

// ==========================================
// 1. Vault Lifecycle & Workflow States
// ==========================================

export const VaultStatusSchema = z.enum([
  'ACTIVE',
  'CHECK_IN_DUE',
  'GRACE_PERIOD',
  'RECOVERY_PENDING',
  'COOLING_OFF',
  'RECOVERY_READY',
  'RECOVERED',
  'CANCELLED',
]);

export type VaultStatus = z.infer<typeof VaultStatusSchema>;

// ==========================================
// 2. Nominee Types & Schemas
// ==========================================

export const NomineeStatusSchema = z.enum(['pending', 'active', 'revoked']);
export type NomineeStatus = z.infer<typeof NomineeStatusSchema>;

export const NomineeSchema = z.object({
  id: z.string().uuid(),
  vaultId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  email: z.string().email(),
  displayName: z.string().min(1).max(100),
  shareIndex: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  status: NomineeStatusSchema,
  inviteExpiresAt: z.string().datetime().nullable(),
  inviteAcceptedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Nominee = z.infer<typeof NomineeSchema>;

// ==========================================
// 3. Recovery Request & Approvals
// ==========================================

export const RecoveryRequestStatusSchema = z.enum([
  'pending',
  'cooling_off',
  'ready',
  'cancelled',
  'expired',
]);

export type RecoveryRequestStatus = z.infer<typeof RecoveryRequestStatusSchema>;

export const RecoveryRequestSchema = z.object({
  id: z.string().uuid(),
  vaultId: z.string().uuid(),
  status: RecoveryRequestStatusSchema,
  startedAt: z.string().datetime(),
  coolingOffEndsAt: z.string().datetime().nullable(),
  unlockExpiresAt: z.string().datetime().nullable(),
  cancelledAt: z.string().datetime().nullable(),
  cancelledBy: z.string().uuid().nullable(),
  revision: z.number().int().min(1),
  createdAt: z.string().datetime(),
});

export type RecoveryRequest = z.infer<typeof RecoveryRequestSchema>;

export const RecoveryDecisionSchema = z.enum(['approve', 'decline']);
export type RecoveryDecision = z.infer<typeof RecoveryDecisionSchema>;

export const RecoveryApprovalSchema = z.object({
  id: z.string().uuid(),
  recoveryRequestId: z.string().uuid(),
  nomineeId: z.string().uuid(),
  decision: RecoveryDecisionSchema,
  createdAt: z.string().datetime(),
  requestId: z.string().uuid().optional(),
});

export type RecoveryApproval = z.infer<typeof RecoveryApprovalSchema>;

// ==========================================
// 4. Recovery Session (Downloaded after RECOVERY_READY)
// ==========================================

export const RecoverySessionSchema = z.object({
  recoveryRequestId: z.string().uuid(),
  vaultId: z.string().uuid(),
  status: RecoveryRequestStatusSchema,
  unlockExpiresAt: z.string().datetime(),
  payloadEnvelope: EncryptedPayloadEnvelopeSchema,
  // Note: Recovery session NEVER includes raw shares, KEK, DEK, or passphrase.
});

export type RecoverySession = z.infer<typeof RecoverySessionSchema>;
