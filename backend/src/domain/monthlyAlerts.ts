// Monthly pollution analysis: once a month (EventBridge) OR on demand, scan every
// region, find the water body with the HIGHEST pollution in that region for the
// period, and generate one evidence-backed awareness alert per qualifying region.
// AI writes the copy; proof photos/videos come from the actual reports. Never
// names or accuses anyone.
import { nanoid } from "nanoid";
import { config } from "./config.js";
import type { Report, SocialPost } from "./types.js";
import * as repo from "../data/repo.js";
import { generateAwarenessPost } from "../services/ai.js";
import { flattenTaluks, resolveRegion, SEED_WATER_BODIES } from "../data/regions.js";
import { collectProofMedia, dominantLocation } from "./recurringService.js";

export interface MonthlyRunResult {
  period: string;
  regionsScanned: number;
  alertsCreated: number;
  alerts: { talukId: string; waterBodyId?: string; reportCount: number; postId: string }[];
}

function periodOf(date = new Date()): { key: string; label: string; start: Date; end: Date } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  const key = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
  const label = start.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  return { key, label, start, end };
}

function waterBodyName(waterBodyId: string): string {
  return SEED_WATER_BODIES.find((w) => w.waterBodyId === waterBodyId)?.name ?? waterBodyId;
}

/**
 * Run the monthly pollution analysis for a given date (defaults to now).
 * For each taluk: group that period's POLLUTION reports by water body, pick the
 * worst one, and if it meets MONTHLY_POLLUTION_MIN, create a MONTHLY_POLLUTION alert.
 * Idempotent per (talukId, period): re-running overwrites the same alert.
 */
export async function runMonthlyPollutionAnalysis(now = new Date()): Promise<MonthlyRunResult> {
  const period = periodOf(now);
  const taluks = flattenTaluks();
  const result: MonthlyRunResult = { period: period.key, regionsScanned: taluks.length, alertsCreated: 0, alerts: [] };

  for (const t of taluks) {
    const reports = await repo.listReportsByRegion(t.talukId, 500);
    const pollution = reports.filter(
      (r) => r.type === "POLLUTION" && r.createdAt >= period.start.toISOString() && r.createdAt < period.end.toISOString(),
    );
    if (pollution.length === 0) continue;

    // Group by water body (fall back to a region bucket when none).
    const byWb = new Map<string, Report[]>();
    for (const r of pollution) {
      const k = r.waterBodyId ?? `REGION_${t.talukId}`;
      byWb.set(k, [...(byWb.get(k) ?? []), r]);
    }
    // Worst water body in this region for the period.
    let worstKey = ""; let worst: Report[] = [];
    for (const [k, rs] of byWb) if (rs.length > worst.length) { worstKey = k; worst = rs; }
    if (worst.length < config.MONTHLY_POLLUTION_MIN) continue;

    const region = resolveRegion(t.talukId);
    const wbName = worstKey.startsWith("REGION_") ? `${t.talukName} water bodies` : waterBodyName(worstKey);
    const exactLocation = dominantLocation(worst);
    const proofMedia = collectProofMedia(worst);

    const post = await generateAwarenessPost({
      waterBodyName: wbName,
      talukName: t.talukName,
      districtName: t.districtName,
      stateName: region?.stateName,
      exactLocation,
      reportCount: worst.length,
      windowDays: 30,
      issueType: "POLLUTION",
      monthly: true,
      periodLabel: period.label,
    });

    const postId = `MA-${t.talukId}-${period.key}`; // deterministic => idempotent per month
    // Deterministic createdAt (period start) so the DynamoDB SK is stable and a
    // re-run OVERWRITES the same item instead of creating a duplicate.
    const createdAt = period.start.toISOString();
    const social: SocialPost = {
      postId,
      kind: "MONTHLY_POLLUTION",
      waterBodyId: worstKey.startsWith("REGION_") ? undefined : worstKey,
      waterBodyName: wbName,
      exactLocation,
      regionLabel: region ? `${region.talukName}, ${region.districtName}, ${region.stateName}` : undefined,
      stateId: worst[0].stateId,
      districtId: worst[0].districtId,
      talukId: t.talukId,
      title: post.title,
      content: post.content,
      aiSource: post.source,
      reportCount: worst.length,
      windowDays: 30,
      period: period.key,
      proofMedia,
      sourceReportIds: worst.map((r) => r.reportId),
      createdAt,
    };
    await repo.putSocialPost(social);
    result.alertsCreated += 1;
    result.alerts.push({ talukId: t.talukId, waterBodyId: social.waterBodyId, reportCount: worst.length, postId });
  }

  return result;
}
