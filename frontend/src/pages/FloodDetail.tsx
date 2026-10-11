import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import type { Flood, StateNode, VolunteerEvent } from "../types";
import { Loading, EmptyState, ErrorState } from "../components/States";
import { MediaUpload, type UploadedMedia } from "../components/MediaUpload";
import { MediaGallery } from "../components/MediaGallery";
import { EventCard } from "../components/EventCard";
import { SectionNav } from "../components/SectionNav";
import { ShowMore } from "../components/ShowMore";
import { useAuth } from "../context/AuthContext";
import { getRegionTree, locationWithRegion } from "../api/regionNames";

interface FloodUpdate {
  updateId: string;
  author: string;
  authorId?: string;
  authorRole?: "volunteer" | "cleaner" | "authority";
  text: string;
  hazardType?: string;
  media?: { key: string; type: "image" | "video" }[];
  createdAt: string;
  upvotes: number;
}

const roleBadge: Record<string, string> = {
  volunteer: "badge-ok", cleaner: "badge-ok", authority: "badge-warn",
};

const HAZARDS = [
  { id: "ROAD_BLOCKED", label: "Road blocked" },
  { id: "ELECTRICAL", label: "Electrical hazard" },
  { id: "CONTAMINATED_WATER", label: "Contaminated water" },
  { id: "PERSON_NEEDS_HELP", label: "Person needs help" },
  { id: "ANIMAL_TRAPPED", label: "Animal trapped" },
  { id: "OTHER", label: "Other" },
];

export function FloodDetail() {
  const { floodId } = useParams();
  const { signedIn, email } = useAuth();
  const reporterName = signedIn && email ? email.split("@")[0] : undefined;
  const [flood, setFlood] = useState<Flood | null>(null);
  const [updates, setUpdates] = useState<FloodUpdate[]>([]);
  const [events, setEvents] = useState<VolunteerEvent[]>([]);
  const [tree, setTree] = useState<StateNode[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState("");
  const [hazardType, setHazardType] = useState("OTHER");
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [posting, setPosting] = useState(false);

  async function load() {
    setError(null);
    try {
      const data = await api.get<{ flood: Flood; updates: FloodUpdate[] }>(`/floods/${floodId}`);
      setFlood(data.flood);
      setUpdates(data.updates);
      // Volunteer events in this flood's region (same taluk) — people can join.
      if (data.flood?.talukId) {
        api.get<{ upcoming: VolunteerEvent[] }>(`/regions/${data.flood.talukId}/events`)
          .then((e) => setEvents(e.upcoming))
          .catch(() => setEvents([]));
      }
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(); }, [floodId]);
  useEffect(() => { getRegionTree().then(setTree).catch(() => setTree([])); }, []);

  async function postUpdate() {
    if (text.trim().length < 1) return;
    setPosting(true);
    try {
      await api.post(`/floods/${floodId}/updates`, {
        text, hazardType, author: reporterName,
        media: media.map((m) => ({ key: m.key, type: m.type })),
      });
      setText("");
      setMedia([]);
      setShowForm(false);
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setPosting(false); }
  }

  if (error) return <section className="section"><div className="container"><ErrorState message={error} onRetry={load} /></div></section>;
  if (!flood) return <section className="section"><div className="container"><Loading /></div></section>;

  return (
    <>
      {/* Flood video banner header */}
      <header className="flood-band" style={{ minHeight: 380 }}>
        <video className="flood-band-bg" poster="/videos/poster-flood.svg" autoPlay muted loop playsInline preload="metadata">
          <source src="/videos/flood-bg.mp4" type="video/mp4" />
        </video>
        <div className="flood-band-overlay" />
        <div className="container flood-band-content" style={{ maxWidth: 760, padding: "44px 16px 40px" }}>
          <span className="badge badge-alert"><span className="pulse" /> {flood.status}</span>
          <h1 style={{ color: "#fff", margin: "14px 0 6px", fontSize: "clamp(1.6rem,3.5vw,2.4rem)", textShadow: "0 2px 18px rgba(0,0,0,0.4)" }}>
            {flood.title}
          </h1>
          <div className="flood-primary-loc">
            📍 {locationWithRegion(tree, flood.locationLabel, flood.stateId, flood.districtId, flood.talukId)} · Severity {flood.severity}
          </div>
          <p className="flood-primary-summary">{flood.summary}</p>
          <div className="flood-primary-meta">
            <span>💬 {updates.length} citizen updates</span>
            <span>🧹 {flood.volunteerCount} responding</span>
            <span>🏛️ {flood.createdByName ? `Declared by ${flood.createdByName}` : `Authority: ${flood.authorityStatus}`}</span>
          </div>
          {flood.media && flood.media.length > 0 && <MediaGallery media={flood.media} />}
        </div>
      </header>

    <section className="section">
      <div className="container">
        {/* Signpost: tell users what's on this incident page + jump to it */}
        <SectionNav links={[
          { id: "flood-updates", label: "Citizen updates", count: updates.length },
          { id: "flood-events", label: "Volunteer events", count: events.length },
        ]} />

        {/* Top bar: heading + Report-about-this-flood action (next to heading) */}
        <div id="flood-updates" className="section-anchor row space-between" style={{ marginBottom: 6 }}>
          <h3 style={{ margin: 0 }}>Live citizen updates</h3>
          <button className="btn btn-alert" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "＋ Report about this flood"}
          </button>
        </div>
        <p className="sub" style={{ marginTop: 0 }}>
          {signedIn
            ? <>Posting as <strong>{reporterName}</strong>.</>
            : "Anyone can post an update — no account needed."}
        </p>

        {/* Report form (collapsible, sits at the top) */}
        {showForm && (
          <div className="card card-pad" style={{ marginBottom: 20, borderLeft: "5px solid var(--alert)" }}>
            <div className="field">
              <label>What's happening? (hazard type)</label>
              <select className="select" value={hazardType} onChange={(e) => setHazardType(e.target.value)}>
                {HAZARDS.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
              </select>
            </div>
            <div className="field">
              <textarea className="textarea" placeholder="e.g. Water entered the house, road is blocked near the market"
                value={text} onChange={(e) => setText(e.target.value)} />
            </div>
            <div className="field">
              <label>Photo / video (optional)</label>
              <MediaUpload prefix="floods" onChange={setMedia} />
            </div>
            <button className="btn btn-primary" disabled={posting} onClick={postUpdate}>
              {posting ? "Posting..." : "Post update"}
            </button>
          </div>
        )}

        {/* Updates below, two per row */}
        {updates.length === 0 ? (
          <p className="muted">Be the first to post an update for this incident.</p>
        ) : (
          <div className="grid grid-2">
            <ShowMore initial={6} moreLabel="Show all updates">
              {updates.map((u) => (
                <div key={u.updateId} className="card card-pad">
                  <div className="row space-between">
                    <strong>
                      👤 {u.author}
                      {u.authorRole && (
                        <span className={`badge ${roleBadge[u.authorRole] ?? "badge-ok"}`} style={{ marginLeft: 8 }}>
                          {u.authorRole}
                        </span>
                      )}
                    </strong>
                    <span className="tag">{new Date(u.createdAt).toLocaleString()}</span>
                  </div>
                  {u.hazardType && <span className="badge badge-warn" style={{ marginTop: 6 }}>{u.hazardType.replace(/_/g, " ")}</span>}
                  <p style={{ margin: "8px 0 0" }}>{u.text}</p>
                  {u.media && u.media.length > 0 && <MediaGallery media={u.media} />}
                </div>
              ))}
            </ShowMore>
          </div>
        )}

        {/* Volunteer response events in this region — anyone signed in can join */}
        <h3 id="flood-events" className="section-anchor" style={{ marginTop: 36 }}>🤝 Volunteer events in this region</h3>
        <p className="sub" style={{ marginTop: 0 }}>
          Cleanup and awareness events near this incident. Join to attend on the event day.
        </p>
        {events.length === 0 ? (
          <EmptyState>No upcoming volunteer events in this region yet.</EmptyState>
        ) : (
          <div className="grid grid-2">
            {events.map((ev) => <EventCard key={ev.eventId} event={ev} />)}
          </div>
        )}
      </div>
    </section>
    </>
  );
}
