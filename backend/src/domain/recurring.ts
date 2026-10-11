// Recurring-issue detection logic. Pure functions = easy to unit test.
import type { Report } from "./types.js";

export interface RecurringEvalInput {
  reports: Report[]; // reports for ONE water body (or location group)
  threshold: number;
  windowDays: number;
  now?: Date;
}

export interface RecurringEvalResult {
  triggered: boolean;
  countInWindow: number;
  sourceReportIds: string[];
}

/**
 * Returns whether a recurring issue should be raised for a group of reports
 * concerning the same water body / location within the time window.
 * Counts independent reports (by reportId) within `windowDays` of `now`.
 */
export function evaluateRecurring(input: RecurringEvalInput): RecurringEvalResult {
  const now = input.now ?? new Date();
  const windowMs = input.windowDays * 24 * 60 * 60 * 1000;
  const cutoff = now.getTime() - windowMs;

  const inWindow = input.reports.filter((r) => {
    const t = new Date(r.createdAt).getTime();
    return Number.isFinite(t) && t >= cutoff && t <= now.getTime();
  });

  // Deduplicate by reportId (independent reports only).
  const uniq = new Map<string, Report>();
  for (const r of inWindow) uniq.set(r.reportId, r);
  const unique = [...uniq.values()];

  return {
    triggered: unique.length >= input.threshold,
    countInWindow: unique.length,
    sourceReportIds: unique.map((r) => r.reportId),
  };
}
