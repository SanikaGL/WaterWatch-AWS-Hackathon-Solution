// Awareness alerts flow: list alerts (with proof media + region), region search,
// and the on-demand monthly pollution analysis. No Instagram publishing.
export {};
const BASE = process.env.BASE || "http://localhost:4000";

async function j(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: any; try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, body: parsed };
}

async function main() {
  const checks: { label: string; pass: boolean }[] = [];
  const check = (label: string, pass: boolean) => { checks.push({ label, pass }); console.log(`   ${pass ? "OK" : "FAIL"} — ${label}`); };

  console.log("1) list alerts (recurring seed should exist):");
  const list = await j("GET", "/posts");
  const recurring = (list.body.posts ?? []).find((p: any) => p.kind === "RECURRING");
  check("at least one alert", (list.body.posts?.length ?? 0) >= 1);
  check("recurring alert has region label", !!recurring?.regionLabel);
  check("recurring alert never accuses", !/blame|accus|culprit|guilty/i.test(recurring?.content ?? ""));
  console.log("   sample title:", recurring?.title);

  console.log("2) run monthly analysis without authority (expect 403):");
  const noAuth = await j("POST", "/alerts/run-monthly");
  check("monthly run blocked for non-authority", noAuth.status === 403);

  console.log("3) run monthly analysis as authority:");
  const run = await j("POST", "/alerts/run-monthly", undefined, { "x-dev-groups": "authority" });
  check("monthly run ok", run.status === 200 && typeof run.body.alertsCreated === "number");
  console.log("   regionsScanned:", run.body.regionsScanned, "alertsCreated:", run.body.alertsCreated);

  console.log("4) a monthly alert now exists with exact location:");
  const list2 = await j("GET", "/posts");
  const monthly = (list2.body.posts ?? []).find((p: any) => p.kind === "MONTHLY_POLLUTION");
  check("monthly alert created", !!monthly);
  check("monthly alert has exact location", !!monthly?.exactLocation);
  check("monthly alert has a period (YYYY-MM)", /^\d{4}-\d{2}$/.test(monthly?.period ?? ""));
  console.log("   monthly title:", monthly?.title);
  console.log("   proof media count:", monthly?.proofMedia?.length ?? 0);

  console.log("5) region search by taluk name (q=belur):");
  const search = await j("GET", "/posts?q=belur");
  const allBelur = (search.body.posts ?? []).every((p: any) => /belur/i.test((p.regionLabel ?? "") + (p.exactLocation ?? "") + (p.waterBodyName ?? "")));
  check("region search returns only matching alerts", (search.body.posts?.length ?? 0) >= 1 && allBelur);

  console.log("6) region filter by talukId:");
  const byId = await j("GET", "/posts?talukId=BELUR");
  check("talukId filter works", (byId.body.posts ?? []).every((p: any) => p.talukId === "BELUR"));

  console.log("7) idempotency: re-run monthly, count of monthly alerts stable:");
  await j("POST", "/alerts/run-monthly", undefined, { "x-dev-groups": "authority" });
  const list3 = await j("GET", "/posts");
  const monthlyCount2 = (list3.body.posts ?? []).filter((p: any) => p.kind === "MONTHLY_POLLUTION").length;
  const monthlyCount1 = (list2.body.posts ?? []).filter((p: any) => p.kind === "MONTHLY_POLLUTION").length;
  check("re-run does not duplicate monthly alerts", monthlyCount2 === monthlyCount1);

  const failed = checks.filter((c) => !c.pass);
  console.log(failed.length === 0 ? "\nALERTS SMOKE OK" : `\nALERTS SMOKE FAILED (${failed.length}): ${failed.map((f) => f.label).join("; ")}`);
  if (failed.length) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
