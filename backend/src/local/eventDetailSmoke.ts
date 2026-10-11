// Event detail: organizer edit/update, discussion sign-in gate, identity, attendee list.
export {};
const BASE = process.env.BASE || "http://localhost:4000";
const VOL = { "x-dev-groups": "volunteer" };

async function j(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let b: any; try { b = JSON.parse(text); } catch { b = text; }
  return { status: res.status, body: b };
}

async function main() {
  // Create an event as the dev volunteer so dev-user is the organizer.
  const create = await j("POST", "/events", {
    title: "Test Event", description: "desc", date: "2026-12-20", time: "09:00",
    locationLabel: "Test spot", kind: "CLEANUP", stateId: "KA", districtId: "HASSAN", talukId: "BELUR",
  }, VOL);
  const ev = create.body.event;
  const base = `/events/${ev.talukId}/${ev.date}/${ev.eventId}`;
  console.log(`created event ${ev.eventId}`);

  console.log("1) GET detail as organizer -> isOrganizer + attendees visible:");
  const d1 = await j("GET", base, undefined, VOL);
  console.log(`   isOrganizer=${d1.body.isOrganizer} attendees=${JSON.stringify(d1.body.attendees)}`);

  console.log("2) edit event (organizer):");
  const edit = await j("PATCH", base, { title: "Edited Title", locationLabel: "New spot" }, VOL);
  console.log(`   status=${edit.status} title=${edit.body.event?.title} loc=${edit.body.event?.locationLabel}`);

  const OTHER = { "x-dev-groups": "cleaner", "x-dev-sub": "other-user" };
  console.log("3) edit event as NON-organizer (expect 403):");
  const editOther = await j("PATCH", base, { title: "Hijack" }, OTHER);
  console.log(`   status=${editOther.status}`);

  console.log("4) post update (organizer):");
  const upd = await j("POST", `${base}/updates`, { text: "Bring gloves!" }, VOL);
  console.log(`   status=${upd.status}`);

  console.log("5) post update as non-organizer (expect 403):");
  const updOther = await j("POST", `${base}/updates`, { text: "x" }, OTHER);
  console.log(`   status=${updOther.status}`);

  console.log("6) ask a question ANONYMOUS (expect 403 - sign-in required):");
  const qAnon = await j("POST", `${base}/messages`, { text: "What time?" });
  console.log(`   status=${qAnon.status}`);

  console.log("7) ask a question as cleaner (real identity, different user):");
  const q = await j("POST", `${base}/messages`, { text: "Do we bring bags?" }, OTHER);
  console.log(`   status=${q.status} author=${q.body.message?.authorName} role=${q.body.message?.authorRole}`);

  console.log("8) organizer replies to the question:");
  const reply = await j("POST", `${base}/messages`, { text: "Yes, we provide bags.", parentId: q.body.message.messageId }, VOL);
  console.log(`   status=${reply.status} parentId set=${Boolean(reply.body.message?.parentId)}`);

  console.log("9) GET detail -> updates + messages present:");
  const d2 = await j("GET", base, undefined, VOL);
  console.log(`   updates=${d2.body.updates.length} messages=${d2.body.messages.length}`);

  const okAll =
    d1.body.isOrganizer === true && Array.isArray(d1.body.attendees) &&
    edit.status === 200 && edit.body.event.title === "Edited Title" &&
    editOther.status === 403 &&
    upd.status === 201 && updOther.status === 403 &&
    qAnon.status === 403 &&
    q.status === 201 && q.body.message.authorRole === "cleaner" &&
    reply.status === 201 && Boolean(reply.body.message.parentId) &&
    d2.body.updates.length === 1 && d2.body.messages.length === 2;
  console.log(okAll ? "EVENT DETAIL SMOKE OK" : "EVENT DETAIL SMOKE FAILED");
  if (!okAll) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
