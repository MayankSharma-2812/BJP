import {
  AuditEvent,
  AuditEventSchema,
  AuditVerificationResult,
  GENESIS_PREVIOUS_HASH,
} from '@/types/audit';
import { computeEventHash } from './hasher';

/**
 * Verify the cryptographic and sequential integrity of an audit event chain.
 *
 * Security Model / Honest Claims Note:
 * This verification guarantees tamper-evidence against modifications, deletions,
 * or reordering of historical events when compared against a retained earlier checkpoint.
 * It is not claimed to prevent an all-powerful database administrator from rewriting
 * the entire chain from genesis unless an external anchor or checkpoint is held out-of-band.
 */
export function verifyAuditChain(
  events: AuditEvent[],
  expectedGenesisPreviousHash: string = GENESIS_PREVIOUS_HASH
): AuditVerificationResult {
  // Empty chain is considered trivially verified
  if (!events || events.length === 0) {
    return {
      verified: true,
      totalEvents: 0,
      genesisHashValid: true,
      sequenceContinuous: true,
      hashChainIntact: true,
    };
  }

  // 1. Genesis Event Checks
  const firstEvent = events[0];
  const genesisHashMatches =
    firstEvent.previousHash.toLowerCase() === expectedGenesisPreviousHash.toLowerCase();

  if (!genesisHashMatches) {
    return {
      verified: false,
      totalEvents: events.length,
      genesisHashValid: false,
      sequenceContinuous: true,
      hashChainIntact: false,
      brokenIndex: 0,
      failureReason: `Genesis event previous_hash mismatch: expected ${expectedGenesisPreviousHash}, got ${firstEvent.previousHash}`,
    };
  }

  // 2. Iterate through events verifying sequence and hash continuity
  for (let i = 0; i < events.length; i++) {
    const current = events[i];

    // Validate schema
    try {
      AuditEventSchema.parse(current);
    } catch {
      return {
        verified: false,
        totalEvents: events.length,
        genesisHashValid: genesisHashMatches,
        sequenceContinuous: false,
        hashChainIntact: false,
        brokenIndex: i,
        failureReason: `Event at index ${i} failed schema validation`,
      };
    }

    // Sequence check (for i > 0, sequence must increment by exactly 1)
    if (i > 0) {
      const prior = events[i - 1];
      if (current.sequence !== prior.sequence + 1) {
        return {
          verified: false,
          totalEvents: events.length,
          genesisHashValid: genesisHashMatches,
          sequenceContinuous: false,
          hashChainIntact: false,
          brokenIndex: i,
          failureReason: `Sequence break at index ${i}: expected ${prior.sequence + 1}, got ${current.sequence}`,
        };
      }

      // Chain continuity: current.previousHash must match prior.eventHash
      if (current.previousHash.toLowerCase() !== prior.eventHash.toLowerCase()) {
        return {
          verified: false,
          totalEvents: events.length,
          genesisHashValid: genesisHashMatches,
          sequenceContinuous: true,
          hashChainIntact: false,
          brokenIndex: i,
          failureReason: `Hash chain broken at index ${i}: current.previousHash does not match prior event_hash`,
        };
      }
    }

    // Cryptographic re-computation: recompute event_hash and compare
    const expectedHash = computeEventHash({
      vaultId: current.vaultId,
      sequence: current.sequence,
      eventType: current.eventType,
      actorUserId: current.actorUserId,
      serverTime: current.serverTime,
      metadata: current.metadata,
      previousHash: current.previousHash,
      requestId: current.requestId,
    });

    if (current.eventHash.toLowerCase() !== expectedHash.toLowerCase()) {
      return {
        verified: false,
        totalEvents: events.length,
        genesisHashValid: genesisHashMatches,
        sequenceContinuous: true,
        hashChainIntact: false,
        brokenIndex: i,
        failureReason: `Cryptographic tamper detected at event index ${i} (sequence ${current.sequence}): stored hash does not match computed hash`,
      };
    }
  }

  return {
    verified: true,
    totalEvents: events.length,
    genesisHashValid: true,
    sequenceContinuous: true,
    hashChainIntact: true,
  };
}
