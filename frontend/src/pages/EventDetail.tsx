// Event detail: join/leave RSVP, organizer edit + updates + attendee list, and a
// discussion thread (sign-in required to post). Real identity for logged-in users.
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { VolunteerEvent, EventUpdate, EventMessage } from "../types";
import { Loading, EmptyState, ErrorState } from "../components/States";
import { MediaGallery } from "../components/MediaGallery";
import { useAuth } from "../context/AuthContext";

interface EventDetailResponse {
  event: VolunteerEvent;
  isOrganizer: boolean;
  attendees?: { id: string; name: string }[];
  updates: EventUpdate[];
  messages: EventMessage[];
}

const roleBadge: Record<string, string> = { volunteer: "badge-ok", cleaner: "badge-ok", authority: "badge-warn" };

function fmtDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function isPast(d: string): boolean { return d < new Date().toISOString().slice(0, 10); }

export function EventDetail() {
  const { talukId, date, eventId } = useParams();
  const navigate = useNavigate();
  const { signedIn } = useAuth();
  const base = `/events/${talukId}/${date}/${eventId}`;

  const [data, setData] = useState<EventDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Organizer edit
  const [editing, setEditing] = useState(false);
  const [eTitle, setETitle] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [eTime, setETime] = useState("");
  const [eLoc, setELoc] = useState("");
  // Organizer update
  const [updateText, setUpdateText] = useState("");
  // Discussion
  const [msgText, setMsgText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  async function load() {
    setError(null);
    try {
      const res = await api.get<EventDetailResponse>(base);
      setData(res);
      setETitle(res.event.title); setEDesc(res.event.description);
      setETime(res.event.time ?? ""); setELoc(res.event.locationLabel);
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(); }, [talukId, date, eventId]);

  if (error) return <section className="section"><div className="container"><ErrorState message={error} onRetry={load} /></div></section>;
  if (!data) return <section className="section"><div className="container"><Loading /></div></section>;

  const e = data.event;
  const past = isPast(e.date);

  async function toggleJoin() {
    if (!signedIn) { navigate("/account?mode=signin"); return; }
    setBusy(true);
    try { await api.post(`${base}/${e.joined ? "leave" : "join"}`); await load(); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  async function saveEdit() {
    setBusy(true);
    try {
      await api.patch(base, { title: eTitle, description: eDesc, time: eTime || undefined, locationLabel: eLoc });
      setEditing(false); await load();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  async function postUpdate() {
    if (updateText.trim().length < 1) return;
    setBusy(true);
    try { await api.post(`${base}/updates`, { text: updateText }); setUpdateText(""); await load(); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  async function postMessage(text: string, parentId?: string) {
    if (text.trim().length < 1) return;
    setBusy(true);
    try {
      await api.post(`${base}/messages`, { text, parentId });
      setMsgText(""); setReplyText(""); setReplyTo(null);
      await load();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  const questions = data.messages.filter((m) => !m.parentId);
  const repliesOf = (id: string) => data.messages.filter((m) => m.parentId === id);

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>← Back</button>

        {/* Header */}
        <div className="card card-pad">
          {!editing ? (
            <>
              <div className="row space-between">
                <h2 style={{ margin: 0 }}>{e.title}</h2>
                {data.isOrganizer && <button className="btn btn-ghost" onClick={() => setEditing(true)}>Edit</button>}
              </div>
              <p className="muted" style={{ margin: "8px 0" }}>{e.description}</p>
              <div className="tag">🗓️ {fmtDate(e.date)}{e.time ? ` · ${e.time}` : ""}</div>
              <div className="tag" style={{ marginTop: 4 }}>📍 {e.locationLabel}</div>
              <div className="row space-between" style={{ marginTop: 14 }}>
                <span className="tag">👥 {e.participants} going · organized by {e.organizerName}</span>
                {past ? <span className="badge badge-ok">Completed</span>
                  : e.joined
                    ? <button className="btn btn-ghost" disabled={busy} onClick={toggleJoin}>✓ Going — Leave</button>
                    : <button className="btn btn-primary" disabled={busy} onClick={toggleJoin}>{signedIn ? "Join" : "Sign in to join"}</button>}
              </div>
            </>
          ) : (
            <>
              <h3 className="mt-0">Edit event</h3>
              <div className="field"><label>Title</label><input className="input" value={eTitle} onChange={(ev) => setETitle(ev.target.value)} /></div>
              <div className="field"><label>Description</label><textarea className="textarea" value={eDesc} onChange={(ev) => setEDesc(ev.target.value)} /></div>
              <div className="field"><label>Time</label><input className="input" type="time" value={eTime} onChange={(ev) => setETime(ev.target.value)} /></div>
              <div className="field"><label>Location</label><input className="input" value={eLoc} onChange={(ev) => setELoc(ev.target.value)} /></div>
              <div className="row">
                <button className="btn btn-primary" disabled={busy} onClick={saveEdit}>Save</button>
                <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </>
          )}
        </div>

        {/* Organizer: attendee list */}
        {data.isOrganizer && (
          <>
            <h3 style={{ marginTop: 28 }}>Who's going ({data.attendees?.length ?? 0})</h3>
            {(!data.attendees || data.attendees.length === 0) ? (
              <EmptyState>No one has joined yet.</EmptyState>
            ) : (
              <div className="card card-pad">
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  {data.attendees.map((a) => <span key={a.id} className="badge badge-ok">👤 {a.name}</span>)}
                </div>
              </div>
            )}
          </>
        )}

        {/* Updates (organizer announcements) */}
        <h3 style={{ marginTop: 28 }}>Updates from the organizer</h3>
        {data.isOrganizer && (
          <div className="card card-pad" style={{ marginBottom: 12 }}>
            <textarea className="textarea" placeholder="Post an update (e.g. bring gloves, meeting point changed)…"
              value={updateText} onChange={(ev) => setUpdateText(ev.target.value)} />
            <button className="btn btn-primary" style={{ marginTop: 10 }} disabled={busy} onClick={postUpdate}>Post update</button>
          </div>
        )}
        {data.updates.length === 0 ? (
          <EmptyState>No updates yet.</EmptyState>
        ) : (
          data.updates.map((u) => (
            <div key={u.updateId} className="card card-pad" style={{ marginBottom: 10 }}>
              <div className="tag">{new Date(u.createdAt).toLocaleString()}</div>
              <p style={{ margin: "6px 0 0" }}>{u.text}</p>
              {u.media.length > 0 && <MediaGallery media={u.media} />}
            </div>
          ))
        )}

        {/* Discussion */}
        <h3 style={{ marginTop: 28 }}>Questions &amp; discussion</h3>
        {signedIn ? (
          <div className="card card-pad" style={{ marginBottom: 12 }}>
            <textarea className="textarea" placeholder="Ask the organizer a question about this event…"
              value={msgText} onChange={(ev) => setMsgText(ev.target.value)} />
            <button className="btn btn-primary" style={{ marginTop: 10 }} disabled={busy} onClick={() => postMessage(msgText)}>Ask</button>
          </div>
        ) : (
          <div className="state state-empty" style={{ textAlign: "left" }}>
            Sign in or sign up to comment.
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn btn-ghost" onClick={() => navigate("/account?mode=signin")}>Sign in</button>
              <button className="btn btn-primary" onClick={() => navigate("/account?mode=signup")}>Sign up</button>
            </div>
          </div>
        )}

        {questions.length === 0 ? (
          <EmptyState>No questions yet. Be the first to ask.</EmptyState>
        ) : (
          questions.map((q) => (
            <div key={q.messageId} className="card card-pad" style={{ marginBottom: 10 }}>
              <div className="row space-between">
                <strong>👤 {q.authorName} <span className={`badge ${roleBadge[q.authorRole] ?? "badge-ok"}`} style={{ marginLeft: 6 }}>{q.authorRole}</span></strong>
                <span className="tag">{new Date(q.createdAt).toLocaleString()}</span>
              </div>
              <p style={{ margin: "6px 0 0" }}>{q.text}</p>

              {/* Replies */}
              {repliesOf(q.messageId).map((r) => (
                <div key={r.messageId} style={{ marginTop: 10, marginLeft: 16, paddingLeft: 12, borderLeft: "2px solid var(--line)" }}>
                  <strong style={{ fontSize: "0.92rem" }}>↳ {r.authorName} <span className={`badge ${roleBadge[r.authorRole] ?? "badge-ok"}`} style={{ marginLeft: 6 }}>{r.authorRole}</span></strong>
                  <p style={{ margin: "4px 0 0" }}>{r.text}</p>
                </div>
              ))}

              {/* Reply box (signed in only) */}
              {signedIn && (
                replyTo === q.messageId ? (
                  <div style={{ marginTop: 10 }}>
                    <textarea className="textarea" placeholder="Write a reply…" value={replyText} onChange={(ev) => setReplyText(ev.target.value)} />
                    <div className="row" style={{ marginTop: 8 }}>
                      <button className="btn btn-primary" disabled={busy} onClick={() => postMessage(replyText, q.messageId)}>Reply</button>
                      <button className="btn btn-ghost" onClick={() => { setReplyTo(null); setReplyText(""); }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-ghost" style={{ marginTop: 10, padding: "5px 10px", fontSize: "0.82rem" }} onClick={() => { setReplyTo(q.messageId); setReplyText(""); }}>
                    Reply
                  </button>
                )
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
