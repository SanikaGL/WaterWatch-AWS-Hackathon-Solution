// Orchestrates recurring-issue detection -> awareness post generation -> store.
// Pure threshold logic lives in recurring.ts; this adds data + AI side-effects.
import { nanoid } from "nanoid";
import { config } from "./config.js";
import { evaluateRecurring } from "./recurring.js";
import type { Report, RecurringIssue, SocialPost, MediaRef } from "./types.js";
import * as repo from "../data/repo.js";
import { generateAwarenessPost } from "../services/ai.js";
import { flattenTaluks, SEED_WATER_BODIES, resolveRegion } from "../data/regions.js";

// Collect up to `max` proof media (photo/video) from a set of reports, newest first.
export function collectProofMedia(reports: Report[], max = 8): MediaRef[] {
  const out: MediaRef[] = [];
  for (const r of [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    for (const m of r.media ?? []) {
      if (out.length >= max) return out;
      if (!out.some((x) => x.key === m.key)) out.push(m);
    }
  }
  return out;
}

// The locationLabel reported most often (the "exact location" of the concern).
export function dominantLocation(reports: Report[]): string | undefined {
  const counts = new Map<string, number>();
  for (const r of reports) if (r.locationLabel) counts.set(r.locationLabel, (counts.get(r.locationLabel) ?? 0) + 1);
  let best: string | undefined; let bestN = 0;
  for (const [loc, n] of counts) if (n > bestN) { best = loc; bestN = n; }
  return best;
}

export interface RecurringOutcome {
  triggered: boolean;
  countInWindow: number;
  recurringId?: string;
  postId?: string;
}

function displayNames(talukId: string, waterBodyId?: string) {
  const taluk = flattenTaluks().find((t) => t.talukId === talukId);
  const wb = SEED_WATER_BODIES.find((w) => w.waterBodyId === waterBodyId);
  return {
    talukName: taluk?.talukName ?? talukId,
    districtName: taluk?.districtName ?? "",
    waterBodyName: wb?.name ?? waterBodyId ?? "the water body",
  };
}

/**
 * Evaluate recurring status for the water body / region of a just-created report.
 * If threshold reached, create a RecurringIssue + an awareness SocialPost (DRAFT).
 * Publishing to Instagram happens via a separate explicit action (socialPost handler).
 */
export async function maybeEvaluateRecurring(report: Report): Promise<RecurringOutcome> {
  // Group by water body when present, else by region/location.
  const groupReports: Report[] = report.waterBodyId
    ? await repo.listReportsByWaterBody(report.waterBodyId)
    : (await repo.listReportsByRegion(report.talukId)).filter((r) => r.type === report.type);

  const result = evaluateRecurring({
    reports: groupReports,
    threshold: config.REPORT_THRESHOLD,
    windowDays: config.TIME_WINDOW_DAYS,
  });

  if (!result.triggered) {
    return { triggered: false, countInWindow: result.countInWindow };
  }

  const waterBodyId = report.waterBodyId ?? `REGION_${report.talukId}`;
  const now = new Date().toISOString();

  const recurring: RecurringIssue = {
    recurringId: nanoid(10),
    waterBodyId,
    reportCount: result.countInWindow,
    windowDays: config.TIME_WINDOW_DAYS,
    sourceReportIds: result.sourceReportIds,
    stateId: report.stateId,
    districtId: report.districtId,
    talukId: report.talukId,
    createdAt: now,
  };
  await repo.putRecurring(recurring);

  const names = displayNames(report.talukId, report.waterBodyId);
  const region = resolveRegion(report.talukId);
  // Gather the source reports to attach real proof + the exact location.
  const sourceReports = groupReports.filter((r) => result.sourceReportIds.includes(r.reportId));
  const exactLocation = dominantLocation(sourceReports) ?? report.locationLabel;
  const proofMedia = collectProofMedia(sourceReports);

  const post = await generateAwarenessPost({
    waterBodyName: names.waterBodyName,
    talukName: names.talukName,
    districtName: names.districtName,
    stateName: region?.stateName,
    exactLocation,
    reportCount: result.countInWindow,
    windowDays: config.TIME_WINDOW_DAYS,
    issueType: report.type,
  });

  const social: SocialPost = {
    postId: nanoid(10),
    kind: "RECURRING",
    recurringId: recurring.recurringId,
    waterBodyId: report.waterBodyId,
    waterBodyName: names.waterBodyName,
    exactLocation,
    regionLabel: region ? `${region.talukName}, ${region.districtName}, ${region.stateName}` : undefined,
    stateId: report.stateId,
    districtId: report.districtId,
    talukId: report.talukId,
    title: post.title,
    content: post.content,
    aiSource: post.source,
    reportCount: result.countInWindow,
    windowDays: config.TIME_WINDOW_DAYS,
    proofMedia,
    sourceReportIds: result.sourceReportIds,
    createdAt: now,
  };
  await repo.putSocialPost(social);

  return {
    triggered: true,
    countInWindow: result.countInWindow,
    recurringId: recurring.recurringId,
    postId: social.postId,
  };
}
