// Create Event — volunteer-only (backend enforces the role too). Uses the existing
// State > District > Taluk region hierarchy so events are correctly region-associated.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { getRegionTree } from "../api/regionNames";
import type { StateNode, EventKind } from "../types";
import { ErrorState } from "../components/States";
import { MediaUpload, type UploadedMedia } from "../components/MediaUpload";
import { useAuth } from "../context/AuthContext";
import { useRegion } from "../context/RegionContext";

const KINDS: { id: EventKind; emoji: string; label: string }[] = [
  { id: "CLEANUP", emoji: "🧹", label: "Cleanup drive" },
  { id: "AWARENESS", emoji: "📣", label: "Awareness event" },
  { id: "COMMUNITY", emoji: "🤝", label: "Community activity" },
];

export function CreateEvent() {
  const navigate = useNavigate();
  const { isVolunteer, signedIn, loading } = useAuth();
  const { region } = useRegion();

  const [tree, setTree] = useState<StateNode[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<EventKind>("CLEANUP");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  // Pre-fill from current region context if present.
  const [stateId, setStateId] = useState(region?.stateId ?? "");
  const [districtId, setDistrictId] = useState(region?.districtId ?? "");
  const [talukId, setTalukId] = useState(region?.talukId ?? "");
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getRegionTree().then(setTree).catch(() => setTree([])); }, []);

  const stateNode = useMemo(() => tree.find((s) => s.stateId === stateId), [tree, stateId]);
  const districtNode = useMemo(() => stateNode?.districts.find((d) => d.districtId === districtId), [stateNode, districtId]);

  if (loading) return <section className="section"><div className="container" /></section>;

  if (!isVolunteer) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 520 }}>
          <h2>Only volunteers can create events</h2>
          <p className="sub">
            {signedIn
              ? "Your account isn't a volunteer account. Organizing cleanup and awareness events is a volunteer action."
              : "Organizing cleanup and awareness events is a volunteer action. Sign up as a volunteer first — it takes a minute (email OTP). You'll come straight back here."}
          </p>
          <div className="row">
            {!signedIn && (
              <button className="btn btn-ghost btn-lg" onClick={() => navigate("/account?mode=signin&next=/events/new")}>Sign in</button>
            )}
            <button className="btn btn-primary btn-lg" onClick={() => navigate("/account?mode=signup&role=volunteer&next=/events/new")}>
              Sign up as Volunteer
            </button>
          </div>
        </div>
      </section>
    );
  }

  async function submit() {
    setError(null);
    if (title.trim().length < 2) return setError("Add an event title.");
    if (description.trim().length < 3) return setError("Add a short description.");
    if (!date) return setError("Pick a date.");
    if (locationLabel.trim().length < 2) return setError("Add a meeting/event location.");
    if (!stateId || !districtId || !talukId) return setError("Select State, District and Taluk.");

    setBusy(true);
    try {
      const res = await api.post<{ event: { eventId: string } }>("/events", {
        title, description, kind, date, time: time || undefined, locationLabel,
        stateId, districtId, talukId,
        media: media.map((m) => ({ key: m.key, type: m.type })),
      });
      // Go to the organizer's region page where the event now appears, or volunteers list.
      navigate("/volunteers");
      void res;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 620 }}>
        <h2 className="mb-0">Create an event</h2>
        <p className="sub">Organize a cleanup, awareness or community activity in your region.</p>

        <div className="card card-pad">
          <div className="field">
            <label>Type of event</label>
            <div className="chips">
              {KINDS.map((k) => (
                <button key={k.id} className={`chip ${kind === k.id ? "selected" : ""}`} onClick={() => setKind(k.id)}>
                  <span className="emoji">{k.emoji}</span>{k.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Title</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Belur Lake Cleanup Drive" />
          </div>

          <div className="field">
            <label>Description</label>
            <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will volunteers do? What should they bring?" />
          </div>

          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field">
              <label>Date</label>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Time (optional)</label>
              <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>Meeting / event location</label>
            <input className="input" value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} placeholder="e.g. Northern bank, Belur Lake" />
          </div>

          {/* Region hierarchy: State > District > Taluk */}
          <div className="grid grid-3" style={{ gap: 12 }}>
            <div className="field">
              <label>State</label>
              <select className="select" value={stateId}
                onChange={(e) => { setStateId(e.target.value); setDistrictId(""); setTalukId(""); }}>
                <option value="">Select</option>
                {tree.map((s) => <option key={s.stateId} value={s.stateId}>{s.stateName}</option>)}
              </select>
            </div>
            <div className="field">
              <label>District</label>
              <select className="select" value={districtId} disabled={!stateNode}
                onChange={(e) => { setDistrictId(e.target.value); setTalukId(""); }}>
                <option value="">Select</option>
                {stateNode?.districts.map((d) => <option key={d.districtId} value={d.districtId}>{d.districtName}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Taluk</label>
              <select className="select" value={talukId} disabled={!districtNode}
                onChange={(e) => setTalukId(e.target.value)}>
                <option value="">Select</option>
                {districtNode?.taluks.map((t) => <option key={t.talukId} value={t.talukId}>{t.talukName}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Event image (optional)</label>
            <MediaUpload prefix="awareness" onChange={setMedia} />
          </div>

          {error && <ErrorState message={error} />}

          <button className="btn btn-primary btn-block btn-lg" disabled={busy} onClick={submit}>
            {busy ? "Creating..." : "Create event"}
          </button>
        </div>
      </div>
    </section>
  );
}
