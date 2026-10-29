import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  evaluateApprovals,
  processCheckIn,
  evaluateScheduledTransition,
  processNomineeDecision,
  cancelRecovery,
  normalizeVaultStatus,
  executeDemoClockAction,
  resetDemoClock,
  VaultStateContext,
  DEMO_CHECKIN_INTERVAL_SECONDS,
  DEMO_GRACE_PERIOD_SECONDS,
  DEMO_COOLING_OFF_SECONDS,
  DEMO_UNLOCK_WINDOW_SECONDS,
} from '../index';
import { RecoveryApproval } from '@/types/recovery';

const VAULT_ID = 'e2b3c4d5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
const NOMINEE_A = 'a1111111-1111-4111-8111-111111111111';
const NOMINEE_B = 'b2222222-2222-4222-8222-222222222222';

function createMockVaultContext(overrides?: Partial<VaultStateContext>): VaultStateContext {
  const now = new Date('2026-10-29T12:00:00.000Z');
  return {
    vaultId: VAULT_ID,
    status: 'ACTIVE',
    checkinIntervalSeconds: DEMO_CHECKIN_INTERVAL_SECONDS, // 120s
    gracePeriodSeconds: DEMO_GRACE_PERIOD_SECONDS, // 120s
    coolingOffSeconds: DEMO_COOLING_OFF_SECONDS, // 120s
    unlockWindowSeconds: DEMO_UNLOCK_WINDOW_SECONDS, // 24h
    lastCheckInAt: now.toISOString(),
    nextCheckInAt: new Date(now.getTime() + 120 * 1000).toISOString(),
    graceEndsAt: null,
    coolingOffEndsAt: null,
    unlockExpiresAt: null,
    ...overrides,
  };
}

describe('Workstream A2: Recovery State Machine Engine & Demo Clock', () => {
  describe('Status Normalization', () => {
    it('normalizes legacy and SQL status variants seamlessly', () => {
      expect(normalizeVaultStatus('CHECKIN_DUE')).toBe('CHECK_IN_DUE');
      expect(normalizeVaultStatus('check_in_due')).toBe('CHECK_IN_DUE');
      expect(normalizeVaultStatus('RECOVERY_COOLING_OFF')).toBe('COOLING_OFF');
      expect(normalizeVaultStatus('cooling_off')).toBe('COOLING_OFF');
      expect(normalizeVaultStatus('ACTIVE')).toBe('ACTIVE');
      expect(() => normalizeVaultStatus('INVALID_STATUS')).toThrow();
    });
  });

  describe('Approval Deduplication & Threshold Logic', () => {
    it('handles first approval correctly (1/2 threshold)', () => {
      const result = evaluateApprovals([], NOMINEE_A, 'approve');
      expect(result.approvedCount).toBe(1);
      expect(result.thresholdMet).toBe(false);
      expect(result.isDuplicate).toBe(false);
    });

    it('detects duplicate approval from same nominee idempotently', () => {
      const existing: RecoveryApproval[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          recoveryRequestId: '223e4567-e89b-12d3-a456-426614174000',
          nomineeId: NOMINEE_A,
          decision: 'approve',
          createdAt: new Date().toISOString(),
        },
      ];

      const result = evaluateApprovals(existing, NOMINEE_A, 'approve');
      expect(result.approvedCount).toBe(1);
      expect(result.isDuplicate).toBe(true);
      expect(result.thresholdMet).toBe(false);
    });

    it('satisfies threshold when second distinct nominee approves (2/2 threshold)', () => {
      const existing: RecoveryApproval[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          recoveryRequestId: '223e4567-e89b-12d3-a456-426614174000',
          nomineeId: NOMINEE_A,
          decision: 'approve',
          createdAt: new Date().toISOString(),
        },
      ];

      const result = evaluateApprovals(existing, NOMINEE_B, 'approve');
      expect(result.approvedCount).toBe(2);
      expect(result.thresholdMet).toBe(true);
      expect(result.distinctApprovedNomineeIds).toContain(NOMINEE_A);
      expect(result.distinctApprovedNomineeIds).toContain(NOMINEE_B);
    });

    it('does not increment approval count on decline decision', () => {
      const result = evaluateApprovals([], NOMINEE_A, 'decline');
      expect(result.approvedCount).toBe(0);
      expect(result.declinedCount).toBe(1);
      expect(result.thresholdMet).toBe(false);
    });
  });

  describe('Owner Check-In Workflow', () => {
    it('resets check-in deadline when check-in occurs during ACTIVE state', () => {
      const context = createMockVaultContext();
      const checkInTime = new Date('2026-10-29T12:01:00.000Z');

      const result = processCheckIn(context, checkInTime);
      expect(result.newStatus).toBe('ACTIVE');
      expect(result.updatedContext.lastCheckInAt).toBe('2026-10-29T12:01:00.000Z');
      expect(result.updatedContext.nextCheckInAt).toBe('2026-10-29T12:03:00.000Z');
    });

    it('returns vault from CHECK_IN_DUE to ACTIVE upon owner check-in', () => {
      const context = createMockVaultContext({ status: 'CHECK_IN_DUE' });
      const result = processCheckIn(context);

      expect(result.previousStatus).toBe('CHECK_IN_DUE');
      expect(result.newStatus).toBe('ACTIVE');
      expect(result.transitionOccurred).toBe(true);
    });

    it('returns vault from GRACE_PERIOD to ACTIVE upon owner check-in', () => {
      const context = createMockVaultContext({
        status: 'GRACE_PERIOD',
        graceEndsAt: '2026-10-29T12:05:00.000Z',
      });
      const result = processCheckIn(context);

      expect(result.previousStatus).toBe('GRACE_PERIOD');
      expect(result.newStatus).toBe('ACTIVE');
      expect(result.updatedContext.graceEndsAt).toBeNull();
    });

    it('rejects blind check-in during COOLING_OFF (must cancel explicitly)', () => {
      const context = createMockVaultContext({ status: 'COOLING_OFF' });
      expect(() => processCheckIn(context)).toThrow(/Cannot check in during COOLING_OFF/i);
    });
  });

  describe('Scheduled State Transitions & Fail-Closed Behavior', () => {
    it('does not transition when time has not elapsed (fail-closed)', () => {
      const context = createMockVaultContext();
      // Current time is before nextCheckInAt
      const result = evaluateScheduledTransition(
        context,
        new Date('2026-10-29T12:00:30.000Z')
      );

      expect(result.transitionOccurred).toBe(false);
      expect(result.newStatus).toBe('ACTIVE');
    });

    it('transitions ACTIVE -> CHECK_IN_DUE when deadline passes', () => {
      const context = createMockVaultContext();
      // Pass the 12:02:00 deadline by 1 second
      const result = evaluateScheduledTransition(
        context,
        new Date('2026-10-29T12:02:01.000Z')
      );

      expect(result.transitionOccurred).toBe(true);
      expect(result.newStatus).toBe('CHECK_IN_DUE');
    });

    it('transitions CHECK_IN_DUE -> GRACE_PERIOD with computed graceEndsAt', () => {
      const context = createMockVaultContext({ status: 'CHECK_IN_DUE' });
      const currentTime = new Date('2026-10-29T12:03:00.000Z');

      const result = evaluateScheduledTransition(context, currentTime);
      expect(result.transitionOccurred).toBe(true);
      expect(result.newStatus).toBe('GRACE_PERIOD');
      expect(result.updatedContext.graceEndsAt).toBe('2026-10-29T12:05:00.000Z');
    });

    it('transitions GRACE_PERIOD -> RECOVERY_PENDING when grace period expires', () => {
      const context = createMockVaultContext({
        status: 'GRACE_PERIOD',
        graceEndsAt: '2026-10-29T12:05:00.000Z',
      });

      // Pass graceEndsAt
      const result = evaluateScheduledTransition(
        context,
        new Date('2026-10-29T12:05:01.000Z')
      );

      expect(result.transitionOccurred).toBe(true);
      expect(result.newStatus).toBe('RECOVERY_PENDING');
    });

    it('transitions COOLING_OFF -> RECOVERY_READY when cooldown period elapses', () => {
      const context = createMockVaultContext({
        status: 'COOLING_OFF',
        coolingOffEndsAt: '2026-10-29T12:07:00.000Z',
      });

      const result = evaluateScheduledTransition(
        context,
        new Date('2026-10-29T12:07:01.000Z')
      );

      expect(result.transitionOccurred).toBe(true);
      expect(result.newStatus).toBe('RECOVERY_READY');
      expect(result.updatedContext.unlockExpiresAt).toBeDefined();
    });

    it('expires recovery session back to RECOVERY_PENDING after unlock window passes', () => {
      const context = createMockVaultContext({
        status: 'RECOVERY_READY',
        unlockExpiresAt: '2026-10-30T12:00:00.000Z',
      });

      const result = evaluateScheduledTransition(
        context,
        new Date('2026-10-30T12:00:01.000Z')
      );

      expect(result.transitionOccurred).toBe(true);
      expect(result.newStatus).toBe('RECOVERY_PENDING');
      expect(result.updatedContext.unlockExpiresAt).toBeNull();
    });
  });

  describe('Nominee Approvals Triggering COOLING_OFF', () => {
    it('moves from RECOVERY_PENDING to COOLING_OFF on 2nd distinct approval', () => {
      const context = createMockVaultContext({ status: 'RECOVERY_PENDING' });
      const approval1: RecoveryApproval = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        recoveryRequestId: '223e4567-e89b-12d3-a456-426614174000',
        nomineeId: NOMINEE_A,
        decision: 'approve',
        createdAt: new Date().toISOString(),
      };

      const currentTime = new Date('2026-10-29T12:06:00.000Z');
      const { transitionResult, thresholdMet, approvedCount } = processNomineeDecision(
        context,
        [approval1],
        NOMINEE_B,
        'approve',
        currentTime
      );

      expect(approvedCount).toBe(2);
      expect(thresholdMet).toBe(true);
      expect(transitionResult.transitionOccurred).toBe(true);
      expect(transitionResult.newStatus).toBe('COOLING_OFF');
      expect(transitionResult.updatedContext.coolingOffEndsAt).toBe(
        '2026-10-29T12:08:00.000Z'
      );
    });

    it('rejects nominee decisions when not in RECOVERY_PENDING state', () => {
      const context = createMockVaultContext({ status: 'ACTIVE' });
      expect(() =>
        processNomineeDecision(context, [], NOMINEE_A, 'approve')
      ).toThrow(/only accepted during RECOVERY_PENDING/i);
    });
  });

  describe('Owner Cancellation & Race Condition Protection', () => {
    it('cancels pending recovery during RECOVERY_PENDING returning to ACTIVE', () => {
      const context = createMockVaultContext({ status: 'RECOVERY_PENDING' });
      const result = cancelRecovery(context);

      expect(result.previousStatus).toBe('RECOVERY_PENDING');
      expect(result.newStatus).toBe('ACTIVE');
      expect(result.transitionOccurred).toBe(true);
    });

    it('cancels recovery during COOLING_OFF aborting pending release', () => {
      const context = createMockVaultContext({
        status: 'COOLING_OFF',
        coolingOffEndsAt: '2026-10-29T12:10:00.000Z',
      });
      const result = cancelRecovery(context);

      expect(result.previousStatus).toBe('COOLING_OFF');
      expect(result.newStatus).toBe('ACTIVE');
      expect(result.updatedContext.coolingOffEndsAt).toBeNull();
    });

    it('strictly forbids cancellation once RECOVERY_READY is reached', () => {
      const context = createMockVaultContext({
        status: 'RECOVERY_READY',
        unlockExpiresAt: '2026-10-29T13:00:00.000Z',
      });
      expect(() => cancelRecovery(context)).toThrow(/only permitted during RECOVERY_PENDING or COOLING_OFF/i);
    });
  });

  describe('Server-Gated Simulated Demo Clock', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
      resetDemoClock();
    });

    afterEach(() => {
      resetDemoClock();
      process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    });

    it('advances time and transitions through check-in due and grace period', () => {
      const context = createMockVaultContext();

      // Advance to due
      const step1 = executeDemoClockAction(context, 'advance_to_due');
      expect(step1.updatedContext.status).toBe('CHECK_IN_DUE');

      // Advance to grace
      const step2 = executeDemoClockAction(step1.updatedContext, 'advance_to_grace_expiry');
      expect(step2.updatedContext.status).toBe('RECOVERY_PENDING');
    });

    it('advances through cooling-off to recovery ready', () => {
      const context = createMockVaultContext({
        status: 'COOLING_OFF',
        coolingOffEndsAt: new Date(Date.now() + 60 * 1000).toISOString(),
      });

      const result = executeDemoClockAction(context, 'advance_to_cooldown_expiry');
      expect(result.updatedContext.status).toBe('RECOVERY_READY');
    });

    it('blocks demo clock if demo mode flag is false or missing', () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
      const context = createMockVaultContext();

      expect(() => executeDemoClockAction(context, 'advance_to_due')).toThrow(
        /FORBIDDEN: Demo clock is disabled/i
      );
    });
  });
});
