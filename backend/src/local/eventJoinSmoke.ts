// Verifies RSVP join/leave is idempotent (one person counts once, join/leave/join
// cannot inflate the count) and anonymous cannot join.
export {};
const BASE = process.env.BASE || "http://localhost:4000";

async function j(method: string, path: string, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE}${path}`, { method, headers });
  const text = await res.text();
  let b: any; try { b = JSON.parse(text); } catch { b = text; }
  return { status: res.status, body: b };
}

async function main() {
  const list = await j("GET", "/regions/BELUR/events");
  const e = list.body.upcoming[0];
  console.log(`event: ${e.title} | start count: ${e.participants}`);
  const start = e.participants;
  const base = `/events/${e.talukId}/${e.date}/${e.eventId}`;
  const vol = { "x-dev-groups": "volunteer" };

  const anon = await j("POST", `${base}/join`);
  console.log(`1) anonymous join -> status ${anon.status} (expect 403)`);

  const j1 = await j("POST", `${base}/join`, vol);
  console.log(`2) volunteer join #1 -> count=${j1.body.participants} joined=${j1.body.joined}`);

  const j2 = await j("POST", `${base}/join`, vol);
  console.log(`3) volunteer join #2 (same user) -> count=${j2.body.participants} (should equal #1)`);

  const lv = await j("POST", `${base}/leave`, vol);
  console.log(`4) volunteer leave -> count=${lv.body.participants} joined=${lv.body.joined} (back to start)`);

  const ok =
    anon.status === 403 &&
    j1.body.participants === start + 1 &&
    j2.body.participants === start + 1 &&     // idempotent: no double count
    lv.body.participants === start &&
    lv.body.joined === false;
  console.log(ok ? "EVENT JOIN SMOKE OK" : "EVENT JOIN SMOKE FAILED");
  if (!ok) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
