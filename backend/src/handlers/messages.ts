// Direct 1:1 messaging between a verified community member (volunteer/cleaner)
// and an authority. Login required on BOTH sides — no anonymous messaging.
// A thread id is deterministic from the sorted participant pair, so re-opening a
// conversation reuses the same thread (no duplicate inboxes).
import { nanoid } from "nanoid";
import { ok, created, badRequest, notFound, forbidden, type HttpRequest, type HttpResponse } from "../http/types.js";
import * as repo from "../data/repo.js";
import { resolveRegion } from "../data/regions.js";
import type { AuthorRole, MessageThread, Message } from "../domain/types.js";

function roleOf(groups: string[]): AuthorRole | undefined {
  return (["authority", "volunteer", "cleaner"] as const).find((g) => groups.includes(g));
}

// Deterministic thread id for a participant pair (order-independent).
function threadIdFor(a: string, b: string): string {
  return [a, b].sort().join("__");
}

type Identity = { id: string; name: string; role: AuthorRole; regionLabel?: string };

// "Taluk, District, State" from a taluk id (undefined if unknown).
function labelFor(talukId?: string): string | undefined {
  const r = resolveRegion(talukId);
  return r ? `${r.talukName}, ${r.districtName}, ${r.stateName}` : undefined;
}

// Resolve a user's display identity (name + role + region) from whichever profile
// store holds them. Authority -> their responsible region; member -> their home region.
async function identityOf(userId: string): Promise<Identity | undefined> {
  const auth = await repo.getAuthority(userId);
  if (auth) return { id: userId, name: auth.name, role: "authority", regionLabel: labelFor(auth.talukId) };
  const vol = await repo.getVolunteer(userId);
  if (vol) return { id: userId, name: vol.name, role: (vol.role ?? "volunteer") as AuthorRole, regionLabel: labelFor(vol.homeTalukId) };
  return undefined;
}

// GET /messages/threads -> the signed-in user's inbox (threads, newest-updated first).
export async function listThreads(req: HttpRequest): Promise<HttpResponse> {
  if (!req.auth) return forbidden("Sign in to view your messages");
  const threads = await repo.listThreadsForUser(req.auth.sub);
  // Decorate each thread with the OTHER participant for easy inbox rendering.
  // Re-resolve identity so region shows even on threads stored before region was added.
  const inbox = await Promise.all(threads.map(async (t) => {
    const snapshot = t.participants.find((p) => p.id !== req.auth!.sub) ?? t.participants[0];
    const fresh = await identityOf(snapshot.id);
    return {
      threadId: t.threadId,
      other: fresh ?? snapshot,
      lastMessage: t.lastMessage,
      lastSenderId: t.lastSenderId,
      updatedAt: t.updatedAt,
    };
  }));
  return ok({ threads: inbox });
}

// POST /messages/start { recipientId } -> get-or-create a thread with that user.
// Exactly one side must be an authority (messaging links verified members <-> authority).
export async function startThread(req: HttpRequest): Promise<HttpResponse> {
  if (!req.auth) return forbidden("Sign in to send a message");
  const b = (req.body ?? {}) as Record<string, unknown>;
  const recipientId = b.recipientId ? String(b.recipientId) : "";
  if (!recipientId) return badRequest("recipientId required");
  if (recipientId === req.auth.sub) return badRequest("You cannot message yourself");

  const [me, other] = await Promise.all([identityOf(req.auth.sub), identityOf(recipientId)]);
  if (!me) return forbidden("Complete your profile before messaging");
  if (!other) return notFound("Recipient not found");

  // One side must be an authority; the other a verified volunteer/cleaner.
  const roles = [me.role, other.role];
  const hasAuthority = roles.includes("authority");
  const hasMember = roles.some((r) => r === "volunteer" || r === "cleaner");
  if (!hasAuthority || !hasMember) {
    return forbidden("Messaging is only between a verified member and an authority");
  }

  const threadId = threadIdFor(req.auth.sub, recipientId);
  let thread = await repo.getThread(threadId);
  if (!thread) {
    const now = new Date().toISOString();
    thread = {
      threadId,
      participantIds: [req.auth.sub, recipientId].sort() as [string, string],
      participants: [me, other],
      updatedAt: now,
      createdAt: now,
    };
    await repo.putThread(thread);
  }
  const messages = await repo.listMessages(threadId);
  return ok({ thread, messages });
}

// GET /messages/threads/{threadId} -> thread + messages (participants only).
export async function getThread(req: HttpRequest): Promise<HttpResponse> {
  if (!req.auth) return forbidden("Sign in to view this conversation");
  const threadId = req.pathParams.threadId;
  if (!threadId) return badRequest("threadId required");
  const thread = await repo.getThread(threadId);
  if (!thread) return notFound("Conversation not found");
  if (!thread.participantIds.includes(req.auth.sub)) return forbidden("Not a participant in this conversation");
  // Refresh participant identities (so region shows on older threads too).
  const refreshed = await Promise.all(thread.participants.map(async (p) => (await identityOf(p.id)) ?? p));
  const messages = await repo.listMessages(threadId);
  return ok({ thread: { ...thread, participants: refreshed }, messages });
}

// POST /messages/threads/{threadId} { text } -> post a message (participants only).
export async function postMessage(req: HttpRequest): Promise<HttpResponse> {
  if (!req.auth) return forbidden("Sign in to send a message");
  const threadId = req.pathParams.threadId;
  if (!threadId) return badRequest("threadId required");
  const b = (req.body ?? {}) as Record<string, unknown>;
  if (!b.text || String(b.text).trim().length < 1) return badRequest("message text required");

  const thread = await repo.getThread(threadId);
  if (!thread) return notFound("Conversation not found");
  if (!thread.participantIds.includes(req.auth.sub)) return forbidden("Not a participant in this conversation");

  const sender = thread.participants.find((p) => p.id === req.auth!.sub)
    ?? (await identityOf(req.auth.sub));
  if (!sender) return forbidden("Complete your profile before messaging");

  const now = new Date().toISOString();
  const message: Message = {
    messageId: nanoid(10),
    threadId,
    senderId: req.auth.sub,
    senderName: sender.name,
    senderRole: sender.role,
    text: String(b.text).slice(0, 2000),
    createdAt: now,
  };
  await repo.putMessage(message);

  // Bump thread ordering + last-message snapshot (re-put refreshes membership pointers).
  thread.lastMessage = message.text.slice(0, 140);
  thread.lastSenderId = message.senderId;
  thread.updatedAt = now;
  await repo.putThread(thread);

  return created({ message });
}

void roleOf; // reserved for future role-based routing
