// Group A + Authority + Messaging smoke test.
// Exercises: cleaner profiles, smart search (name/region), authority directory,
// and 1:1 messaging between a verified member and an authority (login required).
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

// Simulated distinct users via dev-auth shim.
const asCleaner = { "x-dev-groups": "cleaner", "x-dev-sub": "cln-manjunath" };
const asBelurAuthority = { "x-dev-groups": "authority", "x-dev-sub": "auth-belur" };

async function main() {
  const checks: { label: string; pass: boolean }[] = [];
  const check = (label: string, pass: boolean) => { checks.push({ label, pass }); console.log(`   ${pass ? "OK" : "FAIL"} — ${label}`); };

  console.log("1) cleaner directory lists seeded cleaners:");
  const cleaners = await j("GET", "/cleaners");
  check("4 cleaners seeded", cleaners.body.cleaners?.length === 4 && cleaners.body.role === "cleaner");

  console.log("2) volunteers and cleaners are SEPARATE lists (role-partitioned):");
  const vols = await j("GET", "/volunteers");
  const volIds = new Set((vols.body.volunteers ?? []).map((v: any) => v.volunteerId));
  const cleanerLeak = (cleaners.body.cleaners ?? []).some((c: any) => volIds.has(c.volunteerId));
  check("no cleaner appears in volunteer list", !cleanerLeak && vols.body.volunteers?.length >= 3);

  console.log("3) smart search by NAME (q=manjunath):");
  const byName = await j("GET", "/cleaners?q=manjunath");
  check("name search finds Manjunath", byName.body.count === 1 && byName.body.cleaners[0].name.includes("Manjunath"));

  console.log("4) smart search by REGION (q=sakleshpur):");
  const byRegion = await j("GET", "/cleaners?q=sakleshpur");
  check("region search finds Sakleshpur cleaner", byRegion.body.count === 1 && byRegion.body.cleaners[0].homeTalukId === "SAKLESHPUR");

  console.log("5) cleaner profile carries home region label + posts:");
  const prof = await j("GET", "/cleaners/cln-manjunath");
  check("home region label present", /Belur, Hassan, Karnataka/.test(prof.body.volunteer.homeRegionLabel ?? ""));
  check("cleaner has an awareness post", prof.body.posts?.length >= 1 && prof.body.posts[0].authorRole === "cleaner");

  console.log("6) awareness feed filterable by role=cleaner:");
  const feed = await j("GET", "/posts/awareness?role=cleaner");
  const allCleaner = (feed.body.posts ?? []).every((p: any) => p.authorRole === "cleaner");
  check("role=cleaner feed returns only cleaner posts", feed.body.posts?.length >= 2 && allCleaner);

  console.log("7) authority directory (8 per-taluk) + region label:");
  const auths = await j("GET", "/authorities");
  check("8 authorities seeded", auths.body.authorities?.length === 8);
  const belur = (auths.body.authorities ?? []).find((a: any) => a.talukId === "BELUR");
  check("Belur authority has region label", /Belur, Hassan, Karnataka/.test(belur?.regionLabel ?? ""));

  console.log("8) authority search by region (q=arsikere/arasikere):");
  const authSearch = await j("GET", "/authorities?q=arasikere");
  check("authority region search works", authSearch.body.count === 1 && authSearch.body.authorities[0].talukId === "ARASIKERE");

  console.log("9) authority dashboard is region-scoped to own taluk:");
  const overview = await j("GET", "/authority/overview", undefined, asBelurAuthority);
  check("overview scoped to Belur", overview.status === 200 && overview.body.scopedTalukId === "BELUR");
  console.log("   scoped region:", overview.body.region);

  console.log("10) authority/me returns the bound profile:");
  const me = await j("GET", "/authority/me", undefined, asBelurAuthority);
  check("me resolves seeded authority", me.status === 200 && me.body.authority.talukId === "BELUR");

  console.log("11) messaging requires login (anonymous start -> 403):");
  const anonMsg = await j("POST", "/messages/start", { recipientId: "auth-belur" });
  check("anonymous cannot start a thread", anonMsg.status === 403);

  console.log("12) verified cleaner starts a thread with their taluk authority:");
  const start = await j("POST", "/messages/start", { recipientId: "auth-belur" }, asCleaner);
  check("thread created/reused", start.status === 200 && !!start.body.thread?.threadId);
  const threadId = start.body.thread?.threadId;

  console.log("13) cleaner posts a message:");
  const m1 = await j("POST", `/messages/threads/${threadId}`, { text: "Fresh evidence uploaded for review." }, asCleaner);
  check("message posted", m1.status === 201 && m1.body.message.senderRole === "cleaner");

  console.log("14) authority replies:");
  const m2 = await j("POST", `/messages/threads/${threadId}`, { text: "Received, verifying now." }, asBelurAuthority);
  check("authority reply posted", m2.status === 201 && m2.body.message.senderRole === "authority");

  console.log("15) thread history is chronological + complete:");
  const thread = await j("GET", `/messages/threads/${threadId}`, undefined, asCleaner);
  check("thread has >= 4 messages (2 seeded + 2 new)", (thread.body.messages?.length ?? 0) >= 4);

  console.log("16) each side sees the thread in their inbox:");
  const cInbox = await j("GET", "/messages/threads", undefined, asCleaner);
  const aInbox = await j("GET", "/messages/threads", undefined, asBelurAuthority);
  const cHas = (cInbox.body.threads ?? []).some((t: any) => t.threadId === threadId && t.other.role === "authority");
  const aHas = (aInbox.body.threads ?? []).some((t: any) => t.threadId === threadId && t.other.role === "cleaner");
  check("cleaner inbox shows authority counterpart", cHas);
  check("authority inbox shows cleaner counterpart", aHas);

  console.log("17) non-participant cannot read the thread:");
  const intruder = await j("GET", `/messages/threads/${threadId}`, undefined, { "x-dev-groups": "volunteer", "x-dev-sub": "vol-rahul" });
  check("non-participant blocked", intruder.status === 403);

  console.log("18) member-to-member messaging rejected (must involve an authority):");
  const bad = await j("POST", "/messages/start", { recipientId: "vol-ananya" }, asCleaner);
  check("cleaner cannot message a volunteer", bad.status === 403);

  const failed = checks.filter((c) => !c.pass);
  console.log(failed.length === 0 ? "\nAUTHORITY + MESSAGING SMOKE OK" : `\nAUTHORITY SMOKE FAILED (${failed.length}): ${failed.map((f) => f.label).join("; ")}`);
  if (failed.length) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
