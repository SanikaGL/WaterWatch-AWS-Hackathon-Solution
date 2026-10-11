// Region tree + per-region summary (counts) + water bodies.
import { ok, badRequest, type HttpRequest, type HttpResponse } from "../http/types.js";
import { REGION_TREE } from "../data/regions.js";
import * as repo from "../data/repo.js";

// GET /regions  -> full state>district>taluk tree (stable IDs)
export async function getRegionTree(_req: HttpRequest): Promise<HttpResponse> {
  return ok({ states: REGION_TREE });
}

// GET /regions/{talukId}/summary -> counts for the region home page
export async function getRegionSummary(req: HttpRequest): Promise<HttpResponse> {
  const talukId = req.pathParams.talukId;
  if (!talukId) return badRequest("talukId required");

  const [reports, floods, waterBodies, events, recurring] = await Promise.all([
    repo.listReportsByRegion(talukId, 200),
    repo.listFloodsByRegion(talukId),
    repo.listWaterBodies(talukId),
    repo.listEventsByRegion(talukId),
    repo.listRecurringByRegion(talukId),
  ]);

  const activeFloods = floods.filter((f) => f.status === "ACTIVE");
  const summary = {
    talukId,
    counts: {
      activeFloods: activeFloods.length,
      pollution: reports.filter((r) => r.type === "POLLUTION").length,
      leakage: reports.filter((r) => r.type === "LEAKAGE").length,
      hazard: reports.filter((r) => r.type === "HAZARD").length,
      waterBodies: waterBodies.length,
      events: events.length,
      recurring: recurring.length,
    },
    activeFloods,
    recurring,
  };
  return ok(summary);
}

// GET /regions/{talukId}/waterbodies -> water bodies WITH report counts + derived status
export async function listWaterBodies(req: HttpRequest): Promise<HttpResponse> {
  const talukId = req.pathParams.talukId;
  if (!talukId) return badRequest("talukId required");
  const waterBodies = await repo.listWaterBodies(talukId);

  const enriched = await Promise.all(
    waterBodies.map(async (wb) => {
      const reports = await repo.listReportsByWaterBody(wb.waterBodyId);
      const pollution = reports.filter((r) => r.type === "POLLUTION").length;
      const leakage = reports.filter((r) => r.type === "LEAKAGE").length;
      // Derive status from unresolved pollution volume.
      const unresolved = reports.filter((r) => r.status !== "RESOLVED").length;
      const status = unresolved >= 5 ? "NEEDS_ATTENTION" : unresolved >= 1 ? "MONITORING" : "OK";
      return { ...wb, status, counts: { pollution, leakage, total: reports.length } };
    })
  );

  return ok({ waterBodies: enriched });
}

// GET /regions/{talukId}/waterbodies/{waterBodyId} -> detail (water body + reports + recurring)
export async function getWaterBodyDetail(req: HttpRequest): Promise<HttpResponse> {
  const { talukId, waterBodyId } = req.pathParams;
  if (!talukId || !waterBodyId) return badRequest("talukId and waterBodyId required");

  const [waterBodies, reports, recurring] = await Promise.all([
    repo.listWaterBodies(talukId),
    repo.listReportsByWaterBody(waterBodyId),
    repo.listRecurringByRegion(talukId),
  ]);

  const waterBody = waterBodies.find((w) => w.waterBodyId === waterBodyId);
  if (!waterBody) return badRequest("water body not found in region");

  const unresolved = reports.filter((r) => r.status !== "RESOLVED").length;
  const status = unresolved >= 5 ? "NEEDS_ATTENTION" : unresolved >= 1 ? "MONITORING" : "OK";

  return ok({
    waterBody: { ...waterBody, status },
    counts: {
      pollution: reports.filter((r) => r.type === "POLLUTION").length,
      leakage: reports.filter((r) => r.type === "LEAKAGE").length,
      total: reports.length,
    },
    reports,
    recurring: recurring.filter((r) => r.waterBodyId === waterBodyId),
  });
}
