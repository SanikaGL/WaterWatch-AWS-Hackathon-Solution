// Flood handlers: global list, region list, detail, create (authority), citizen updates.
import { nanoid } from "nanoid";
import { ok, created, badRequest, notFound, forbidden, type HttpRequest, type HttpResponse } from "../http/types.js";
import type { Flood, FloodUpdate } from "../domain/types.js";
import * as repo from "../data/repo.js";
import { resolveRegion } from "../data/regions.js";

// GET /floods?status=ACTIVE  (global, exception to region filtering)
export async function listFloods(req: HttpRequest): Promise<HttpResponse> {
  let floods = await repo.listAllFloods();
  const status = req.query.status;
  if (status) floods = floods.filter((f) => f.status === status);
  return ok({ floods });
}

// GET /regions/{talukId}/floods
export async function listFloodsByRegion(req: HttpRequest): Promise<HttpResponse> {
  const talukId = req.pathParams.talukId;
  if (!talukId) return badRequest("talukId required");
  const floods = await repo.listFloodsByRegion(talukId);
  return ok({ floods });
}

// GET /floods/{floodId}?createdAt=...  (createdAt optional; falls back to scan of all)
export async function getFlood(req: HttpRequest): Promise<HttpResponse> {
  const floodId = req.pathParams.floodId;
  if (!floodId) return badRequest("floodId required");
  let flood: Flood | undefined;
  if (req.query.createdAt) {
    flood = await repo.getFlood(req.query.createdAt, floodId);
  }
  if (!flood) {
    const all = await repo.listAllFloods(200);
    flood = all.find((f) => f.floodId === floodId);
  }
  if (!flood) return notFound("Flood not found");
  const updates = await repo.listFloodUpdates(floodId);
  return ok({ flood, updates });
}

// POST /floods  (authority declares an incident FOR THEIR OWN REGION)
// Region is taken from the authority's bound profile — they cannot create an
// incident for a region they are not responsible for.
export async function createFlood(req: HttpRequest): Promise<HttpResponse> {
  if (!req.auth?.groups.includes("authority")) return forbidden("Authority role required");

  const profile = await repo.getAuthority(req.auth.sub);
  if (!profile) return forbidden("No authority profile is bound to this account");

  const b = (req.body ?? {}) as Record<string, unknown>;
  if (!b.title || String(b.title).trim().length < 3) return badRequest("title is required");
  if (!b.locationLabel || String(b.locationLabel).trim().length < 2) return badRequest("exact location is required");
  const severity = b.severity as Flood["severity"];
  if (!["LOW", "MODERATE", "SEVERE"].includes(severity)) return badRequest("severity must be LOW, MODERATE or SEVERE");

  const region = resolveRegion(profile.talukId);
  const now = new Date().toISOString();
  const flood: Flood = {
    floodId: `FL-${nanoid(8)}`,
    title: String(b.title).slice(0, 160),
    locationLabel: String(b.locationLabel).slice(0, 200),
    severity,
    status: "ACTIVE",
    summary: b.summary ? String(b.summary).slice(0, 2000) : "",
    media: Array.isArray(b.media) ? (b.media as Flood["media"]) : [],
    updateCount: 0,
    volunteerCount: 0,
    authorityStatus: "Declared by authority",
    // Region is the authority's OWN region (ignore any client-supplied region).
    stateId: profile.stateId,
    districtId: profile.districtId,
    talukId: profile.talukId,
    regionLabel: region ? `${region.talukName}, ${region.districtName}, ${region.stateName}` : undefined,
    createdById: req.auth.sub,
    createdByName: profile.name,
    createdAt: now,
  };
  await repo.putFlood(flood);
  return created({ flood });
}

// PATCH /floods/{floodId}/status (authority)
export async function updateFloodStatus(req: HttpRequest): Promise<HttpResponse> {
  if (!req.auth?.groups.includes("authority")) return forbidden("Authority role required");
  const floodId = req.pathParams.floodId;
  const b = (req.body ?? {}) as Record<string, unknown>;
  const createdAt = String(b.createdAt);
  const status = b.status as Flood["status"];
  if (!floodId || !createdAt) return badRequest("floodId and createdAt required");
  if (!["ACTIVE", "MONITORING", "RESOLVED"].includes(status)) return badRequest("invalid status");
  const flood = await repo.getFlood(createdAt, floodId);
  if (!flood) return notFound("Flood not found");
  flood.status = status;
  await repo.putFlood(flood);
  return ok({ floodId, status });
}

// POST /floods/{floodId}/updates  (citizen live update; anonymous allowed)
export async function addFloodUpdate(req: HttpRequest): Promise<HttpResponse> {
  const floodId = req.pathParams.floodId;
  const b = (req.body ?? {}) as Record<string, unknown>;
  if (!floodId) return badRequest("floodId required");
  if (!b.text || String(b.text).trim().length < 1) return badRequest("update text required");

  // Attribution: logged-in volunteer/cleaner/authority posts under their real
  // PROFILE NAME (resolved server-side, never the email); everyone else Anonymous.
  const role = req.auth
    ? (["volunteer", "cleaner", "authority"] as const).find((g) => req.auth!.groups.includes(g))
    : undefined;

  let authorName = "Anonymous";
  if (req.auth) {
    const vol = await repo.getVolunteer(req.auth.sub);
    const authority = vol ? undefined : await repo.getAuthority(req.auth.sub);
    authorName = vol?.name || authority?.name || (req.auth.email ? req.auth.email.split("@")[0] : "Member");
  }

  const update: FloodUpdate = {
    updateId: nanoid(10),
    floodId,
    author: authorName,
    authorId: req.auth?.sub,
    authorRole: role,
    text: String(b.text),
    hazardType: b.hazardType as FloodUpdate["hazardType"],
    media: Array.isArray(b.media) ? (b.media as FloodUpdate["media"]) : [],
    lat: typeof b.lat === "number" ? b.lat : undefined,
    lng: typeof b.lng === "number" ? b.lng : undefined,
    upvotes: 0,
    createdAt: new Date().toISOString(),
  };
  await repo.putFloodUpdate(update);

  // Keep the incident's update count accurate (community momentum signal).
  try {
    const all = await repo.listAllFloods(200);
    const flood = all.find((f) => f.floodId === floodId);
    if (flood) {
      flood.updateCount = (flood.updateCount ?? 0) + 1;
      await repo.putFlood(flood);
    }
  } catch {
    // non-fatal: the update itself succeeded
  }

  return created({ update });
}
