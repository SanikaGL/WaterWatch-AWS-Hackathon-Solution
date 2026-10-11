// Authority handlers: public directory (list/get/search), the authority's own
// profile, and the region-scoped dashboard overview.
// Authorities are SEEDED only (never self-signup); credentials live in Cognito.
import { ok, badRequest, notFound, forbidden, type HttpRequest, type HttpResponse } from "../http/types.js";
import * as repo from "../data/repo.js";
import { flattenTaluks, resolveRegion, regionSearchText } from "../data/regions.js";
import type { Report, AuthorityProfile } from "../domain/types.js";

// Attach a resolved "Taluk, District, State" label for display.
function publicAuthority(a: AuthorityProfile) {
  const r = resolveRegion(a.talukId);
  return {
    authorityId: a.authorityId,
    name: a.name,
    designation: a.designation,
    department: a.department,
    bio: a.bio,
    avatarKey: a.avatarKey,
    email: a.email,
    phone: a.phone,
    stateId: a.stateId,
    districtId: a.districtId,
    talukId: a.talukId,
    regionLabel: r ? `${r.talukName}, ${r.districtName}, ${r.stateName}` : undefined,
    createdAt: a.createdAt,
  };
}

// GET /authorities?q=&talukId= -> public directory, smart (name-or-region) search.
export async function listAuthorities(req: HttpRequest): Promise<HttpResponse> {
  const all = await repo.listAuthorities();
  let out = all;
  if (req.query.talukId) out = out.filter((a) => a.talukId === req.query.talukId);
  const needle = (req.query.q ?? "").trim().toLowerCase();
  if (needle) {
    out = out.filter(
      (a) =>
        a.name.toLowerCase().includes(needle) ||
        a.designation.toLowerCase().includes(needle) ||
        a.department.toLowerCase().includes(needle) ||
        regionSearchText(a.talukId).includes(needle),
    );
  }
  return ok({ total: all.length, count: out.length, authorities: out.map(publicAuthority) });
}

// GET /authorities/{authorityId} -> single authority profile.
export async function getAuthorityProfile(req: HttpRequest): Promise<HttpResponse> {
  const id = req.pathParams.authorityId;
  if (!id) return badRequest("authorityId required");
  const a = await repo.getAuthority(id);
  if (!a) return notFound("Authority not found");
  return ok({ authority: publicAuthority(a) });
}

// GET /authority/me -> the signed-in authority's own profile + region binding.
export async function me(req: HttpRequest): Promise<HttpResponse> {
  if (!req.auth?.groups.includes("authority")) return forbidden("Authority role required");
  const a = await repo.getAuthority(req.auth.sub);
  if (!a) return notFound("No authority profile bound to this account");
  return ok({ authority: publicAuthority(a) });
}

// GET /authority/overview -> dashboard aggregates. Scoped to the authority's OWN
// region when a profile binding exists; otherwise falls back to all known taluks.
export async function overview(req: HttpRequest): Promise<HttpResponse> {
  if (!req.auth?.groups.includes("authority")) return forbidden("Authority role required");

  const profile = await repo.getAuthority(req.auth.sub);
  const taluks = profile
    ? flattenTaluks().filter((t) => t.talukId === profile.talukId)
    : flattenTaluks();

  let allReports: Report[] = [];
  let activeFloods = 0;
  let recurring = 0;

  for (const t of taluks) {
    const [reports, floods, recur] = await Promise.all([
      repo.listReportsByRegion(t.talukId, 200),
      repo.listFloodsByRegion(t.talukId),
      repo.listRecurringByRegion(t.talukId),
    ]);
    allReports = allReports.concat(reports);
    activeFloods += floods.filter((f) => f.status === "ACTIVE").length;
    recurring += recur.length;
  }

  const pending = allReports
    .filter((r) => r.status === "REPORTED" || r.status === "UNDER_REVIEW")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50);

  return ok({
    region: profile ? publicAuthority(profile).regionLabel : "All regions",
    scopedTalukId: profile?.talukId,
    totals: {
      reports: allReports.length,
      pollution: allReports.filter((r) => r.type === "POLLUTION").length,
      leakage: allReports.filter((r) => r.type === "LEAKAGE").length,
      hazard: allReports.filter((r) => r.type === "HAZARD").length,
      activeFloods,
      recurring,
      pending: pending.length,
      resolved: allReports.filter((r) => r.status === "RESOLVED").length,
    },
    pending,
  });
}
