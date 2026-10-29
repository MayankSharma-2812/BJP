// API types and contract interfaces
// References: docs/06_API_CONTRACT.md, docs/03_TRD.md

import { z } from 'zod';
import { RecoveryDecisionSchema, VaultStatusSchema } from './recovery';
import { AuditEventSchema, AuditVerificationResult } from './audit';
import type { KdfParams, VaultStatus } from './database';

// ==========================================
// 1. API Error Format
// ==========================================

export const ApiErrorCodeSchema = z.enum([
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_FAILED',
  'PAYLOAD_TOO_LARGE',
  'INVALID_STATE_TRANSITION',
  'RECOVERY_NOT_READY',
  'RECOVERY_WINDOW_EXPIRED',
  'DUPLICATE_DECISION',
  'RATE_LIMITED',
  'REVISION_CONFLICT',
  'INVITE_INVALID_OR_EXPIRED',
  'INTERNAL_ERROR',
]);

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    requestId: z.string().optional(),
    retryAfterSeconds: z.number().int().optional(),
  }),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

// ==========================================
// 2. Workstream A: Recovery & Workflow Payloads (Mayank)
// ==========================================

// Check-in
export const CheckInResponseSchema = z.object({
  success: z.literal(true),
  vaultId: z.string().uuid(),
  status: VaultStatusSchema,
  lastCheckInAt: z.string().datetime(),
  nextCheckInAt: z.string().datetime(),
});

export type CheckInResponse = z.infer<typeof CheckInResponseSchema>;

// Nominee Decision
export const DecisionRequestSchema = z.object({
  decision: RecoveryDecisionSchema,
  idempotencyKey: z.string().uuid(),
});

export type DecisionRequest = z.infer<typeof DecisionRequestSchema>;

export const DecisionResponseSchema = z.object({
  success: z.literal(true),
  recoveryRequestId: z.string().uuid(),
  status: z.string(),
  approvedCount: z.number().int().min(0).max(3),
  thresholdMet: z.boolean(),
  coolingOffEndsAt: z.string().datetime().nullable().optional(),
});

export type DecisionResponse = z.infer<typeof DecisionResponseSchema>;

// Owner Cancellation
export const CancelRecoveryResponseSchema = z.object({
  success: z.literal(true),
  vaultId: z.string().uuid(),
  status: z.literal('ACTIVE'),
  cancelledAt: z.string().datetime(),
});

export type CancelRecoveryResponse = z.infer<typeof CancelRecoveryResponseSchema>;

// Client Reported Completion
export const ClientCompletionRequestSchema = z.object({
  clientSessionId: z.string().uuid(),
  completedAt: z.string().datetime(),
  // NEVER accept DEK, shares, or plaintext here!
});

export type ClientCompletionRequest = z.infer<typeof ClientCompletionRequestSchema>;

// Demo Clock
export const DemoClockActionSchema = z.enum([
  'advance_seconds',
  'advance_to_due',
  'advance_to_grace_expiry',
  'advance_to_cooldown_expiry',
  'reset_demo',
]);

export type DemoClockAction = z.infer<typeof DemoClockActionSchema>;

export const DemoClockRequestSchema = z.object({
  action: DemoClockActionSchema,
  seconds: z.number().int().positive().optional(),
  vaultId: z.string().uuid(),
});

export type DemoClockRequest = z.infer<typeof DemoClockRequestSchema>;

export const DemoClockResponseSchema = z.object({
  success: z.literal(true),
  simulatedTime: z.string().datetime(),
  vaultStatus: VaultStatusSchema,
  nextCheckInAt: z.string().datetime().nullable(),
  coolingOffEndsAt: z.string().datetime().nullable(),
  notes: z.string().optional(),
});

export type DemoClockResponse = z.infer<typeof DemoClockResponseSchema>;

// Audit Query Response
export const AuditQueryResponseSchema = z.object({
  vaultId: z.string().uuid(),
  events: z.array(AuditEventSchema),
  verification: z.custom<AuditVerificationResult>(),
});

export type AuditQueryResponse = z.infer<typeof AuditQueryResponseSchema>;

// ==========================================
// 3. Workstream B: Vault Persistence Payloads (Shyam)
// ==========================================

// POST /api/vaults
export interface CreateVaultRequest {
  schemaVersion: number;
  cryptoVersion: number;
  payloadCiphertext: string;
  payloadNonce: string;
  payloadAadVersion: number;
  wrappedDek: string;
  wrapNonce: string;
  kdfName: 'scrypt';
  kdfParams: KdfParams;
  kdfSalt: string;
  checkinIntervalSeconds: number;
}

export interface CreateVaultResponse {
  vaultId: string;
  status: VaultStatus;
  revision: number;
  nextCheckinAt: string;
  createdAt: string;
}

// GET /api/vaults/:vaultId
export interface GetVaultResponse {
  id: string;
  ownerId: string;
  status: VaultStatus;
  schemaVersion: number;
  cryptoVersion: number;
  payloadCiphertext: string;
  payloadNonce: string;
  payloadAadVersion: number;
  wrappedDek: string;
  wrapNonce: string;
  kdfName: 'scrypt';
  kdfParams: KdfParams;
  kdfSalt: string;
  checkinIntervalSeconds: number;
  lastCheckinAt: string;
  nextCheckinAt: string;
  graceEndsAt: string | null;
  coolingOffEndsAt: string | null;
  unlockExpiresAt: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

// PUT /api/vaults/:vaultId/envelope
export interface UpdateEnvelopeRequest {
  expectedRevision: number;
  payloadCiphertext: string;
  payloadNonce: string;
  payloadAadVersion: number;
  wrappedDek?: string;
  wrapNonce?: string;
}

export interface UpdateEnvelopeResponse {
  vaultId: string;
  revision: number;
  updatedAt: string;
}

// POST /api/vaults/:vaultId/nominees
export interface NomineeInput {
  email: string;
  displayName: string;
  shareIndex: 1 | 2 | 3;
}

export interface SetNomineesRequest {
  nominees: NomineeInput[];
}

export interface NomineeItemResponse {
  id: string;
  email: string;
  displayName: string;
  shareIndex: 1 | 2 | 3;
  status: 'pending' | 'active' | 'revoked';
  inviteToken?: string; // High entropy single-use delivery token (returned once upon creation)
  inviteExpiresAt?: string | null;
}

export interface SetNomineesResponse {
  vaultId: string;
  nominees: NomineeItemResponse[];
}

// POST /api/invites/accept
export interface AcceptInviteRequest {
  inviteToken: string;
}

export interface AcceptInviteResponse {
  nomineeId: string;
  vaultId: string;
  status: 'active';
  acceptedAt: string;
}
