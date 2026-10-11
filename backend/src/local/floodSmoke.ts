// Flood flow test: authority declares incident, citizen posts update w/ media,
// verify updateCount increments and update media round-trips.
export {};
const BASE = process.env.BASE || "http://localhost:4000";

async function j(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown; try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, body: parsed as any };
}

async function main() {
  console.log("1) create flood WITHOUT authority (expect 403):");
  const noAuth = await j("POST", "/floods", { title: "x", locationLabel: "y", severity: "LOW", stateId: "KA", districtId: "HASSAN", talukId: "BELUR" });
  console.log("   status:", noAuth.status);

  console.log("2) create flood WITH authority (expect 201):");
  const create = await j("POST", "/floods",
    { title: "Test Incident", locationLabel: "Test Road", severity: "MODERATE", summary: "testing", stateId: "KA", districtId: "HASSAN", talukId: "BELUR" },
    { "x-dev-groups": "authority" });
  console.log("   status:", create.status, "floodId:", create.body.flood?.floodId);
  const floodId = create.body.flood.floodId;

  console.log("3) post citizen update with media (anonymous, expect 201):");
  const upd = await j("POST", `/floods/${floodId}/updates`, {
    text: "Road blocked near the market", hazardType: "ROAD_BLOCKED",
    media: [{ key: "floods/2026-10-08/demo.jpg", type: "image" }],
  });
  console.log("   status:", upd.status);

  console.log("4) get flood -> updates + updateCount:");
  const got = await j("GET", `/floods/${floodId}`);
  console.log("   updates:", got.body.updates.length, "updateCount:", got.body.flood.updateCount);
  console.log("   update has media:", JSON.stringify(got.body.updates[0]?.media));

  console.log("5) region flood list shows it:");
  const region = await j("GET", "/regions/BELUR/floods");
  console.log("   region floods:", region.body.floods.length);

  const okAll = noAuth.status === 403 && create.status === 201 && upd.status === 201 &&
    got.body.updates.length === 1 && got.body.flood.updateCount === 1 && got.body.updates[0].media.length === 1;
  console.log(okAll ? "FLOOD SMOKE OK" : "FLOOD SMOKE FAILED");
  if (!okAll) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
