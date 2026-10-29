import { RecoveryApproval, RecoveryDecision } from '@/types/recovery';

export const REQUIRED_APPROVAL_THRESHOLD = 2;
export const TOTAL_NOMINEE_SLOTS = 3;

export interface ApprovalEvaluationResult {
  approvedCount: number;
  declinedCount: number;
  thresholdMet: boolean;
  isDuplicate: boolean;
  distinctApprovedNomineeIds: string[];
}

/**
 * Pure function to evaluate a set of recovery decisions.
 * Deduplicates multiple votes from the same nominee and computes distinct approvals.
 */
export function evaluateApprovals(
  existingApprovals: RecoveryApproval[],
  nomineeId: string,
  newDecision: RecoveryDecision
): ApprovalEvaluationResult {
  // Check if this nominee has already submitted a decision
  const existingVote = existingApprovals.find((a) => a.nomineeId === nomineeId);
  const isDuplicate = existingVote !== undefined && existingVote.decision === newDecision;

  // Build current map of unique decisions per nominee
  const decisionsByNominee = new Map<string, RecoveryDecision>();

  for (const approval of existingApprovals) {
    decisionsByNominee.set(approval.nomineeId, approval.decision);
  }

  // Apply or update the current nominee's decision
  decisionsByNominee.set(nomineeId, newDecision);

  const distinctApprovedNomineeIds: string[] = [];
  let declinedCount = 0;

  for (const [id, decision] of decisionsByNominee.entries()) {
    if (decision === 'approve') {
      distinctApprovedNomineeIds.push(id);
    } else if (decision === 'decline') {
      declinedCount++;
    }
  }

  const approvedCount = distinctApprovedNomineeIds.length;
  const thresholdMet = approvedCount >= REQUIRED_APPROVAL_THRESHOLD;

  return {
    approvedCount,
    declinedCount,
    thresholdMet,
    isDuplicate,
    distinctApprovedNomineeIds,
  };
}
