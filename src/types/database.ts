// Database entity types corresponding to supabase/migrations/20261029000000_initial_schema.sql
// References: docs/05_BACKEND_SCHEMA.md

export type VaultStatus =
  | 'ACTIVE'
  | 'CHECKIN_DUE'
  | 'GRACE_PERIOD'
  | 'RECOVERY_PENDING'
  | 'RECOVERY_COOLING_OFF'
  | 'RECOVERY_READY'
  | 'RECOVERED'
  | 'CANCELLED'
  | 'ARCHIVED';

export type NomineeStatus = 'pending' | 'active' | 'revoked';

export type RecoveryRequestStatus =
  | 'pending'
  | 'cooling_off'
  | 'ready'
  | 'cancelled'
  | 'expired';

import type { AuditEventType } from './audit';

export type RecoveryDecision = 'approve' | 'decline';

export type { AuditEventType };

export interface ProfileRecord {
  user_id: string;
  display_name: string | null;
  locale: string;
  created_at: string;
  updated_at: string;
}

export interface KdfParams {
  N: number;
  r: number;
  p: number;
  dkLen: number;
}

export interface VaultRecord {
  id: string;
  owner_id: string;
  status: VaultStatus;
  schema_version: number;
  crypto_version: number;
  payload_ciphertext: string;
  payload_nonce: string;
  payload_aad_version: number;
  wrapped_dek: string;
  wrap_nonce: string;
  kdf_name: 'scrypt';
  kdf_params: KdfParams;
  kdf_salt: string;
  checkin_interval_seconds: number;
  last_checkin_at: string;
  next_checkin_at: string;
  grace_ends_at: string | null;
  cooling_off_ends_at: string | null;
  unlock_expires_at: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
}

export interface NomineeRecord {
  id: string;
  vault_id: string;
  user_id: string | null;
  email: string;
  display_name: string;
  share_index: 1 | 2 | 3;
  invite_token_hash: string | null;
  invite_expires_at: string | null;
  invite_accepted_at: string | null;
  status: NomineeStatus;
  created_at: string;
  updated_at: string;
}

export interface RecoveryRequestRecord {
  id: string;
  vault_id: string;
  status: RecoveryRequestStatus;
  started_at: string;
  cooling_off_ends_at: string | null;
  unlock_expires_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  revision: number;
  created_at: string;
}

export interface RecoveryApprovalRecord {
  id: string;
  recovery_request_id: string;
  nominee_id: string;
  decision: RecoveryDecision;
  created_at: string;
  request_id: string | null;
}

export interface AuditEventRecord {
  id: string;
  vault_id: string;
  sequence: number;
  event_type: AuditEventType;
  actor_user_id: string | null;
  server_time: string;
  event_metadata: Record<string, unknown>;
  previous_hash: string;
  event_hash: string;
  request_id: string | null;
}
