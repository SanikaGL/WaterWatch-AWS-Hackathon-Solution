import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Flood } from "../types";
import { FloodCard } from "../components/FloodCard";
import { Loading, EmptyState, ErrorState } from "../components/States";
import { useAuth } from "../context/AuthContext";
import { useRegion } from "../context/RegionContext";

export function Floods() {
  const { isAuthority } = useAuth();
  const { region } = useRegion();
  const [floods, setFloods] = useState<Flood[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setError(null); setFloods(null);
    try {
      const data = await api.get<{ floods: Flood[] }>("/floods");
      setFloods(data.floods);
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(); }, []);

  const active = (floods ?? []).filter((f) => f.status === "ACTIVE");
  const other = (floods ?? []).filter((f) => f.status !== "ACTIVE");

  return (
    <>
      {/* Flood video banner header */}
      <header className="flood-band" style={{ minHeight: 300 }}>
        <video className="flood-band-bg" poster="/videos/poster-flood.svg" autoPlay muted loop playsInline preload="metadata">
          <source src="/videos/flood-bg.mp4" type="video/mp4" />
        </video>
        <div className="flood-band-overlay" />
        <div className="container flood-band-content" style={{ padding: "40px 16px" }}>
          <div className="row space-between">
            <div>
              <span className="badge badge-alert"><span className="pulse" /> FLOOD INCIDENTS</span>
              <h1 style={{ color: "#fff", margin: "12px 0 6px", fontSize: "clamp(1.6rem,3.5vw,2.4rem)", textShadow: "0 2px 18px rgba(0,0,0,0.4)" }}>
                Active &amp; recent water emergencies
              </h1>
              <p style={{ color: "#d7edf5", margin: 0, maxWidth: "48ch" }}>
                Live incidents across regions. The most urgent appear first.
              </p>
            </div>
            {isAuthority && (
              <button className="btn btn-alert" onClick={() => setShowForm((s) => !s)}>
                {showForm ? "Cancel" : "+ Declare incident"}
              </button>
            )}
          </div>
        </div>
      </header>

    <section className="section">
      <div className="container">

        {isAuthority && showForm && (
          <DeclareFloodForm region={region} onCreated={() => { setShowForm(false); load(); }} />
        )}

        {error && <ErrorState message={error} onRetry={load} />}
        {!error && floods === null && <Loading label="Loading incidents..." />}
        {!error && floods !== null && floods.length === 0 && (
          <EmptyState>🟢 No flood incidents currently reported.</EmptyState>
        )}

        {active.length > 0 && (
          <div className="grid grid-3">{active.map((f) => <FloodCard key={f.floodId} flood={f} />)}</div>
        )}
        {other.length > 0 && (
          <>
            <h3 style={{ marginTop: 28 }}>Recent / monitoring</h3>
            <div className="grid grid-3">{other.map((f) => <FloodCard key={f.floodId} flood={f} />)}</div>
          </>
        )}
      </div>
    </section>
    </>
  );
}

function DeclareFloodForm({
  region,
  onCreated,
}: {
  region: ReturnType<typeof useRegion>["region"];
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [severity, setSeverity] = useState("SEVERE");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    setErr(null);
    if (!region) { setErr("Select a region first (used to tag the incident)."); return; }
    if (title.trim().length < 2 || locationLabel.trim().length < 2) { setErr("Title and location are required."); return; }
    setBusy(true);
    try {
      await api.post("/floods", {
        title, locationLabel, severity, summary,
        stateId: region.stateId, districtId: region.districtId, talukId: region.talukId,
      });
      onCreated();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="card card-pad" style={{ marginBottom: 20, borderLeft: "5px solid var(--alert)" }}>
      <h3 className="mt-0">Declare a flood incident {region ? `in ${region.talukName}` : ""}</h3>
      <div className="field">
        <label>Title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Belur Road flooding" />
      </div>
      <div className="field">
        <label>Location</label>
        <input className="input" value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} placeholder="e.g. Belur Road, near market" />
      </div>
      <div className="field">
        <label>Severity</label>
        <select className="select" value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="SEVERE">Severe</option>
          <option value="MODERATE">Moderate</option>
          <option value="LOW">Low</option>
        </select>
      </div>
      <div className="field">
        <label>Summary</label>
        <textarea className="textarea" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Short description of the situation" />
      </div>
      {err && <ErrorState message={err} />}
      <button className="btn btn-alert" disabled={busy} onClick={create}>
        {busy ? "Declaring..." : "Declare incident"}
      </button>
    </div>
  );
}
