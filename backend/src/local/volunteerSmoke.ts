// Volunteer community + event role-enforcement test.
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

const eventBody = {
  title: "Test Cleanup", description: "test", date: "2026-12-01", time: "09:00",
  locationLabel: "Test bank", kind: "CLEANUP",
  stateId: "KA", districtId: "HASSAN", talukId: "BELUR",
};

async function main() {
  console.log("1) list volunteers (public):");
  const vols = await j("GET", "/volunteers");
  console.log("   count:", vols.body.volunteers.length, "names:", vols.body.volunteers.map((v: any) => v.name).join(", "));
  console.log("   no secrets leaked:", !JSON.stringify(vols.body).match(/token|password|secret/i));

  console.log("2) get one volunteer profile + events:");
  const prof = await j("GET", "/volunteers/vol-ananya");
  console.log("   name:", prof.body.volunteer.name, "organized:", prof.body.organized.length,
    "upcoming:", prof.body.upcoming.length, "completed:", prof.body.completed.length);

  console.log("3) region events for BELUR:");
  const belur = await j("GET", "/regions/BELUR/events");
  console.log("   total:", belur.body.events.length, "upcoming:", belur.body.upcoming.length);

  console.log("4) region events for SAKLESHPUR (should NOT include Belur events):");
  const sak = await j("GET", "/regions/SAKLESHPUR/events");
  const sakHasBelur = sak.body.events.some((e: any) => e.talukId === "BELUR");
  console.log("   total:", sak.body.events.length, "contains Belur event:", sakHasBelur);

  console.log("5) create event ANONYMOUS (expect 403):");
  const anon = await j("POST", "/events", eventBody);
  console.log("   status:", anon.status);

  console.log("6) create event as CITIZEN/cleaner-only (expect 403):");
  const cleaner = await j("POST", "/events", eventBody, { "x-dev-groups": "cleaner" });
  console.log("   status:", cleaner.status);

  console.log("7) create event as VOLUNTEER (expect 201):");
  const vol = await j("POST", "/events", eventBody, { "x-dev-groups": "volunteer" });
  console.log("   status:", vol.status, "eventId:", vol.body.event?.eventId, "talukId:", vol.body.event?.talukId);

  console.log("8) new event appears in BELUR region, not SAKLESHPUR:");
  const belur2 = await j("GET", "/regions/BELUR/events");
  const sak2 = await j("GET", "/regions/SAKLESHPUR/events");
  const inBelur = belur2.body.events.some((e: any) => e.eventId === vol.body.event.eventId);
  const inSak = sak2.body.events.some((e: any) => e.eventId === vol.body.event.eventId);
  console.log("   in Belur:", inBelur, "in Sakleshpur:", inSak);

  const okAll =
    vols.body.volunteers.length >= 3 &&
    prof.body.volunteer.name === "Ananya Rao" &&
    !sakHasBelur &&
    anon.status === 403 && cleaner.status === 403 && vol.status === 201 &&
    inBelur && !inSak;
  console.log(okAll ? "VOLUNTEER SMOKE OK" : "VOLUNTEER SMOKE FAILED");
  if (!okAll) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
