// Report handlers: anonymous create + list/get + status update (authority).
import { nanoid } from "nanoid";
import { ok, created, badRequest, notFound, forbidden, type HttpRequest, type HttpResponse } from "../http/types.js";
import { validateReport } from "../domain/validation.js";
import type { Report, ReportStatus, Comment } from "../domain/types.js";
import * as repo from "../data/repo.js";
import { maybeEvaluateRecurring } from "../domain/recurringService.js";

const VALID_STATUS: ReportStatus[] = ["REPORTED", "UNDER_REVIEW", "VERIFIED", "ASSIGNED", "RESOLVED"];

// Resolve a signed-in user's DISPLAY NAME: their saved profile name (volunteer/
// cleaner or authority), else the email handle, else "Member". Never the raw email.
async function displayNameFor(auth: NonNullable<HttpRequest["auth"]>): Promise<string> {
  const vol = await repo.getVolunteer(auth.sub);
  if (vol?.name) return vol.name;
  const authority = await repo.getAuthority(auth.sub);
  if (authority?.name) return authority.name;
  if (auth.email) return auth.email.split("@")[0];
  return "Member";
}

// POST /reports  (anonymous, no auth)
export async function createReport(req: HttpRequest): Promise<HttpResponse> {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const v = validateReport(b as never);
  if (!v.valid) return badRequest("Invalid report", v.errors);

  const now = new Date().toISOString();
  const report: Report = {
    reportId: nanoid(12),
    type: b.type as Report["type"],
    status: "REPORTED",
    description: String(b.description),
    locationLabel: String(b.locationLabel),
    lat: typeof b.lat === "number" ? b.lat : undefined,
    lng: typeof b.lng === "number" ? b.lng : undefined,
    media: Array.isArray(b.media) ? (b.media as Report["media"]) : [],
    noticedWhen: b.noticedWhen ? String(b.noticedWhen) : undefined,
    stateId: String(b.stateId),
    districtId: String(b.districtId),
    talukId: String(b.talukId),
    waterBodyId: b.waterBodyId ? String(b.waterBodyId) : undefined,
    createdAt: now,
    upvotes: 0,
  };

  // Attribution: if a logged-in volunteer/cleaner/authority reports, attach their
  // real identity. Anonymous citizens stay anonymous (no identity attached).
  if (req.auth) {
    const role = (["volunteer", "cleaner", "authority"] as const).find((g) => req.auth!.groups.includes(g));
    report.reporterId = req.auth.sub;
    report.reporterName = await displayNameFor(req.auth); // real profile name, not email
    report.reporterRole = role;
  }

  await repo.putReport(report);

  // Fire-and-check recurring evaluation (EventBridge is the prod path; here we also
  // evaluate synchronously so the demo surfaces recurring issues immediately).
  let recurring = null;
  try {
    recurring = await maybeEvaluateRecurring(report);
  } catch {
    // Never fail the report because of downstream recurring/AI issues.
  }

  return created({ report, recurring });
}

// GET /regions/{talukId}/reports
export async function listReportsByRegion(req: HttpRequest): Promise<HttpResponse> {
  const talukId = req.pathParams.talukId;
  if (!talukId) return badRequest("talukId required");
  const type = req.query.type;
  let reports = await repo.listReportsByRegion(talukId);
  if (type) reports = reports.filter((r) => r.type === type);
  return ok({ reports });
}

// GET /waterbodies/{waterBodyId}/reports
export async function listReportsByWaterBody(req: HttpRequest): Promise<HttpResponse> {
  const waterBodyId = req.pathParams.waterBodyId;
  if (!waterBodyId) return badRequest("waterBodyId required");
  const reports = await repo.listReportsByWaterBody(waterBodyId);
  return ok({ reports });
}

// GET /regions/{talukId}/reports/{reportId}?createdAt=...
export async function getReport(req: HttpRequest): Promise<HttpResponse> {
  const { talukId, reportId } = req.pathParams;
  const createdAt = req.query.createdAt;
  if (!talukId || !reportId || !createdAt) return badRequest("talukId, reportId, createdAt required");
  const report = await repo.getReport(talukId, createdAt, reportId);
  if (!report) return notFound("Report not found");
  const comments = await repo.listComments(reportId);
  return ok({ report, comments });
}

// PATCH /regions/{talukId}/reports/{reportId}/status  (authority only)
export async function updateReportStatus(req: HttpRequest): Promise<HttpResponse> {
  if (!req.auth?.groups.includes("authority")) return forbidden("Authority role required");
  const { talukId, reportId } = req.pathParams;
  const b = (req.body ?? {}) as Record<string, unknown>;
  const status = String(b.status) as ReportStatus;
  const createdAt = String(b.createdAt);
  if (!talukId || !reportId || !createdAt) return badRequest("talukId, reportId, createdAt required");
  if (!VALID_STATUS.includes(status)) return badRequest(`status must be one of ${VALID_STATUS.join(", ")}`);
  await repo.updateReportStatus(talukId, createdAt, reportId, status);
  return ok({ reportId, status });
}

// POST /reports/{reportId}/comments  (works for reports AND volunteer posts via targetId)
// Logged-in volunteer/cleaner/authority comments carry their real identity.
export async function addComment(req: HttpRequest): Promise<HttpResponse> {
  const reportId = req.pathParams.reportId; // target id (report or post)
  const b = (req.body ?? {}) as Record<string, unknown>;
  if (!reportId) return badRequest("reportId required");
  if (!b.text || String(b.text).trim().length < 1) return badRequest("comment text required");

  const role = req.auth
    ? (["volunteer", "cleaner", "authority"] as const).find((g) => req.auth!.groups.includes(g))
    : undefined;

  const comment: Comment = {
    commentId: nanoid(10),
    reportId,
    // Logged-in users ALWAYS comment under their real profile name (resolved
    // server-side, never the email). Guests are Anonymous.
    author: req.auth ? await displayNameFor(req.auth) : "Anonymous",
    authorId: req.auth?.sub,
    authorRole: role,
    text: String(b.text).slice(0, 1000),
    upvotes: 0,
    createdAt: new Date().toISOString(),
  };
  await repo.putComment(comment);
  return created({ comment });
}
