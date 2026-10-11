import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { VolunteerEvent, EventKind } from "../types";
import { useAuth } from "../context/AuthContext";

const kindMeta: Record<EventKind, { emoji: string; label: string }> = {
  CLEANUP: { emoji: "🧹", label: "Cleanup" },
  AWARENESS: { emoji: "📣", label: "Awareness" },
  COMMUNITY: { emoji: "🤝", label: "Community" },
};

function fmtDate(d: string): string {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function isPast(date: string): boolean {
  return date < new Date().toISOString().slice(0, 10);
}

export function EventCard({ event }: { event: VolunteerEvent }) {
  const navigate = useNavigate();
  const { signedIn } = useAuth();
  const k = kindMeta[event.kind] ?? kindMeta.COMMUNITY;
  const past = isPast(event.date);

  const [joined, setJoined] = useState(Boolean(event.joined));
  const [count, setCount] = useState(event.participants);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const base = `/events/${event.talukId}/${event.date}/${event.eventId}`;

  async function toggle() {
    if (!signedIn) { navigate("/account?mode=signin"); return; }
    setBusy(true); setErr(null);
    try {
      const action = joined ? "leave" : "join";
      const res = await api.post<{ participants: number; joined: boolean }>(`${base}/${action}`);
      setJoined(res.joined);
      setCount(res.participants);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="card card-pad">
      <div className="row space-between">
        <span className="badge badge-ok">{k.emoji} {k.label}</span>
        <span className="tag">{fmtDate(event.date)}{event.time ? ` · ${event.time}` : ""}</span>
      </div>
      <h4 style={{ margin: "10px 0 4px", color: "var(--water-900)", cursor: "pointer" }}
        onClick={() => navigate(`/events/${event.talukId}/${event.date}/${event.eventId}`)}>
        {event.title}
      </h4>
      <p className="muted" style={{ margin: "0 0 8px", fontSize: "0.92rem" }}>{event.description}</p>
      <div className="tag">📍 {event.locationLabel}</div>

      <div className="row space-between" style={{ marginTop: 12 }}>
        <span className="tag">👥 {count} going · by {event.organizerName}</span>
        {past ? (
          <span className="badge badge-ok">Completed</span>
        ) : joined ? (
          <div className="row" style={{ gap: 6 }}>
            <span className="badge badge-ok">✓ You're going</span>
            <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: "0.8rem" }} disabled={busy} onClick={toggle}>
              {busy ? "…" : "Leave"}
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" style={{ padding: "6px 14px" }} disabled={busy} onClick={toggle}>
            {busy ? "…" : signedIn ? "Join" : "Sign in to join"}
          </button>
        )}
      </div>
      {!past && !joined && signedIn && (
        <p className="tag" style={{ marginTop: 6 }}>Join to attend on {fmtDate(event.date)} at this location.</p>
      )}
      {err && <p className="tag" style={{ color: "var(--alert)", marginTop: 6 }}>{err}</p>}
      <button className="btn btn-ghost" style={{ marginTop: 10, padding: "6px 12px", fontSize: "0.82rem" }}
        onClick={() => navigate(`/events/${event.talukId}/${event.date}/${event.eventId}`)}>
        View event &amp; discussion →
      </button>
    </div>
  );
}
