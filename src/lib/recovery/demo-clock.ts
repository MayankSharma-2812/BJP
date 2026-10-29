import { DemoClockAction } from '@/types/api';
import { evaluateScheduledTransition, VaultStateContext } from './state-machine';

export const DEMO_CHECKIN_INTERVAL_SECONDS = 120; // 2 minutes
export const DEMO_GRACE_PERIOD_SECONDS = 120; // 2 minutes
export const DEMO_COOLING_OFF_SECONDS = 120; // 2 minutes
export const DEMO_UNLOCK_WINDOW_SECONDS = 86400; // 24 hours

export interface DemoClockState {
  simulatedTimeMs: number;
  offsetSeconds: number;
}

/**
 * Global in-memory simulated clock offset for demo mode.
 * Server-gated to ensure it is never accessible in production.
 */
let globalSimulatedOffsetSeconds = 0;

/**
 * Verify whether Demo Mode is permissible in the current runtime environment.
 */
export function isDemoModePermitted(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

/**
 * Assert that Demo Mode is enabled; throws an unauthorized error otherwise.
 */
export function assertDemoModeEnabled(): void {
  if (!isDemoModePermitted()) {
    throw new Error('FORBIDDEN: Demo clock is disabled in production mode');
  }
}

/**
 * Get current time, incorporating the simulated demo offset if active.
 */
export function getAuthoritativeTime(): Date {
  if (isDemoModePermitted() && globalSimulatedOffsetSeconds !== 0) {
    return new Date(Date.now() + globalSimulatedOffsetSeconds * 1000);
  }
  return new Date();
}

/**
 * Reset simulated clock back to real system time.
 */
export function resetDemoClock(): void {
  globalSimulatedOffsetSeconds = 0;
}

/**
 * Advance simulated clock by a specific number of seconds.
 */
export function advanceSimulatedSeconds(seconds: number): Date {
  assertDemoModeEnabled();
  if (seconds <= 0 || !Number.isFinite(seconds)) {
    throw new Error('Seconds to advance must be a positive number');
  }
  globalSimulatedOffsetSeconds += seconds;
  return getAuthoritativeTime();
}

/**
 * Apply a demo clock action to a VaultStateContext and advance transitions accordingly.
 */
export function executeDemoClockAction(
  context: VaultStateContext,
  action: DemoClockAction,
  seconds?: number
): { updatedContext: VaultStateContext; simulatedTime: string; notes: string } {
  assertDemoModeEnabled();

  let effectiveTime = getAuthoritativeTime();
  let notes = '';

  switch (action) {
    case 'reset_demo':
      resetDemoClock();
      effectiveTime = getAuthoritativeTime();
      notes = 'Demo clock reset to real system time';
      break;

    case 'advance_seconds':
      if (!seconds || seconds <= 0) {
        throw new Error('advance_seconds requires positive seconds');
      }
      effectiveTime = advanceSimulatedSeconds(seconds);
      notes = `Advanced simulated clock by ${seconds}s`;
      break;

    case 'advance_to_due': {
      const dueMs = new Date(context.nextCheckInAt).getTime();
      const currentMs = effectiveTime.getTime();
      const diffSeconds = Math.max(1, Math.ceil((dueMs - currentMs) / 1000) + 1);
      effectiveTime = advanceSimulatedSeconds(diffSeconds);
      notes = `Advanced to check-in due (+${diffSeconds}s)`;
      break;
    }

    case 'advance_to_grace_expiry': {
      let activeContext = context;
      if (activeContext.status === 'CHECK_IN_DUE') {
        const graceTransition = evaluateScheduledTransition(activeContext, effectiveTime);
        activeContext = graceTransition.updatedContext;
      }

      let targetMs = activeContext.graceEndsAt
        ? new Date(activeContext.graceEndsAt).getTime()
        : 0;
      if (!targetMs) {
        targetMs =
          new Date(activeContext.nextCheckInAt).getTime() +
          activeContext.gracePeriodSeconds * 1000;
      }
      const currentMs = effectiveTime.getTime();
      const diffSeconds = Math.max(1, Math.ceil((targetMs - currentMs) / 1000) + 1);
      effectiveTime = advanceSimulatedSeconds(diffSeconds);
      notes = `Advanced to grace period expiry (+${diffSeconds}s)`;
      context = activeContext;
      break;
    }

    case 'advance_to_cooldown_expiry': {
      if (!context.coolingOffEndsAt) {
        throw new Error('Cannot advance to cooldown expiry: vault is not in COOLING_OFF');
      }
      const cooldownMs = new Date(context.coolingOffEndsAt).getTime();
      const currentMs = effectiveTime.getTime();
      const diffSeconds = Math.max(1, Math.ceil((cooldownMs - currentMs) / 1000) + 1);
      effectiveTime = advanceSimulatedSeconds(diffSeconds);
      notes = `Advanced past cooling-off deadline (+${diffSeconds}s)`;
      break;
    }

    default:
      throw new Error(`Unsupported demo clock action: ${action}`);
  }

  // Evaluate transitions under the newly simulated timestamp
  const transition = evaluateScheduledTransition(context, effectiveTime);

  return {
    updatedContext: transition.updatedContext,
    simulatedTime: effectiveTime.toISOString(),
    notes: `${notes}. ${transition.transitionReason}`,
  };
}
