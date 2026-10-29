import { RecoveryApproval, RecoveryDecision, VaultStatus } from '@/types/recovery';
import { evaluateApprovals, REQUIRED_APPROVAL_THRESHOLD } from './approvals';

export interface VaultStateContext {
  vaultId: string;
  status: VaultStatus;
  checkinIntervalSeconds: number;
  gracePeriodSeconds: number;
  coolingOffSeconds: number;
  unlockWindowSeconds: number;
  lastCheckInAt: string;
  nextCheckInAt: string;
  graceEndsAt: string | null;
  coolingOffEndsAt: string | null;
  unlockExpiresAt: string | null;
}

export interface TransitionResult {
  previousStatus: VaultStatus;
  newStatus: VaultStatus;
  updatedContext: VaultStateContext;
  transitionReason: string;
  transitionOccurred: boolean;
}

/**
 * Normalize database and UI variations of status names to canonical VaultStatus.
 */
export function normalizeVaultStatus(status: string): VaultStatus {
  const upper = status.toUpperCase().trim();
  if (upper === 'CHECKIN_DUE' || upper === 'CHECK_IN_DUE') return 'CHECK_IN_DUE';
  if (upper === 'RECOVERY_COOLING_OFF' || upper === 'COOLING_OFF') return 'COOLING_OFF';
  if (upper === 'ACTIVE') return 'ACTIVE';
  if (upper === 'GRACE_PERIOD') return 'GRACE_PERIOD';
  if (upper === 'RECOVERY_PENDING') return 'RECOVERY_PENDING';
  if (upper === 'RECOVERY_READY') return 'RECOVERY_READY';
  if (upper === 'RECOVERED') return 'RECOVERED';
  if (upper === 'CANCELLED') return 'CANCELLED';
  throw new Error(`Unknown or invalid vault status: ${status}`);
}

/**
 * Handle Owner Check-In.
 * Resets timers and returns the vault to ACTIVE if it was in CHECK_IN_DUE,
 * GRACE_PERIOD, or RECOVERY_PENDING.
 */
export function processCheckIn(
  context: VaultStateContext,
  checkInTime: Date = new Date()
): TransitionResult {
  const currentStatus = normalizeVaultStatus(context.status);

  // Check-in not permitted once cooling-off or recovery is live (must use explicit cancelRecovery)
  if (currentStatus === 'COOLING_OFF') {
    throw new Error(
      'Cannot check in during COOLING_OFF: owner must explicitly cancel the recovery process'
    );
  }
  if (currentStatus === 'RECOVERY_READY' || currentStatus === 'RECOVERED') {
    throw new Error(`Cannot check in when vault status is ${currentStatus}`);
  }

  const checkInIso = checkInTime.toISOString();
  const nextCheckInTime = new Date(
    checkInTime.getTime() + context.checkinIntervalSeconds * 1000
  ).toISOString();

  const updatedContext: VaultStateContext = {
    ...context,
    status: 'ACTIVE',
    lastCheckInAt: checkInIso,
    nextCheckInAt: nextCheckInTime,
    graceEndsAt: null,
    coolingOffEndsAt: null,
    unlockExpiresAt: null,
  };

  return {
    previousStatus: currentStatus,
    newStatus: 'ACTIVE',
    updatedContext,
    transitionReason: `Owner check-in recorded; next check-in scheduled for ${nextCheckInTime}`,
    transitionOccurred: currentStatus !== 'ACTIVE',
  };
}

/**
 * Advance scheduled time-based workflow transitions using authoritative server time.
 * Enforces fail-closed behavior: performs one atomic transition per evaluation
 * and never transitions before deadlines elapse.
 */
export function evaluateScheduledTransition(
  context: VaultStateContext,
  currentTime: Date = new Date()
): TransitionResult {
  const currentStatus = normalizeVaultStatus(context.status);
  const nowMs = currentTime.getTime();

  // 1. ACTIVE -> CHECK_IN_DUE (check-in deadline passed)
  if (currentStatus === 'ACTIVE') {
    const nextDueMs = new Date(context.nextCheckInAt).getTime();
    if (nowMs >= nextDueMs) {
      const updatedContext: VaultStateContext = {
        ...context,
        status: 'CHECK_IN_DUE',
      };
      return {
        previousStatus: currentStatus,
        newStatus: 'CHECK_IN_DUE',
        updatedContext,
        transitionReason: 'Check-in deadline has elapsed; reminder due',
        transitionOccurred: true,
      };
    }
  }

  // 2. CHECK_IN_DUE -> GRACE_PERIOD (initiates grace period with graceEndsAt)
  if (currentStatus === 'CHECK_IN_DUE') {
    const graceEndsTime = new Date(
      nowMs + context.gracePeriodSeconds * 1000
    ).toISOString();

    const updatedContext: VaultStateContext = {
      ...context,
      status: 'GRACE_PERIOD',
      graceEndsAt: context.graceEndsAt || graceEndsTime,
    };
    return {
      previousStatus: currentStatus,
      newStatus: 'GRACE_PERIOD',
      updatedContext,
      transitionReason: `Check-in missed; grace period started until ${updatedContext.graceEndsAt}`,
      transitionOccurred: true,
    };
  }

  // 3. GRACE_PERIOD -> RECOVERY_PENDING (grace period elapsed without check-in)
  if (currentStatus === 'GRACE_PERIOD') {
    if (!context.graceEndsAt) {
      throw new Error('Invalid state: GRACE_PERIOD requires graceEndsAt');
    }
    const graceEndsMs = new Date(context.graceEndsAt).getTime();
    if (nowMs >= graceEndsMs) {
      const updatedContext: VaultStateContext = {
        ...context,
        status: 'RECOVERY_PENDING',
      };
      return {
        previousStatus: currentStatus,
        newStatus: 'RECOVERY_PENDING',
        updatedContext,
        transitionReason: 'Grace period expired without check-in; recovery pending nominee approvals',
        transitionOccurred: true,
      };
    }
  }

  // 4. COOLING_OFF -> RECOVERY_READY (cooldown elapsed)
  if (currentStatus === 'COOLING_OFF') {
    if (!context.coolingOffEndsAt) {
      throw new Error('Invalid state: COOLING_OFF requires coolingOffEndsAt');
    }
    const coolingOffEndsMs = new Date(context.coolingOffEndsAt).getTime();
    if (nowMs >= coolingOffEndsMs) {
      const unlockExpiresTime = new Date(
        nowMs + context.unlockWindowSeconds * 1000
      ).toISOString();

      const updatedContext: VaultStateContext = {
        ...context,
        status: 'RECOVERY_READY',
        unlockExpiresAt: unlockExpiresTime,
      };
      return {
        previousStatus: currentStatus,
        newStatus: 'RECOVERY_READY',
        updatedContext,
        transitionReason: `Cooling-off completed; recovery unlock window opened until ${unlockExpiresTime}`,
        transitionOccurred: true,
      };
    }
  }

  // 5. RECOVERY_READY -> Expired (back to RECOVERY_PENDING)
  if (currentStatus === 'RECOVERY_READY') {
    if (!context.unlockExpiresAt) {
      throw new Error('Invalid state: RECOVERY_READY requires unlockExpiresAt');
    }
    const unlockExpiresMs = new Date(context.unlockExpiresAt).getTime();
    if (nowMs >= unlockExpiresMs) {
      const updatedContext: VaultStateContext = {
        ...context,
        status: 'RECOVERY_PENDING',
        coolingOffEndsAt: null,
        unlockExpiresAt: null,
      };
      return {
        previousStatus: currentStatus,
        newStatus: 'RECOVERY_PENDING',
        updatedContext,
        transitionReason: 'Recovery unlock window expired; fresh nominee authorization cycle required',
        transitionOccurred: true,
      };
    }
  }

  // No time criteria met: fail closed, remain in current status
  return {
    previousStatus: currentStatus,
    newStatus: currentStatus,
    updatedContext: context,
    transitionReason: 'No scheduled transition due at this timestamp',
    transitionOccurred: false,
  };
}

/**
 * Handle Nominee Decision during RECOVERY_PENDING.
 * If 2 distinct approvals are met, transitions to COOLING_OFF and sets coolingOffEndsAt.
 */
export function processNomineeDecision(
  context: VaultStateContext,
  existingApprovals: RecoveryApproval[],
  nomineeId: string,
  decision: RecoveryDecision,
  currentTime: Date = new Date()
): {
  transitionResult: TransitionResult;
  approvedCount: number;
  thresholdMet: boolean;
  isDuplicate: boolean;
} {
  const currentStatus = normalizeVaultStatus(context.status);

  if (currentStatus !== 'RECOVERY_PENDING') {
    throw new Error(
      `Nominee decisions are only accepted during RECOVERY_PENDING (current status: ${currentStatus})`
    );
  }

  const evalResult = evaluateApprovals(existingApprovals, nomineeId, decision);

  if (evalResult.thresholdMet) {
    const coolingOffEndsTime = new Date(
      currentTime.getTime() + context.coolingOffSeconds * 1000
    ).toISOString();

    const updatedContext: VaultStateContext = {
      ...context,
      status: 'COOLING_OFF',
      coolingOffEndsAt: coolingOffEndsTime,
    };

    return {
      transitionResult: {
        previousStatus: currentStatus,
        newStatus: 'COOLING_OFF',
        updatedContext,
        transitionReason: `Approval threshold satisfied (${evalResult.approvedCount}/${REQUIRED_APPROVAL_THRESHOLD}); cooling-off period initiated until ${coolingOffEndsTime}`,
        transitionOccurred: true,
      },
      approvedCount: evalResult.approvedCount,
      thresholdMet: true,
      isDuplicate: evalResult.isDuplicate,
    };
  }

  return {
    transitionResult: {
      previousStatus: currentStatus,
      newStatus: currentStatus,
      updatedContext: context,
      transitionReason: `Nominee decision recorded (${evalResult.approvedCount}/${REQUIRED_APPROVAL_THRESHOLD} approvals)`,
      transitionOccurred: false,
    },
    approvedCount: evalResult.approvedCount,
    thresholdMet: false,
    isDuplicate: evalResult.isDuplicate,
  };
}

/**
 * Authenticated Owner Cancellation of a pending recovery or cooling-off period.
 * Strictly permitted during RECOVERY_PENDING and COOLING_OFF.
 */
export function cancelRecovery(
  context: VaultStateContext,
  cancellationTime: Date = new Date()
): TransitionResult {
  const currentStatus = normalizeVaultStatus(context.status);

  if (currentStatus !== 'RECOVERY_PENDING' && currentStatus !== 'COOLING_OFF') {
    throw new Error(
      `Cancellation is only permitted during RECOVERY_PENDING or COOLING_OFF (current status: ${currentStatus})`
    );
  }

  const cancelIso = cancellationTime.toISOString();
  const nextCheckInTime = new Date(
    cancellationTime.getTime() + context.checkinIntervalSeconds * 1000
  ).toISOString();

  const updatedContext: VaultStateContext = {
    ...context,
    status: 'ACTIVE',
    lastCheckInAt: cancelIso,
    nextCheckInAt: nextCheckInTime,
    graceEndsAt: null,
    coolingOffEndsAt: null,
    unlockExpiresAt: null,
  };

  return {
    previousStatus: currentStatus,
    newStatus: 'ACTIVE',
    updatedContext,
    transitionReason: `Owner cancelled recovery attempt at ${cancelIso}; vault returned to ACTIVE`,
    transitionOccurred: true,
  };
}
