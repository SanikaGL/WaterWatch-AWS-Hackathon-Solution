// Seeds demo data into DynamoDB Local: water bodies, a flood, and sample reports.
import { nanoid } from "nanoid";
process.env.DDB_ENDPOINT = process.env.DDB_ENDPOINT || "http://localhost:8000";
process.env.TABLE_NAME = process.env.TABLE_NAME || "waterwatch-local";

import * as repo from "../data/repo.js";
import { SEED_WATER_BODIES } from "../data/regions.js";
import { maybeEvaluateRecurring } from "../domain/recurringService.js";
import { runMonthlyPollutionAnalysis } from "../domain/monthlyAlerts.js";
import { seedAuthorities, seedCleaners, seedCleanerPosts } from "./seedData.js";
import type { Flood, Report, WaterBody, VolunteerProfile, VolunteerEvent, VolunteerPost } from "../domain/types.js";

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// A timestamp guaranteed to fall within the CURRENT calendar month (so the monthly
// pollution analysis always has data to work with, whatever day the seed runs).
// Produces DISTINCT recent days that are both (a) within the recurring 30-day
// window and (b) inside the current calendar month, regardless of today's date.
function thisMonth(dayOffset: number): string {
  const now = new Date();
  const today = now.getUTCDate();
  // Anchor to yesterday-ish so every timestamp is safely in the PAST (never after
  // "now", which would exclude it from the recurring window) and inside this month.
  const base = Math.min(27, Math.max(6, today - 1)); // offsets 0..4 -> days 2..27, all this month
  const day = Math.max(1, base - dayOffset);
  // Early morning UTC + a day in the past guarantees createdAt < now.
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, 0, 1, 0));
  return d.toISOString();
}

async function main() {
  // Water bodies in Belur
  for (const w of SEED_WATER_BODIES) {
    const wb: WaterBody = { ...w, status: "MONITORING" };
    await repo.putWaterBody(wb);
  }

  // An active flood in Belur, Hassan
  const flood: Flood = {
    floodId: "FL-DEMO-001",
    title: "Belur Road Flooding",
    locationLabel: "Belur Road, near market",
    severity: "SEVERE",
    status: "ACTIVE",
    summary: "Water entering residential area; access road partially submerged.",
    media: [],
    updateCount: 0,
    volunteerCount: 8,
    authorityStatus: "Notified",
    stateId: "KA",
    districtId: "HASSAN",
    talukId: "BELUR",
    createdAt: daysAgo(0),
  };
  await repo.putFlood(flood);

  // 5 pollution reports on Belur Lake within the window -> should trigger recurring.
  // A couple carry demo proof media (SVG posters already in the frontend/public) so
  // the awareness alert shows real photo/video evidence.
  const proof = (i: number) => (i < 3
    ? [{ key: ["videos/poster-drain.svg", "videos/poster-leakage.svg", "videos/poster-flood.svg"][i], type: "image" as const }]
    : []);
  let lastPollution: Report | null = null;
  for (let i = 0; i < 5; i++) {
    const report: Report = {
      reportId: nanoid(12),
      type: "POLLUTION",
      status: i < 2 ? "VERIFIED" : "REPORTED",
      description: ["Plastic waste along the bank", "Sewage inflow near inlet", "Dead fish observed", "Foam on surface", "Dumped material in water"][i],
      locationLabel: "Northern bank, Belur Lake",
      media: proof(i),
      stateId: "KA",
      districtId: "HASSAN",
      talukId: "BELUR",
      waterBodyId: "BELUR_LAKE",
      createdAt: thisMonth(i),
      upvotes: Math.floor(Math.random() * 10),
    };
    await repo.putReport(report);
    lastPollution = report;
  }

  // Trigger recurring detection so demo data includes a RecurringIssue + awareness post.
  if (lastPollution) {
    const outcome = await maybeEvaluateRecurring(lastPollution);
    console.log(`Recurring evaluation: triggered=${outcome.triggered} count=${outcome.countInWindow}`);
  }

  // A couple of leakage reports
  for (let i = 0; i < 2; i++) {
    const report: Report = {
      reportId: nanoid(12),
      type: "LEAKAGE",
      status: "REPORTED",
      description: ["Public pipeline burst, continuous flow", "Overflowing public tank"][i],
      locationLabel: "Main Road junction, Belur",
      media: [],
      stateId: "KA",
      districtId: "HASSAN",
      talukId: "BELUR",
      createdAt: daysAgo(i + 1),
      upvotes: 0,
    };
    await repo.putReport(report);
  }

  // ----- Volunteers (real community profiles) -----
  const volunteers: VolunteerProfile[] = [
    { volunteerId: "vol-ananya", role: "volunteer", name: "Ananya Rao", bio: "Leads lake cleanups across Hassan. Passionate about reviving Belur Lake.", instagram: "https://instagram.com/ananya.water", youtube: "https://youtube.com/@ananyawater", links: [{ label: "Blog", url: "https://example.com/ananya" }], homeStateId: "KA", homeDistrictId: "HASSAN", homeTalukId: "BELUR", eventsConducted: 0, badges: ["Water Guardian", "Community Responder"], createdAt: daysAgo(120) },
    { volunteerId: "vol-rahul", role: "volunteer", name: "Rahul Shetty", bio: "Civil engineer volunteering on water-leakage awareness and pipeline reporting.", instagram: "https://instagram.com/rahul.fixleaks", links: [], homeStateId: "KA", homeDistrictId: "HASSAN", homeTalukId: "BELUR", eventsConducted: 0, badges: ["Water Guardian"], createdAt: daysAgo(90) },
    { volunteerId: "vol-priya", role: "volunteer", name: "Priya Nair", bio: "Teacher running school awareness drives on keeping devotional material out of water.", youtube: "https://youtube.com/@priyateaches", links: [], homeStateId: "KA", homeDistrictId: "HASSAN", homeTalukId: "SAKLESHPUR", eventsConducted: 0, badges: ["Awareness Champion"], createdAt: daysAgo(60) },
  ];
  for (const v of volunteers) await repo.putVolunteer(v);

  // ----- Cleaners (physically clean + submit evidence; mirror volunteer profiles) -----
  const cleaners = seedCleaners(daysAgo);
  for (const c of cleaners) await repo.putVolunteer(c);
  for (const p of seedCleanerPosts(daysAgo)) await repo.putVolunteerPost(p);

  // ----- Authorities (one per Hassan taluk; seeded, sign-in only) -----
  const authorities = seedAuthorities(daysAgo);
  for (const a of authorities) await repo.putAuthority(a);

  // A sample message thread (verified cleaner <-> their taluk authority) so the inbox demos.
  {
    const cleaner = cleaners[0];
    const auth = authorities.find((a) => a.talukId === cleaner.homeTalukId) ?? authorities[0];
    const threadId = [cleaner.volunteerId, auth.authorityId].sort().join("__");
    const t0 = daysAgo(2);
    const t1 = daysAgo(1);
    await repo.putThread({
      threadId,
      participantIds: [cleaner.volunteerId, auth.authorityId].sort() as [string, string],
      participants: [
        { id: cleaner.volunteerId, name: cleaner.name, role: "cleaner" },
        { id: auth.authorityId, name: auth.name, role: "authority" },
      ],
      lastMessage: "Thank you. Your Belur Lake cleanup evidence is verified.",
      lastSenderId: auth.authorityId,
      updatedAt: t1,
      createdAt: t0,
    });
    await repo.putMessage({ messageId: "msg-seed-1", threadId, senderId: cleaner.volunteerId, senderName: cleaner.name, senderRole: "cleaner", text: "Submitted before/after photos for the Belur Lake drive. Please review when possible.", createdAt: t0 });
    await repo.putMessage({ messageId: "msg-seed-2", threadId, senderId: auth.authorityId, senderName: auth.name, senderRole: "authority", text: "Thank you. Your Belur Lake cleanup evidence is verified.", createdAt: t1 });
  }

  // Awareness posts (volunteer feed content)
  const posts: VolunteerPost[] = [
    { postId: "VP-belur1", authorId: "vol-ananya", authorName: "Ananya Rao", title: "Belur Lake looked beautiful after Saturday's drive", description: "28 volunteers removed 40+ bags of plastic from the northern bank. Small actions, real change. Join the next one!", media: [], stateId: "KA", districtId: "HASSAN", talukId: "BELUR", commentCount: 0, createdAt: daysAgo(4) },
    { postId: "VP-priya1", authorId: "vol-priya", authorName: "Priya Nair", title: "Keep the devotion, protect the water", description: "We set up a simple collection point near the ghat so offerings never reach the water. Respect the tradition, protect the lake.", media: [], talukId: "SAKLESHPUR", stateId: "KA", districtId: "HASSAN", commentCount: 0, createdAt: daysAgo(8) },
  ];
  for (const p of posts) await repo.putVolunteerPost(p);

  // Synthetic attendee ids so seeded counts look real (participants = set size).
  const attendees = (n: number) => Array.from({ length: n }, (_, i) => `seed-attendee-${i + 1}`);

  // ----- Volunteer events (region-associated) -----
  const events: VolunteerEvent[] = [
    { eventId: "EV-belurlake", title: "Belur Lake Cleanup Drive", description: "Community cleanup of plastic and debris along the northern bank of Belur Lake.", kind: "CLEANUP", date: daysFromNow(6), time: "08:00", locationLabel: "Northern bank, Belur Lake", media: [], attendeeIds: attendees(18), participants: 18, organizerId: "vol-ananya", organizerName: "Ananya Rao", stateId: "KA", districtId: "HASSAN", talukId: "BELUR", waterBodyId: "BELUR_LAKE", createdAt: daysAgo(5) },
    { eventId: "EV-leakaware", title: "Water Leakage Awareness Walk", description: "Walk through Belur town mapping and reporting public pipeline leaks.", kind: "AWARENESS", date: daysFromNow(12), time: "17:00", locationLabel: "Main Road, Belur", media: [], attendeeIds: attendees(7), participants: 7, organizerId: "vol-rahul", organizerName: "Rahul Shetty", stateId: "KA", districtId: "HASSAN", talukId: "BELUR", createdAt: daysAgo(3) },
    { eventId: "EV-pastdrive", title: "Yagachi River Bank Cleanup", description: "Completed cleanup along the Yagachi river bank.", kind: "CLEANUP", date: daysFromNow(-10), time: "07:30", locationLabel: "Yagachi River bank", media: [], attendeeIds: attendees(25), participants: 25, organizerId: "vol-ananya", organizerName: "Ananya Rao", stateId: "KA", districtId: "HASSAN", talukId: "BELUR", waterBodyId: "YAGACHI_RIVER", createdAt: daysAgo(20) },
    { eventId: "EV-sakleshpur", title: "Sakleshpur Devotion & Water Awareness", description: "Respectful awareness session on keeping offerings out of water bodies.", kind: "AWARENESS", date: daysFromNow(9), time: "10:00", locationLabel: "Sakleshpur town center", media: [], attendeeIds: attendees(12), participants: 12, organizerId: "vol-priya", organizerName: "Priya Nair", stateId: "KA", districtId: "HASSAN", talukId: "SAKLESHPUR", createdAt: daysAgo(2) },
  ];
  for (const e of events) await repo.putEvent(e);
  // Reflect conducted counts
  for (const v of volunteers) {
    const organized = events.filter((e) => e.organizerId === v.volunteerId);
    if (organized.length) { v.eventsConducted = organized.length; await repo.putVolunteer(v); }
  }

  // Generate the monthly pollution awareness alert(s) so the Alerts page is populated.
  const monthly = await runMonthlyPollutionAnalysis();
  console.log(`Monthly pollution analysis: ${monthly.alertsCreated} alert(s) for ${monthly.period}.`);

  console.log(`Seed complete: 3 water bodies, 1 active flood, 5 pollution + 2 leakage reports, ${volunteers.length} volunteers, ${events.length} events in Hassan.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
