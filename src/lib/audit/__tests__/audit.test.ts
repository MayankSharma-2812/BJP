import { describe, it, expect } from 'vitest';
import {
  canonicalJsonStringify,
  sanitizeAuditMetadata,
  computeEventHash,
  buildAuditEvent,
  verifyAuditChain,
} from '../index';
import { AuditEvent, GENESIS_PREVIOUS_HASH } from '@/types/audit';

const MOCK_VAULT_ID = 'e2b3c4d5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
const MOCK_USER_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

describe('Workstream A3: Canonical Audit Trail & Hash Chaining', () => {
  describe('Metadata Sanitization & Canonical JSON (RFC 8785)', () => {
    it('sanitizes valid metadata without error', () => {
      const clean = sanitizeAuditMetadata({
        status: 'ACTIVE',
        version: 1,
        isVerified: true,
        referenceId: null,
      });

      expect(clean).toEqual({
        status: 'ACTIVE',
        version: 1,
        isVerified: true,
        referenceId: null,
      });
    });

    it('strictly throws error if sensitive keys (password, share, key, secret) are present', () => {
      expect(() => sanitizeAuditMetadata({ password: 'secret' })).toThrow(
        /sensitive key 'password' is prohibited/i
      );
      expect(() => sanitizeAuditMetadata({ dek: 'rawkey' })).toThrow(
        /sensitive key 'dek' is prohibited/i
      );
      expect(() => sanitizeAuditMetadata({ share: 'share1' })).toThrow(
        /sensitive key 'share' is prohibited/i
      );
      expect(() => sanitizeAuditMetadata({ Passphrase: 'test' })).toThrow(
        /sensitive key 'Passphrase' is prohibited/i
      );
    });

    it('produces deterministic output regardless of object key order', () => {
      const objA = { z: 1, a: 'test', m: { b: 2, a: 1 } };
      const objB = { a: 'test', m: { a: 1, b: 2 }, z: 1 };

      const jsonA = canonicalJsonStringify(objA);
      const jsonB = canonicalJsonStringify(objB);

      expect(jsonA).toBe(jsonB);
      expect(jsonA).toBe('{"a":"test","m":{"a":1,"b":2},"z":1}');
    });
  });

  describe('Event Hash Computation & Builder', () => {
    it('computes a consistent 64-character hex hash', () => {
      const hash1 = computeEventHash({
        vaultId: MOCK_VAULT_ID,
        sequence: 1,
        eventType: 'vault_created',
        actorUserId: MOCK_USER_ID,
        serverTime: '2026-10-29T12:00:00.000Z',
        metadata: { initialStatus: 'ACTIVE' },
        previousHash: GENESIS_PREVIOUS_HASH,
      });

      const hash2 = computeEventHash({
        vaultId: MOCK_VAULT_ID,
        sequence: 1,
        eventType: 'vault_created',
        actorUserId: MOCK_USER_ID,
        serverTime: '2026-10-29T12:00:00.000Z',
        metadata: { initialStatus: 'ACTIVE' },
        previousHash: GENESIS_PREVIOUS_HASH,
      });

      expect(hash1).toHaveLength(64);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
      expect(hash1).toBe(hash2);
    });

    it('produces different hash if any field is changed', () => {
      const baseParams = {
        vaultId: MOCK_VAULT_ID,
        sequence: 1,
        eventType: 'vault_created' as const,
        actorUserId: MOCK_USER_ID,
        serverTime: '2026-10-29T12:00:00.000Z',
        metadata: { initialStatus: 'ACTIVE' },
        previousHash: GENESIS_PREVIOUS_HASH,
      };

      const baseHash = computeEventHash(baseParams);

      const modifiedSequence = computeEventHash({ ...baseParams, sequence: 2 });
      const modifiedTime = computeEventHash({
        ...baseParams,
        serverTime: '2026-10-29T12:00:01.000Z',
      });
      const modifiedMeta = computeEventHash({
        ...baseParams,
        metadata: { initialStatus: 'PENDING' },
      });

      expect(modifiedSequence).not.toBe(baseHash);
      expect(modifiedTime).not.toBe(baseHash);
      expect(modifiedMeta).not.toBe(baseHash);
    });

    it('builds a valid AuditEvent schema object', () => {
      const event = buildAuditEvent({
        vaultId: MOCK_VAULT_ID,
        sequence: 1,
        eventType: 'vault_created',
        actorUserId: MOCK_USER_ID,
        metadata: { schemaVersion: 1 },
        previousHash: GENESIS_PREVIOUS_HASH,
      });

      expect(event.id).toBeDefined();
      expect(event.sequence).toBe(1);
      expect(event.eventHash).toHaveLength(64);
      expect(event.previousHash).toBe(GENESIS_PREVIOUS_HASH);
    });
  });

  describe('Audit Chain Verification & Tamper Detection', () => {
    function generateMockChain(length: number): AuditEvent[] {
      const chain: AuditEvent[] = [];
      let prevHash = GENESIS_PREVIOUS_HASH;

      const eventTypes = [
        'vault_created' as const,
        'nominee_added' as const,
        'checkin_recorded' as const,
        'state_transitioned' as const,
        'payload_updated' as const,
      ];

      for (let seq = 1; seq <= length; seq++) {
        const event = buildAuditEvent({
          vaultId: MOCK_VAULT_ID,
          sequence: seq,
          eventType: eventTypes[(seq - 1) % eventTypes.length],
          actorUserId: MOCK_USER_ID,
          serverTime: new Date(1761740000000 + seq * 1000).toISOString(),
          metadata: { step: seq, note: `event-${seq}` },
          previousHash: prevHash,
        });
        chain.push(event);
        prevHash = event.eventHash;
      }

      return chain;
    }

    it('verifies an empty chain trivially', () => {
      const result = verifyAuditChain([]);
      expect(result.verified).toBe(true);
      expect(result.totalEvents).toBe(0);
    });

    it('successfully verifies a valid 5-event hash chain', () => {
      const chain = generateMockChain(5);
      const result = verifyAuditChain(chain);

      expect(result.verified).toBe(true);
      expect(result.totalEvents).toBe(5);
      expect(result.genesisHashValid).toBe(true);
      expect(result.sequenceContinuous).toBe(true);
      expect(result.hashChainIntact).toBe(true);
    });

    it('detects tampering when metadata of an intermediate event is altered', () => {
      const chain = generateMockChain(4);

      // Modify metadata on event at index 2 (sequence 3) without updating its hash
      chain[2] = {
        ...chain[2],
        metadata: { step: 3, note: 'tampered-data' },
      };

      const result = verifyAuditChain(chain);
      expect(result.verified).toBe(false);
      expect(result.brokenIndex).toBe(2);
      expect(result.failureReason).toMatch(/Cryptographic tamper detected at event index 2/i);
    });

    it('detects when an event is deleted from the middle of the chain', () => {
      const chain = generateMockChain(5);
      // Remove index 2 (sequence 3)
      chain.splice(2, 1);

      const result = verifyAuditChain(chain);
      expect(result.verified).toBe(false);
      expect(result.brokenIndex).toBe(2);
      expect(result.sequenceContinuous).toBe(false);
      expect(result.failureReason).toMatch(/Sequence break at index 2/i);
    });

    it('detects when events are reordered', () => {
      const chain = generateMockChain(4);
      // Swap event 1 and event 2
      const temp = chain[1];
      chain[1] = chain[2];
      chain[2] = temp;

      const result = verifyAuditChain(chain);
      expect(result.verified).toBe(false);
      expect(result.brokenIndex).toBe(1);
    });

    it('detects invalid genesis previous_hash', () => {
      const chain = generateMockChain(3);
      chain[0] = {
        ...chain[0],
        previousHash: '1111111111111111111111111111111111111111111111111111111111111111',
      };

      const result = verifyAuditChain(chain);
      expect(result.verified).toBe(false);
      expect(result.genesisHashValid).toBe(false);
      expect(result.brokenIndex).toBe(0);
      expect(result.failureReason).toMatch(/Genesis event previous_hash mismatch/i);
    });
  });
});
