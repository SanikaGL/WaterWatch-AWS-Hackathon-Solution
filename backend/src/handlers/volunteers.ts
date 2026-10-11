// Volunteer community: public profiles + events. Event creation enforces the
// 'volunteer' role SERVER-SIDE (never trust the frontend to hide a button).
import { nanoid } from "nanoid";
import { ok, created, badRequest, notFound, forbidden, type HttpRequest, type HttpResponse } from "../http/types.js";
import type { VolunteerEvent, VolunteerProfile, EventKind, ProfileLink, VolunteerPost, EventUpdate, EventMessage, AuthorRole, CommunityRole } from "../domain/types.js";
import * as repo from "../data/repo.js";
import { resolveRegion, regionSearchText } from "../data/regions.js";

const VALID_KINDS: EventKind[] = ["CLEANUP", "AWARENESS", "COMMUNITY"];

// Strip to public-safe fields (defensive: no tokens/credentials ever stored, but be explicit).
// Includes a resolved region label so the client renders "Taluk, District, State" directly.
function publicProfile(v: VolunteerProfile) {
  const r = resolveRegion(v.homeTalukId);
  // A profile is "complete" once the person has set a real bio or a home region
  // (a stub created at first sign-in has neither). Drives the "not set up yet" UI.
  const profileComplete = Boolean((v.bio && v.bio.trim().length > 0) || v.homeTalukId);
  return {
    volunteerId: v.volunteerId,
    role: v.role ?? "volunteer",
    name: v.name,
    bio: v.bio,
    avatarKey: v.avatarKey,
    instagram: v.instagram,
    youtube: v.youtube,
    links: v.links ?? [],
    homeStateId: v.homeStateId,
    homeDistrictId: v.homeDistrictId,
    homeTalukId: v.homeTalukId,
    homeRegionLabel: r ? `${r.talukName}, ${r.districtName}, ${r.stateName}` : undefined,
    eventsConducted: v.eventsConducted,
    badges: v.badges,
    profileComplete,
    createdAt: v.createdAt,
  };
}

// Smart filter: match a free-text query against name OR region (taluk/district/state),
// and optionally hard-filter by a specific taluk id. Used by both volunteer + cleaner lists.
function filterProfiles(list: VolunteerProfile[], q?: string, talukId?: string) {
  let out = list;
  if (talukId) out = out.filter((v) => v.homeTalukId === talukId);
  const needle = (q ?? "").trim().toLowerCase();
  if (needle) {
    out = out.filter(
      (v) => v.name.toLowerCase().includes(needle) || regionSearchText(v.homeTalukId).includes(needle),
    );
  }
  return out;
}

// Sanitize incoming link list: keep well-formed {label,url}, cap count/length.
function cleanLinks(raw: unknown): ProfileLink[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({ label: String(x.label ?? "").slice(0, 40), url: String(x.url ?? "").slice(0, 300) }))
    .filter((l) => l.label && /^https?:\/\//i.test(l.url))
    .slice(0, 8);
}

// GET /volunteers?q=&talukId=  -> volunteer community list (public, searchable)
export async function listVolunteers(req: HttpRequest): Promise<HttpResponse> {
  return listCommunity(req, "volunteer");
}

// GET /cleaners?q=&talukId=  -> cleaner community list (public, searchable)
export async function listCleaners(req: HttpRequest): Promise<HttpResponse> {
  return listCommunity(req, "cleaner");
}

// Shared list: fetch a role's profiles, apply smart (name-or-region) search + region filter.
async function listCommunity(req: HttpRequest, role: CommunityRole): Promise<HttpResponse> {
  const all = await repo.listVolunteers(role);
  const filtered = filterProfiles(all, req.query.q, req.query.talukId);
  return ok({
    role,
    total: all.length,
    count: filtered.length,
    [role === "cleaner" ? "cleaners" : "volunteers"]: filtered.map(publicProfile),
  });
}

// GET /volunteers/{volunteerId} -> public profile + their events + posts
export async function getVolunteer(req: HttpRequest): Promise<HttpResponse> {
  return getCommunityMember(req, req.pathParams.volunteerId);
}

// GET /cleaners/{cleanerId} -> public profile + posts (cleaners don't organize events)
export async function getCleaner(req: HttpRequest): Promise<HttpResponse> {
  return getCommunityMember(req, req.pathParams.cleanerId);
}

async function getCommunityMember(req: HttpRequest, memberId?: string): Promise<HttpResponse> {
  if (!memberId) return badRequest("member id required");
  const v = await repo.getVolunteer(memberId);
  if (!v) return notFound("Profile not found");
  const [organizedRaw, posts] = await Promise.all([
    repo.listEventsByOrganizer(memberId),
    repo.listVolunteerPostsByAuthor(memberId),
  ]);
  const organized = organizedRaw.map((e) => publicEvent(e, req.auth?.sub));
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = organized.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const completed = organized.filter((e) => e.date < today).sort((a, b) => b.date.localeCompare(a.date));
  return ok({ volunteer: publicProfile(v), organized, upcoming, completed, posts });
}

// POST /volunteers/me or /cleaners/me -> create/update own profile.
// Role is taken from the signed-in user's Cognito group (volunteer vs cleaner).
export async function upsertOwnProfile(req: HttpRequest): Promise<HttpResponse> {
  if (!req.auth) return forbidden("Sign in required");
  const role: CommunityRole | undefined = req.auth.groups.includes("volunteer")
    ? "volunteer"
    : req.auth.groups.includes("cleaner")
    ? "cleaner"
    : undefined;
  if (!role) return forbidden("Volunteer or cleaner role required");
  const b = (req.body ?? {}) as Record<string, unknown>;
  const existing = await repo.getVolunteer(req.auth.sub);
  const defaultName = role === "cleaner" ? "Cleaner" : "Volunteer";
  const profile: VolunteerProfile = {
    volunteerId: req.auth.sub,
    role: existing?.role ?? role,
    name: String(b.name ?? existing?.name ?? req.auth.email ?? defaultName),
    bio: String(b.bio ?? existing?.bio ?? ""),
    avatarKey: b.avatarKey !== undefined ? (b.avatarKey ? String(b.avatarKey) : undefined) : existing?.avatarKey,
    instagram: b.instagram !== undefined ? (b.instagram ? String(b.instagram).slice(0, 200) : undefined) : existing?.instagram,
    youtube: b.youtube !== undefined ? (b.youtube ? String(b.youtube).slice(0, 200) : undefined) : existing?.youtube,
    links: b.links !== undefined ? cleanLinks(b.links) : (existing?.links ?? []),
    homeStateId: b.homeStateId ? String(b.homeStateId) : existing?.homeStateId,
    homeDistrictId: b.homeDistrictId ? String(b.homeDistrictId) : existing?.homeDistrictId,
    homeTalukId: b.homeTalukId ? String(b.homeTalukId) : existing?.homeTalukId,
    eventsConducted: existing?.eventsConducted ?? 0,
    badges: existing?.badges ?? (role === "cleaner" ? ["Verified Cleaner"] : ["Water Guardian"]),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  await repo.putVolunteer(profile);
  return ok({ volunteer: publicProfile(profile) });
}

// POST /me/register -> ensure a STUB profile exists for the signed-in volunteer/cleaner
// so they appear in the community list immediately (shown as "profile not set up yet"
// until they complete it). Idempotent: never overwrites an existing profile.
export async function registerSelf(req: HttpRequest): Promise<HttpResponse> {
  if (!req.auth) return forbidden("Sign in required");
  const role: CommunityRole | undefined = req.auth.groups.includes("volunteer")
    ? "volunteer"
    : req.auth.groups.includes("cleaner")
    ? "cleaner"
    : undefined;
  if (!role) return forbidden("Volunteer or cleaner role required");

  const existing = await repo.getVolunteer(req.auth.sub);
  if (existing) return ok({ volunteer: publicProfile(existing), created: false });

  // Minimal stub: name defaults to the email handle; no bio/region yet.
  const stub: VolunteerProfile = {
    volunteerId: req.auth.sub,
    role,
    name: req.auth.email ? req.auth.email.split("@")[0] : (role === "cleaner" ? "Cleaner" : "Volunteer"),
    bio: "",
    links: [],
    eventsConducted: 0,
    badges: role === "cleaner" ? ["Verified Cleaner"] : ["Water Guardian"],
    createdAt: new Date().toISOString(),
  };
  await repo.putVolunteer(stub);
  return ok({ volunteer: publicProfile(stub), created: true });
}

// POST /posts/awareness  (volunteer OR cleaner) -> create an awareness post (photo/video + desc)
export async function createAwarenessPost(req: HttpRequest): Promise<HttpResponse> {
  if (!req.auth) return forbidden("Sign in required");
  const role: CommunityRole | undefined = req.auth.groups.includes("volunteer")
    ? "volunteer"
    : req.auth.groups.includes("cleaner")
    ? "cleaner"
    : undefined;
  if (!role) return forbidden("Only volunteers or cleaners can post awareness content");
  const b = (req.body ?? {}) as Record<string, unknown>;
  if (!b.description || String(b.description).trim().length < 3) return badRequest("description required (min 3 chars)");

  const profile = await repo.getVolunteer(req.auth.sub);
  const now = new Date().toISOString();
  const post: VolunteerPost = {
    postId: `VP-${nanoid(8)}`,
    authorId: req.auth.sub,
    authorName: profile?.name ?? req.auth.email ?? (role === "cleaner" ? "Cleaner" : "Volunteer"),
    authorRole: profile?.role ?? role,
    title: b.title ? String(b.title).slice(0, 120) : undefined,
    description: String(b.description).slice(0, 2000),
    media: Array.isArray(b.media) ? (b.media as VolunteerPost["media"]) : [],
    stateId: b.stateId ? String(b.stateId) : undefined,
    districtId: b.districtId ? String(b.districtId) : undefined,
    talukId: b.talukId ? String(b.talukId) : undefined,
    commentCount: 0,
    createdAt: now,
  };
  await repo.putVolunteerPost(post);
  return created({ post });
}

// GET /posts/awareness?role=volunteer|cleaner -> community awareness feed (newest first)
export async function listAwarenessPosts(req: HttpRequest): Promise<HttpResponse> {
  const posts = await repo.listVolunteerPosts();
  const role = req.query.role;
  const filtered = role ? posts.filter((p) => (p.authorRole ?? "volunteer") === role) : posts;
  return ok({ posts: filtered });
}

// GET /posts/awareness/{postId}?at=ISO -> post + its comments
export async function getAwarenessPost(req: HttpRequest): Promise<HttpResponse> {
  const postId = req.pathParams.postId;
  const at = req.query.at;
  if (!postId || !at) return badRequest("postId and at (createdAt) required");
  const post = await repo.getVolunteerPost(at, postId);
  if (!post) return notFound("Post not found");
  const comments = await repo.listComments(postId);
  return ok({ post, comments });
}

// POST /events  (VOLUNTEER ONLY — enforced here, server-side)
export async function createEvent(req: HttpRequest): Promise<HttpResponse> {
  if (!req.auth) return forbidden("Sign in required to create an event");
  if (!req.auth.groups.includes("volunteer")) {
    return forbidden("Only volunteers can create events");
  }
  const b = (req.body ?? {}) as Record<string, unknown>;
  for (const k of ["title", "description", "date", "locationLabel", "stateId", "districtId", "talukId"]) {
    if (!b[k]) return badRequest(`${k} is required`);
  }
  const kind = (b.kind as EventKind) ?? "CLEANUP";
  if (!VALID_KINDS.includes(kind)) return badRequest(`kind must be one of ${VALID_KINDS.join(", ")}`);

  // Ensure the organizer has a profile (auto-create a minimal one on first event).
  let profile = await repo.getVolunteer(req.auth.sub);
  if (!profile) {
    profile = {
      volunteerId: req.auth.sub,
      role: "volunteer",
      name: req.auth.email ?? "Volunteer",
      bio: "",
      links: [],
      eventsConducted: 0,
      badges: ["Water Guardian"],
      createdAt: new Date().toISOString(),
    };
  }

  const event: VolunteerEvent = {
    eventId: `EV-${nanoid(8)}`,
    title: String(b.title),
    description: String(b.description),
    kind,
    date: String(b.date),
    time: b.time ? String(b.time) : undefined,
    locationLabel: String(b.locationLabel),
    media: Array.isArray(b.media) ? (b.media as VolunteerEvent["media"]) : [],
    attendeeIds: [],
    participants: 0,
    organizerId: req.auth.sub,
    organizerName: profile.name,
    stateId: String(b.stateId),
    districtId: String(b.districtId),
    talukId: String(b.talukId),
    waterBodyId: b.waterBodyId ? String(b.waterBodyId) : undefined,
    createdAt: new Date().toISOString(),
  };
  await repo.putEvent(event);

  // Bump organizer's conducted count.
  profile.eventsConducted += 1;
  await repo.putVolunteer(profile);

  return created({ event });
}

// Normalize an event for the client: ensure attendeeIds exists, expose the
// derived count and whether THIS viewer has joined (never leak the id list).
function publicEvent(e: VolunteerEvent, viewerId?: string) {
  const attendees = e.attendeeIds ?? [];
  const { attendeeIds, ...rest } = e; void attendeeIds;
  return {
    ...rest,
    participants: attendees.length,
    joined: viewerId ? attendees.includes(viewerId) : false,
  };
}

// GET /regions/{talukId}/events -> events in that taluk only (with viewer's joined flag)
export async function listEventsByRegion(req: HttpRequest): Promise<HttpResponse> {
  const talukId = req.pathParams.talukId;
  if (!talukId) return badRequest("talukId required");
  const raw = await repo.listEventsByRegion(talukId);
  const events = raw.map((e) => publicEvent(e, req.auth?.sub));
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const completed = events.filter((e) => e.date < today).sort((a, b) => b.date.localeCompare(a.date));
  return ok({ events, upcoming, completed });
}

// POST /events/{talukId}/{date}/{eventId}/join  (login required; idempotent RSVP)
// Join = "I will attend on the event's date at its location". Clicking twice does
// nothing extra; one person is counted exactly once.
export async function joinEvent(req: HttpRequest): Promise<HttpResponse> {
  if (!req.auth) return forbidden("Sign in as a volunteer or cleaner to join an event");
  const { talukId, date, eventId } = req.pathParams;
  if (!talukId || !date || !eventId) return badRequest("talukId, date, eventId required");
  const event = await repo.getEvent(talukId, date, eventId);
  if (!event) return notFound("Event not found");

  // Can't RSVP to a past event.
  if (event.date < new Date().toISOString().slice(0, 10)) {
    return badRequest("This event has already taken place.");
  }

  const set = new Set(event.attendeeIds ?? []);
  set.add(req.auth.sub);                 // idempotent — joining again is a no-op
  event.attendeeIds = [...set];
  event.participants = event.attendeeIds.length;
  await repo.putEvent(event);
  return ok({ eventId, participants: event.participants, joined: true });
}

// POST /events/{talukId}/{date}/{eventId}/leave  (login required; idempotent)
export async function leaveEvent(req: HttpRequest): Promise<HttpResponse> {
  if (!req.auth) return forbidden("Sign in required");
  const { talukId, date, eventId } = req.pathParams;
  if (!talukId || !date || !eventId) return badRequest("talukId, date, eventId required");
  const event = await repo.getEvent(talukId, date, eventId);
  if (!event) return notFound("Event not found");

  const set = new Set(event.attendeeIds ?? []);
  set.delete(req.auth.sub);
  event.attendeeIds = [...set];
  event.participants = event.attendeeIds.length;
  await repo.putEvent(event);
  return ok({ eventId, participants: event.participants, joined: false });
}

function roleOf(groups: string[]): AuthorRole | undefined {
  return (["volunteer", "cleaner", "authority"] as const).find((g) => groups.includes(g));
}

// GET /events/{talukId}/{date}/{eventId} -> full event detail: event + organizer's
// attendee names (organizer only) + updates + discussion messages.
export async function getEventDetail(req: HttpRequest): Promise<HttpResponse> {
  const { talukId, date, eventId } = req.pathParams;
  if (!talukId || !date || !eventId) return badRequest("talukId, date, eventId required");
  const event = await repo.getEvent(talukId, date, eventId);
  if (!event) return notFound("Event not found");

  const isOrganizer = Boolean(req.auth && req.auth.sub === event.organizerId);
  const [updates, messages] = await Promise.all([
    repo.listEventUpdates(eventId),
    repo.listEventMessages(eventId),
  ]);

  // Attendee names visible to the organizer only (resolve ids -> profile names).
  let attendees: { id: string; name: string }[] | undefined;
  if (isOrganizer) {
    const ids = (event.attendeeIds ?? []).filter((id) => !id.startsWith("seed-attendee-"));
    const seedCount = (event.attendeeIds ?? []).length - ids.length;
    const resolved = await Promise.all(ids.map(async (id) => {
      const v = await repo.getVolunteer(id);
      return { id, name: v?.name ?? "Member" };
    }));
    // Represent anonymous/seed attendees as generic members.
    attendees = [
      ...resolved,
      ...Array.from({ length: seedCount }, (_, i) => ({ id: `member-${i + 1}`, name: "Member" })),
    ];
  }

  const viewerJoined = Boolean(req.auth && (event.attendeeIds ?? []).includes(req.auth.sub));
  const { attendeeIds, ...publicFields } = event; void attendeeIds;
  return ok({
    event: { ...publicFields, participants: (event.attendeeIds ?? []).length, joined: viewerJoined },
    isOrganizer,
    attendees,       // undefined unless organizer
    updates,
    messages,
  });
}

// PATCH /events/{talukId}/{date}/{eventId}  (organizer only) -> edit event fields
export async function updateEvent(req: HttpRequest): Promise<HttpResponse> {
  if (!req.auth) return forbidden("Sign in required");
  const { talukId, date, eventId } = req.pathParams;
  if (!talukId || !date || !eventId) return badRequest("talukId, date, eventId required");
  const event = await repo.getEvent(talukId, date, eventId);
  if (!event) return notFound("Event not found");
  if (event.organizerId !== req.auth.sub) return forbidden("Only the organizer can edit this event");

  const b = (req.body ?? {}) as Record<string, unknown>;
  // Editable fields only (date change would move the DB key, so keep date/region fixed here).
  if (b.title !== undefined) event.title = String(b.title).slice(0, 160);
  if (b.description !== undefined) event.description = String(b.description).slice(0, 2000);
  if (b.time !== undefined) event.time = b.time ? String(b.time) : undefined;
  if (b.locationLabel !== undefined) event.locationLabel = String(b.locationLabel).slice(0, 200);
  await repo.putEvent(event);

  const { attendeeIds, ...publicFields } = event; void attendeeIds;
  return ok({ event: { ...publicFields, participants: (event.attendeeIds ?? []).length } });
}

// POST /events/{talukId}/{date}/{eventId}/updates  (organizer only) -> announcement
export async function postEventUpdate(req: HttpRequest): Promise<HttpResponse> {
  if (!req.auth) return forbidden("Sign in required");
  const { talukId, date, eventId } = req.pathParams;
  if (!talukId || !date || !eventId) return badRequest("talukId, date, eventId required");
  const event = await repo.getEvent(talukId, date, eventId);
  if (!event) return notFound("Event not found");
  if (event.organizerId !== req.auth.sub) return forbidden("Only the organizer can post updates");

  const b = (req.body ?? {}) as Record<string, unknown>;
  if (!b.text || String(b.text).trim().length < 1) return badRequest("update text required");
  const update: EventUpdate = {
    updateId: nanoid(10),
    eventId,
    text: String(b.text).slice(0, 1000),
    media: Array.isArray(b.media) ? (b.media as EventUpdate["media"]) : [],
    createdAt: new Date().toISOString(),
  };
  await repo.putEventUpdate(update);
  return created({ update });
}

// POST /events/{talukId}/{date}/{eventId}/messages  (SIGN-IN REQUIRED) -> question/reply
export async function postEventMessage(req: HttpRequest): Promise<HttpResponse> {
  if (!req.auth) return forbidden("Sign in or sign up to join the discussion");
  const { talukId, date, eventId } = req.pathParams;
  if (!talukId || !date || !eventId) return badRequest("talukId, date, eventId required");
  const event = await repo.getEvent(talukId, date, eventId);
  if (!event) return notFound("Event not found");

  const b = (req.body ?? {}) as Record<string, unknown>;
  if (!b.text || String(b.text).trim().length < 1) return badRequest("message text required");

  const profile = await repo.getVolunteer(req.auth.sub);
  const authority = profile ? undefined : await repo.getAuthority(req.auth.sub);
  const message: EventMessage = {
    messageId: nanoid(10),
    eventId,
    parentId: b.parentId ? String(b.parentId) : undefined,
    authorId: req.auth.sub,
    authorName: profile?.name ?? authority?.name ?? (req.auth.email ? req.auth.email.split("@")[0] : "Member"),
    authorRole: roleOf(req.auth.groups) ?? "volunteer",
    text: String(b.text).slice(0, 1000),
    createdAt: new Date().toISOString(),
  };
  await repo.putEventMessage(message);
  return created({ message });
}
