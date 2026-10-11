// Reward eligibility logic. Reporting NEVER earns a reward.
// Only a VERIFIED cleanup action by a verified Cleaner account is eligible.

export interface CleanupAction {
  cleanupId: string;
  cleanerId: string;
  cleanerVerified: boolean; // Cognito 'cleaner' group + verified flag
  beforeEvidenceKey?: string; // S3 key
  afterEvidenceKey?: string; // S3 key
  verified: boolean; // authority/AI verification passed
  duplicate: boolean; // flagged as duplicate/fraudulent
  issueEligible: boolean; // the targeted issue is a real, verified water issue
}

export interface RewardDecision {
  eligible: boolean;
  reasons: string[];
}

export function evaluateReward(action: CleanupAction): RewardDecision {
  const reasons: string[] = [];

  if (!action.cleanerVerified) reasons.push("Cleaner account is not verified");
  if (!action.issueEligible) reasons.push("Targeted issue is not reward-eligible");
  if (!action.beforeEvidenceKey) reasons.push("Missing BEFORE evidence");
  if (!action.afterEvidenceKey) reasons.push("Missing AFTER evidence");
  if (!action.verified) reasons.push("Cleanup action not verified");
  if (action.duplicate) reasons.push("Duplicate or fraudulent submission");

  return { eligible: reasons.length === 0, reasons };
}
