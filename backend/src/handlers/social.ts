// Awareness alerts handler: public read (with region search), plus an on-demand
// trigger for the monthly pollution analysis (so it can be demoed without waiting
// a month). No social-network publishing — alerts live on the Alerts page.
import { ok, forbidden, type HttpRequest, type HttpResponse } from "../http/types.js";
import * as repo from "../data/repo.js";
import { regionSearchText } from "../data/regions.js";
import { runMonthlyPollutionAnalysis } from "../domain/monthlyAlerts.js";

// GET /posts?q=&talukId=  -> awareness alerts (newest first), smart region search.
export async function listPosts(req: HttpRequest): Promise<HttpResponse> {
  const posts = await repo.listSocialPosts(200);
  let out = posts;
  if (req.query.talukId) out = out.filter((p) => p.talukId === req.query.talukId);
  const needle = (req.query.q ?? "").trim().toLowerCase();
  if (needle) {
    out = out.filter(
      (p) =>
        (p.title ?? "").toLowerCase().includes(needle) ||
        (p.waterBodyName ?? "").toLowerCase().includes(needle) ||
        (p.exactLocation ?? "").toLowerCase().includes(needle) ||
        regionSearchText(p.talukId).includes(needle),
    );
  }
  return ok({ total: posts.length, count: out.length, posts: out });
}

// POST /alerts/run-monthly  -> run the monthly pollution analysis now (authority
// in prod; the local dev-auth shim lets you trigger it for demos). EventBridge
// invokes the same analysis on a monthly schedule in AWS.
export async function runMonthly(req: HttpRequest): Promise<HttpResponse> {
  if (!req.auth?.groups.includes("authority")) return forbidden("Authority role required");
  const result = await runMonthlyPollutionAnalysis();
  return ok(result);
}
