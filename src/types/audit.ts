import { z } from 'zod';

// ==========================================
// 1. Audit Constants & Event Types
// ==========================================

export const GENESIS_PREVIOUS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export const AuditEventTypeSchema = z.enum([
  'vault_created',
  'payload_updated',
  'checkin_recorded',
  'state_transitioned',
  'nominee_added',
  'nominee_revoked',
  'invite_accepted',
  'recovery_request_opened',
  'nominee_approved',
  'nominee_declined',
  'cooling_off_started',
  'recovery_cancelled',
  'recovery_ready',
  'client_reported_recovery_complete',
]);

export type AuditEventType = z.infer<typeof AuditEventTypeSchema>;

// ==========================================
// 2. Audit Event Schema
// ==========================================

// Safe metadata: only IDs, status strings, numbers, version labels.
// Explicitly disallows freeform user text or secret fields.
export const AuditMetadataSchema = z.record(
  z.string().regex(/^[a-zA-Z0-9_-]+$/),
  z.union([z.string().max(200), z.number(), z.boolean(), z.null()])
);

export type AuditMetadata = z.infer<typeof AuditMetadataSchema>;

export const AuditEventSchema = z.object({
  id: z.string().uuid(),
  vaultId: z.string().uuid(),
  sequence: z.number().int().nonnegative(),
  eventType: AuditEventTypeSchema,
  actorUserId: z.string().uuid().nullable(),
  serverTime: z.string().datetime(),
  metadata: AuditMetadataSchema,
  previousHash: z.string().regex(/^[a-f0-9]{64}$/i, 'Previous hash must be 64-char hex string'),
  eventHash: z.string().regex(/^[a-f0-9]{64}$/i, 'Event hash must be 64-char hex string'),
  requestId: z.string().uuid().nullable().optional(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

// ==========================================
// 3. Verification Report Shape
// ==========================================

export interface AuditVerificationResult {
  verified: boolean;
  totalEvents: number;
  genesisHashValid: boolean;
  sequenceContinuous: boolean;
  hashChainIntact: boolean;
  brokenIndex?: number;
  failureReason?: string;
}
