// Volunteer module v2: profile links, awareness posts, identified comments, report attribution.
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
  console.log("1) seeded profile has links/instagram/youtube:");
  const prof = await j("GET", "/volunteers/vol-ananya");
  console.log("   ig:", prof.body.volunteer.instagram, "| yt:", prof.body.volunteer.youtube, "| links:", prof.body.volunteer.links.length, "| posts:", prof.body.posts.length);

  console.log("2) edit own profile (volunteer) - add IG + extra link:");
  const edit = await j("POST", "/volunteers/me",
    { name: "Dev Volunteer", bio: "Testing links", instagram: "https://instagram.com/devvol", links: [{ label: "Site", url: "https://example.com" }, { label: "bad", url: "not-a-url" }] },
    { "x-dev-groups": "volunteer" });
  console.log("   status:", edit.status, "| links kept (bad filtered):", edit.body.volunteer.links.length, "| ig:", edit.body.volunteer.instagram);

  console.log("3) awareness post as CITIZEN (no auth) -> 403:");
  const anon = await j("POST", "/posts/awareness", { description: "hi" });
  console.log("   status:", anon.status);

  console.log("4) awareness post as VOLUNTEER -> 201:");
  const post = await j("POST", "/posts/awareness",
    { title: "Cleanup recap", description: "Great turnout at the lake today!", talukId: "BELUR", stateId: "KA", districtId: "HASSAN" },
    { "x-dev-groups": "volunteer" });
  console.log("   status:", post.status, "postId:", post.body.post?.postId);
  const postId = post.body.post.postId; const at = post.body.post.createdAt;

  console.log("5) awareness feed includes it:");
  const feed = await j("GET", "/posts/awareness");
  console.log("   feed count:", feed.body.posts.length);

  console.log("6) comment on post as ANONYMOUS -> author Anonymous:");
  const c1 = await j("POST", `/reports/${postId}/comments`, { text: "Nice work!" });
  console.log("   status:", c1.status, "author:", c1.body.comment.author, "role:", c1.body.comment.authorRole ?? "(none)");

  console.log("7) comment on post as VOLUNTEER -> real identity + role:");
  const c2 = await j("POST", `/reports/${postId}/comments`, { text: "Thanks everyone", author: "Dev Volunteer" }, { "x-dev-groups": "volunteer" });
  console.log("   status:", c2.status, "author:", c2.body.comment.author, "role:", c2.body.comment.authorRole);

  console.log("8) get post with comments:");
  const got = await j("GET", `/posts/awareness/${postId}?at=${encodeURIComponent(at)}`);
  console.log("   comments:", got.body.comments.length);

  console.log("9) report as ANONYMOUS -> no reporter identity:");
  const r1 = await j("POST", "/reports", { type: "LEAKAGE", description: "leak at tap", locationLabel: "x road", stateId: "KA", districtId: "HASSAN", talukId: "BELUR" });
  console.log("   reporterId:", r1.body.report.reporterId ?? "(none)", "role:", r1.body.report.reporterRole ?? "(none)");

  console.log("10) report as VOLUNTEER -> attributed:");
  const r2 = await j("POST", "/reports", { type: "LEAKAGE", description: "leak at main", locationLabel: "main road", stateId: "KA", districtId: "HASSAN", talukId: "BELUR", reporterName: "Dev Volunteer" }, { "x-dev-groups": "volunteer" });
  console.log("   reporterName:", r2.body.report.reporterName, "role:", r2.body.report.reporterRole);

  const okAll =
    prof.body.volunteer.links.length >= 1 && prof.body.posts.length >= 1 &&
    edit.status === 200 && edit.body.volunteer.links.length === 1 &&
    anon.status === 403 && post.status === 201 &&
    feed.body.posts.length >= 3 &&
    c1.body.comment.author === "Anonymous" && !c1.body.comment.authorRole &&
    c2.body.comment.authorRole === "volunteer" &&
    got.body.comments.length === 2 &&
    !r1.body.report.reporterId &&
    r2.body.report.reporterRole === "volunteer";
  console.log(okAll ? "VOLUNTEER MODULE SMOKE OK" : "VOLUNTEER MODULE SMOKE FAILED");
  if (!okAll) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
