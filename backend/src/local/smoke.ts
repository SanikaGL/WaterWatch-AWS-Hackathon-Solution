// End-to-end smoke test against the running local API (http://localhost:4000).
export {};
const BASE = process.env.BASE || "http://localhost:4000";

async function j(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, body: parsed };
}

async function main() {
  console.log("1) health:", (await j("GET", "/health")).body);

  console.log("\n2) create POLLUTION report on BELUR_LAKE (should trigger recurring):");
  const create = await j("POST", "/reports", {
    type: "POLLUTION",
    description: "Fresh plastic waste spotted near the inlet",
    locationLabel: "Inlet, Belur Lake",
    stateId: "KA",
    districtId: "HASSAN",
    talukId: "BELUR",
    waterBodyId: "BELUR_LAKE",
    lat: 13.166,
    lng: 75.86,
  });
  console.log("   status:", create.status);
  console.log("   recurring:", JSON.stringify((create.body as any).recurring));

  console.log("\n3) list reports by region BELUR (count):");
  const list = await j("GET", "/regions/BELUR/reports");
  console.log("   total:", (list.body as any).reports.length);

  console.log("\n4) list reports by water body BELUR_LAKE (count):");
  const wb = await j("GET", "/waterbodies/BELUR_LAKE/reports");
  console.log("   total:", (wb.body as any).reports.length);

  console.log("\n5) authority status update WITHOUT role (should be 403):");
  const r = (list.body as any).reports[0];
  const noAuth = await j("PATCH", `/regions/BELUR/reports/${r.reportId}/status`, {
    status: "VERIFIED", createdAt: r.createdAt,
  });
  console.log("   status:", noAuth.status, noAuth.body);

  console.log("\n6) authority status update WITH role (should be 200):");
  const withAuth = await j("PATCH", `/regions/BELUR/reports/${r.reportId}/status`,
    { status: "VERIFIED", createdAt: r.createdAt },
    { "x-dev-groups": "authority" });
  console.log("   status:", withAuth.status, withAuth.body);

  console.log("\n7) add a comment (community confirmation):");
  const c = await j("POST", `/reports/${r.reportId}/comments`, { author: "Priya", text: "I saw this too yesterday." });
  console.log("   status:", c.status, JSON.stringify((c.body as any).comment));

  console.log("\n8) presign media upload:");
  const presign = await j("POST", "/media/presign", { prefix: "reports", contentType: "image/jpeg" });
  console.log("   status:", presign.status, "key:", (presign.body as any).key, "simulated:", (presign.body as any).simulated);

  console.log("\nSMOKE TEST DONE");
}

main().catch((e) => { console.error("SMOKE FAILED:", e); process.exit(1); });
