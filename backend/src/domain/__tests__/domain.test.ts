import { describe, it, expect } from "vitest";
import { evaluateRecurring } from "../recurring.js";
import { evaluateReward, type CleanupAction } from "../reward.js";
import { validateReport } from "../validation.js";
import type { Report } from "../types.js";

function makeReport(id: string, daysAgo: number): Report {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    reportId: id,
    type: "POLLUTION",
    status: "REPORTED",
    description: "waste entering lake",
    locationLabel: "north bank",
    media: [],
    stateId: "KA",
    districtId: "HASSAN",
    talukId: "BELUR",
    waterBodyId: "BELUR_LAKE",
    createdAt: d.toISOString(),
    upvotes: 0,
  };
}

describe("evaluateRecurring", () => {
  const now = new Date();

  it("triggers at or above threshold within window", () => {
    const reports = ["1", "2", "3", "4", "5"].map((id) => makeReport(id, 2));
    const res = evaluateRecurring({ reports, threshold: 5, windowDays: 30, now });
    expect(res.triggered).toBe(true);
    expect(res.countInWindow).toBe(5);
    expect(res.sourceReportIds).toHaveLength(5);
  });

  it("does not trigger below threshold", () => {
    const reports = ["1", "2", "3"].map((id) => makeReport(id, 2));
    const res = evaluateRecurring({ reports, threshold: 5, windowDays: 30, now });
    expect(res.triggered).toBe(false);
    expect(res.countInWindow).toBe(3);
  });

  it("ignores reports outside the time window", () => {
    const recent = ["1", "2", "3"].map((id) => makeReport(id, 2));
    const old = ["4", "5"].map((id) => makeReport(id, 60)); // outside 30d
    const res = evaluateRecurring({
      reports: [...recent, ...old],
      threshold: 5,
      windowDays: 30,
      now,
    });
    expect(res.triggered).toBe(false);
    expect(res.countInWindow).toBe(3);
  });

  it("deduplicates reports by id", () => {
    const dup = [makeReport("1", 1), makeReport("1", 1), makeReport("2", 1)];
    const res = evaluateRecurring({ reports: dup, threshold: 5, windowDays: 30, now });
    expect(res.countInWindow).toBe(2);
  });

  it("respects configurable threshold", () => {
    const reports = ["1", "2", "3"].map((id) => makeReport(id, 1));
    const res = evaluateRecurring({ reports, threshold: 3, windowDays: 30, now });
    expect(res.triggered).toBe(true);
  });
});

describe("evaluateReward", () => {
  const base: CleanupAction = {
    cleanupId: "c1",
    cleanerId: "u1",
    cleanerVerified: true,
    beforeEvidenceKey: "cleanup/before/x.jpg",
    afterEvidenceKey: "cleanup/after/x.jpg",
    verified: true,
    duplicate: false,
    issueEligible: true,
  };

  it("is eligible when all conditions met", () => {
    expect(evaluateReward(base).eligible).toBe(true);
  });

  it("is NOT eligible without verification", () => {
    const r = evaluateReward({ ...base, verified: false });
    expect(r.eligible).toBe(false);
    expect(r.reasons).toContain("Cleanup action not verified");
  });

  it("is NOT eligible for unverified cleaner", () => {
    expect(evaluateReward({ ...base, cleanerVerified: false }).eligible).toBe(false);
  });

  it("is NOT eligible without before/after evidence", () => {
    expect(evaluateReward({ ...base, beforeEvidenceKey: undefined }).eligible).toBe(false);
    expect(evaluateReward({ ...base, afterEvidenceKey: undefined }).eligible).toBe(false);
  });

  it("is NOT eligible when duplicate/fraudulent", () => {
    expect(evaluateReward({ ...base, duplicate: true }).eligible).toBe(false);
  });
});

describe("validateReport", () => {
  const good = {
    type: "POLLUTION" as const,
    description: "sewage entering lake",
    locationLabel: "north bank",
    stateId: "KA",
    districtId: "HASSAN",
    talukId: "BELUR",
    waterBodyId: "BELUR_LAKE",
  };

  it("accepts a valid pollution report", () => {
    expect(validateReport(good).valid).toBe(true);
  });

  it("accepts pollution without a water body (water body no longer required)", () => {
    const r = validateReport({ ...good, waterBodyId: undefined });
    expect(r.valid).toBe(true);
  });

  it("accepts leakage without a water body", () => {
    const r = validateReport({ ...good, type: "LEAKAGE", waterBodyId: undefined });
    expect(r.valid).toBe(true);
  });

  it("rejects missing region ids", () => {
    const r = validateReport({ ...good, talukId: undefined });
    expect(r.valid).toBe(false);
  });
});
