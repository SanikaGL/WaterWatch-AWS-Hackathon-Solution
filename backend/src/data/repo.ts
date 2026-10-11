// Repository: all DynamoDB access. Handlers call these, never the SDK directly.
import { PutCommand, QueryCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE, keys } from "./ddb.js";
import type {
  Report, Comment, Flood, FloodUpdate, WaterBody, VolunteerEvent,
  RecurringIssue, SocialPost, VolunteerProfile, VolunteerPost,
  EventUpdate, EventMessage, CommunityRole, AuthorityProfile,
  MessageThread, Message,
} from "../domain/types.js";

// ---------- Reports ----------
export async function putReport(r: Report) {
  const item = {
    ...keys.report(r.talukId, r.createdAt, r.reportId),
    GSI1PK: r.waterBodyId ? `WB#${r.waterBodyId}` : `REGION#${r.talukId}`,
    GSI1SK: `REPORT#${r.createdAt}#${r.reportId}`,
    entity: "REPORT",
    ...r,
  };
  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
  return r;
}

export async function listReportsByRegion(talukId: string, limit = 50): Promise<Report[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":pk": `REGION#${talukId}`, ":sk": "REPORT#" },
    ScanIndexForward: false,
    Limit: limit,
  }));
  return (res.Items ?? []) as Report[];
}

export async function listReportsByWaterBody(waterBodyId: string, limit = 100): Promise<Report[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    IndexName: "GSI1",
    KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :sk)",
    ExpressionAttributeValues: { ":pk": `WB#${waterBodyId}`, ":sk": "REPORT#" },
    ScanIndexForward: false,
    Limit: limit,
  }));
  return (res.Items ?? []) as Report[];
}

export async function getReport(talukId: string, createdAt: string, reportId: string): Promise<Report | undefined> {
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: keys.report(talukId, createdAt, reportId) }));
  return res.Item as Report | undefined;
}

export async function updateReportStatus(talukId: string, createdAt: string, reportId: string, status: string) {
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: keys.report(talukId, createdAt, reportId),
    UpdateExpression: "SET #s = :s",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: { ":s": status },
  }));
}

// ---------- Comments ----------
export async function putComment(c: Comment) {
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { ...keys.comment(c.reportId, c.createdAt, c.commentId), entity: "COMMENT", ...c },
  }));
  return c;
}
export async function listComments(reportId: string): Promise<Comment[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":pk": `REPORT#${reportId}`, ":sk": "COMMENT#" },
  }));
  return (res.Items ?? []) as Comment[];
}

// ---------- Floods ----------
export async function putFlood(f: Flood) {
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      ...keys.floodAll(f.createdAt, f.floodId),
      GSI1PK: `REGION#${f.talukId}`,
      GSI1SK: `FLOOD#${f.createdAt}#${f.floodId}`,
      entity: "FLOOD",
      ...f,
    },
  }));
  return f;
}
export async function listAllFloods(limit = 50): Promise<Flood[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":pk": "FLOOD#ALL", ":sk": "FLOOD#" },
    ScanIndexForward: false,
    Limit: limit,
  }));
  return (res.Items ?? []) as Flood[];
}
export async function listFloodsByRegion(talukId: string, limit = 50): Promise<Flood[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    IndexName: "GSI1",
    KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :sk)",
    ExpressionAttributeValues: { ":pk": `REGION#${talukId}`, ":sk": "FLOOD#" },
    ScanIndexForward: false,
    Limit: limit,
  }));
  return (res.Items ?? []) as Flood[];
}
export async function getFlood(createdAt: string, floodId: string): Promise<Flood | undefined> {
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: keys.floodAll(createdAt, floodId) }));
  return res.Item as Flood | undefined;
}
export async function putFloodUpdate(u: FloodUpdate) {
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { ...keys.floodUpdate(u.floodId, u.createdAt, u.updateId), entity: "FLOOD_UPDATE", ...u },
  }));
  return u;
}
export async function listFloodUpdates(floodId: string): Promise<FloodUpdate[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":pk": `FLOOD#${floodId}`, ":sk": "UPDATE#" },
    ScanIndexForward: false,
  }));
  return (res.Items ?? []) as FloodUpdate[];
}

// ---------- Water bodies ----------
export async function putWaterBody(w: WaterBody) {
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { ...keys.waterBody(w.talukId, w.waterBodyId), entity: "WATER_BODY", ...w },
  }));
  return w;
}
export async function listWaterBodies(talukId: string): Promise<WaterBody[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":pk": `REGION#${talukId}`, ":sk": "WB#" },
  }));
  return (res.Items ?? []) as WaterBody[];
}

// ---------- Events ----------
export async function putEvent(e: VolunteerEvent) {
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      ...keys.event(e.talukId, e.date, e.eventId),
      GSI1PK: `VOL#${e.organizerId}`,
      GSI1SK: `EVENT#${e.date}#${e.eventId}`,
      entity: "EVENT",
      ...e,
    },
  }));
  return e;
}
export async function listEventsByRegion(talukId: string): Promise<VolunteerEvent[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":pk": `REGION#${talukId}`, ":sk": "EVENT#" },
    ScanIndexForward: false,
  }));
  return (res.Items ?? []) as VolunteerEvent[];
}
export async function listEventsByOrganizer(organizerId: string): Promise<VolunteerEvent[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    IndexName: "GSI1",
    KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :sk)",
    ExpressionAttributeValues: { ":pk": `VOL#${organizerId}`, ":sk": "EVENT#" },
    ScanIndexForward: false,
  }));
  return (res.Items ?? []) as VolunteerEvent[];
}
export async function getEvent(talukId: string, date: string, eventId: string): Promise<VolunteerEvent | undefined> {
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: keys.event(talukId, date, eventId) }));
  return res.Item as VolunteerEvent | undefined;
}

// ---------- Event updates (organizer announcements) ----------
export async function putEventUpdate(u: EventUpdate) {
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { ...keys.eventUpdate(u.eventId, u.createdAt, u.updateId), entity: "EVENT_UPDATE", ...u },
  }));
  return u;
}
export async function listEventUpdates(eventId: string): Promise<EventUpdate[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":pk": `EVENT#${eventId}`, ":sk": "UPDATE#" },
    ScanIndexForward: false,
  }));
  return (res.Items ?? []) as EventUpdate[];
}

// ---------- Event discussion messages (questions + replies) ----------
export async function putEventMessage(m: EventMessage) {
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { ...keys.eventMessage(m.eventId, m.createdAt, m.messageId), entity: "EVENT_MESSAGE", ...m },
  }));
  return m;
}
export async function listEventMessages(eventId: string): Promise<EventMessage[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":pk": `EVENT#${eventId}`, ":sk": "MSG#" },
    ScanIndexForward: true,
  }));
  return (res.Items ?? []) as EventMessage[];
}

// ---------- Community profiles (volunteers + cleaners, partitioned by role) ----------
// Both roles share one storage shape. The GSI partition is role-scoped
// (COMM#volunteer / COMM#cleaner) so each page lists only its own role, while a
// single getVolunteer(id) resolves either (profiles never collide on id).
export async function putVolunteer(v: VolunteerProfile) {
  const role = v.role ?? "volunteer";
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      ...keys.volunteer(v.volunteerId),
      GSI1PK: `COMM#${role}`,
      GSI1SK: `PROFILE#${v.name.toLowerCase()}#${v.volunteerId}`,
      entity: "COMMUNITY_PROFILE",
      ...v,
      role,
    },
  }));
  return v;
}
export async function getVolunteer(volunteerId: string): Promise<VolunteerProfile | undefined> {
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: keys.volunteer(volunteerId) }));
  const item = res.Item as VolunteerProfile | undefined;
  if (item && !item.role) item.role = "volunteer"; // backfill legacy records
  return item;
}
export async function listVolunteers(role: CommunityRole = "volunteer", limit = 200): Promise<VolunteerProfile[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    IndexName: "GSI1",
    KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :sk)",
    ExpressionAttributeValues: { ":pk": `COMM#${role}`, ":sk": "PROFILE#" },
    Limit: limit,
  }));
  return (res.Items ?? []).map((v) => ({ ...(v as VolunteerProfile), role })) as VolunteerProfile[];
}

// ---------- Volunteer posts (awareness feed) ----------
export async function putVolunteerPost(p: VolunteerPost) {
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      ...keys.volunteerPost(p.createdAt, p.postId),
      GSI1PK: `VAUTHOR#${p.authorId}`,
      GSI1SK: `VPOST#${p.createdAt}#${p.postId}`,
      entity: "VOLUNTEER_POST",
      ...p,
    },
  }));
  return p;
}
export async function listVolunteerPosts(limit = 50): Promise<VolunteerPost[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":pk": "VPOST#ALL", ":sk": "VPOST#" },
    ScanIndexForward: false,
    Limit: limit,
  }));
  return (res.Items ?? []) as VolunteerPost[];
}
export async function listVolunteerPostsByAuthor(authorId: string): Promise<VolunteerPost[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    IndexName: "GSI1",
    KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :sk)",
    ExpressionAttributeValues: { ":pk": `VAUTHOR#${authorId}`, ":sk": "VPOST#" },
    ScanIndexForward: false,
  }));
  return (res.Items ?? []) as VolunteerPost[];
}
export async function getVolunteerPost(createdAt: string, postId: string): Promise<VolunteerPost | undefined> {
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: keys.volunteerPost(createdAt, postId) }));
  return res.Item as VolunteerPost | undefined;
}

// ---------- Authorities (seeded profiles, bound to a region) ----------
export async function putAuthority(a: AuthorityProfile) {
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      ...keys.authority(a.authorityId),
      GSI1PK: "AUTH#ALL",
      GSI1SK: `PROFILE#${a.name.toLowerCase()}#${a.authorityId}`,
      entity: "AUTHORITY_PROFILE",
      ...a,
    },
  }));
  return a;
}
export async function getAuthority(authorityId: string): Promise<AuthorityProfile | undefined> {
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: keys.authority(authorityId) }));
  return res.Item as AuthorityProfile | undefined;
}
export async function listAuthorities(limit = 500): Promise<AuthorityProfile[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    IndexName: "GSI1",
    KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :sk)",
    ExpressionAttributeValues: { ":pk": "AUTH#ALL", ":sk": "PROFILE#" },
    Limit: limit,
  }));
  return (res.Items ?? []) as AuthorityProfile[];
}

// ---------- Direct messaging (1:1 threads) ----------
// The thread META item is stored once. For each participant we also write a
// membership pointer under GSI1PK=THREADS#<userId> so either side can list their
// inbox with a single GSI query (DynamoDB has no OR on a key).
export async function putThread(t: MessageThread) {
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { ...keys.thread(t.threadId), entity: "THREAD", ...t },
  }));
  // Membership pointers (one per participant), sorted by updatedAt for inbox order.
  for (const p of t.participantIds) {
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `THREADMEMBER#${p}#${t.threadId}`,
        SK: "META",
        GSI1PK: `THREADS#${p}`,
        GSI1SK: `THREAD#${t.updatedAt}#${t.threadId}`,
        entity: "THREAD_MEMBER",
        threadId: t.threadId,
      },
    }));
  }
  return t;
}
export async function getThread(threadId: string): Promise<MessageThread | undefined> {
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: keys.thread(threadId) }));
  return res.Item as MessageThread | undefined;
}
export async function listThreadsForUser(userId: string): Promise<MessageThread[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    IndexName: "GSI1",
    KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :sk)",
    ExpressionAttributeValues: { ":pk": `THREADS#${userId}`, ":sk": "THREAD#" },
    ScanIndexForward: false, // newest-updated first
  }));
  const pointers = (res.Items ?? []) as { threadId: string }[];
  const threads = await Promise.all(pointers.map((p) => getThread(p.threadId)));
  return threads.filter((t): t is MessageThread => Boolean(t));
}
export async function putMessage(m: Message) {
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { ...keys.message(m.threadId, m.createdAt, m.messageId), entity: "MESSAGE", ...m },
  }));
  return m;
}
export async function listMessages(threadId: string): Promise<Message[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":pk": `THREAD#${threadId}`, ":sk": "MSG#" },
    ScanIndexForward: true, // chronological
  }));
  return (res.Items ?? []) as Message[];
}

// ---------- Recurring issues ----------
export async function putRecurring(r: RecurringIssue) {
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { ...keys.recurring(r.talukId, r.waterBodyId), entity: "RECURRING", ...r },
  }));
  return r;
}
export async function listRecurringByRegion(talukId: string): Promise<RecurringIssue[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":pk": `REGION#${talukId}`, ":sk": "RECUR#" },
  }));
  return (res.Items ?? []) as RecurringIssue[];
}

// ---------- Social posts ----------
export async function putSocialPost(p: SocialPost) {
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { ...keys.socialPost(p.createdAt, p.postId), entity: "SOCIAL_POST", ...p },
  }));
  return p;
}
export async function listSocialPosts(limit = 50): Promise<SocialPost[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":pk": "POST#ALL", ":sk": "POST#" },
    ScanIndexForward: false,
    Limit: limit,
  }));
  return (res.Items ?? []) as SocialPost[];
}
export async function getSocialPost(postId: string): Promise<SocialPost | undefined> {
  const all = await listSocialPosts(200);
  return all.find((p) => p.postId === postId);
}
