import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { AuditEvent, AuditEventSchema, AuditEventType, AuditMetadata } from '@/types/audit';
import { canonicalJsonStringify, sanitizeAuditMetadata } from './canonical';

export interface ComputeHashParams {
  vaultId: string;
  sequence: number;
  eventType: AuditEventType;
  actorUserId: string | null;
  serverTime: string;
  metadata: AuditMetadata;
  previousHash: string;
  requestId?: string | null;
}

/**
 * Compute the SHA-256 hash of an audit event bound to its previous hash.
 * Produces a lowercase 64-character hex string.
 */
export function computeEventHash(params: ComputeHashParams): string {
  // 1. Sanitize metadata to guarantee zero secrets in payload
  const cleanMetadata = sanitizeAuditMetadata(params.metadata);

  // 2. Prepare canonical object for deterministic hashing
  const canonicalData = {
    actorUserId: params.actorUserId ?? null,
    eventType: params.eventType,
    metadata: cleanMetadata,
    previousHash: params.previousHash.toLowerCase(),
    requestId: params.requestId ?? null,
    sequence: params.sequence,
    serverTime: params.serverTime,
    vaultId: params.vaultId,
  };

  const canonicalString = canonicalJsonStringify(canonicalData);

  // 3. Hash previousHash combined with canonical payload
  const payloadToHash = `${params.previousHash.toLowerCase()}:${canonicalString}`;
  const hashBytes = sha256(utf8ToBytes(payloadToHash));

  return bytesToHex(hashBytes);
}

export interface BuildAuditEventParams {
  id?: string;
  vaultId: string;
  sequence: number;
  eventType: AuditEventType;
  actorUserId?: string | null;
  serverTime?: string;
  metadata?: Record<string, unknown>;
  previousHash: string;
  requestId?: string | null;
}

/**
 * Construct and validate a full AuditEvent record with its computed eventHash.
 */
export function buildAuditEvent(params: BuildAuditEventParams): AuditEvent {
  const serverTime = params.serverTime || new Date().toISOString();
  const cleanMetadata = sanitizeAuditMetadata(params.metadata || {});
  const id = params.id || globalThis.crypto.randomUUID();

  const hashParams: ComputeHashParams = {
    vaultId: params.vaultId,
    sequence: params.sequence,
    eventType: params.eventType,
    actorUserId: params.actorUserId ?? null,
    serverTime,
    metadata: cleanMetadata,
    previousHash: params.previousHash,
    requestId: params.requestId ?? null,
  };

  const eventHash = computeEventHash(hashParams);

  const event: AuditEvent = {
    id,
    vaultId: params.vaultId,
    sequence: params.sequence,
    eventType: params.eventType,
    actorUserId: params.actorUserId ?? null,
    serverTime,
    metadata: cleanMetadata,
    previousHash: params.previousHash.toLowerCase(),
    eventHash,
    requestId: params.requestId ?? null,
  };

  return AuditEventSchema.parse(event);
}
