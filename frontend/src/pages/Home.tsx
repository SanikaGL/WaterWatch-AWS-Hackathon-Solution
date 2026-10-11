import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Flood, VolunteerProfile, StateNode } from "../types";
import { Loading, EmptyState, ErrorState } from "../components/States";
import { HeroVideo } from "../components/HeroVideo";
import { Avatar } from "../components/Avatar";
import { useRegion, regionLabelCompact } from "../context/RegionContext";
import { getRegionTree, locationWithRegion } from "../api/regionNames";

const severityWeight: Record<Flood["severity"], number> = { SEVERE: 3, MODERATE: 2, LOW: 1 };

export function Home() {
  const navigate = useNavigate();
  const { region } = useRegion();
  const [floods, setFloods] = useState<Flood[] | null>(null);
  const [floodErr, setFloodErr] = useState<string | null>(null);
  const [vols, setVols] = useState<VolunteerProfile[]>([]);
  const [tree, setTree] = useState<StateNode[]>([]);

  async function loadFloods() {
    setFloodErr(null);
    setFloods(null);
    try {
      const data = await api.get<{ floods: Flood[] }>("/floods?status=ACTIVE");
      setFloods(data.floods);
    } catch (e) {
      setFloodErr((e as Error).message);
    }
  }
  useEffect(() => {
    loadFloods();
    api.get<{ volunteers: VolunteerProfile[] }>("/volunteers")
      .then((d) => setVols(d.volunteers))
      .catch(() => setVols([]));
    getRegionTree().then(setTree).catch(() => setTree([]));
  }, []);

  const active = [...(floods ?? [])]
    .filter((f) => f.status === "ACTIVE")
    .sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);
  const primary = active[0];
  const rest = active.slice(1);

  return (
    <>
      {/* ============ FIRST SECTION: 70% hero | 30% volunteer ============ */}
      <section className="split">
        {/* LEFT 70%: cinematic 3-video composition + title overlay */}
        <div className="split-hero">
          <div className="hero-videos">
            <HeroVideo src="/videos/hero-devotion.mp4" poster="/videos/poster-devotion.svg" />
            <HeroVideo src="/videos/hero-leakage.mp4" poster="/videos/poster-leakage.svg" />
            <HeroVideo src="/videos/hero-drain.mp4" poster="/videos/poster-drain.svg" />
          </div>
          <div className="hero-overlay">
            <h1>Protect the water around us.</h1>
            <p>
              Report pollution, leakage and hazards. Respond to emergencies.
              Take part in verified cleanup — no account needed to report.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-lg" onClick={() => navigate("/report")}>
                Report a Water Problem
              </button>
              <button className="btn btn-ghost btn-lg" onClick={() => navigate("/regions")}>
                {region ? `📍 ${regionLabelCompact(region)}` : "Explore your region"}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT 30%: volunteer community entry point (preview only) */}
        <aside className="split-volunteer">
          <span className="vol-eyebrow">The community</span>
          <h2>People who show up for water</h2>
          <p>
            Volunteers respond during floods, run river &amp; lake cleanups, and lead
            awareness drives. They create events — and anyone can join.
          </p>

          <div className="vol-preview">
            {vols.slice(0, 3).map((v) => (
              <div key={v.volunteerId} className="vol-preview-row" onClick={() => navigate(`/volunteers/${v.volunteerId}`)}>
                <Avatar name={v.name} avatarKey={v.avatarKey} size={42} />
                <div className="vol-preview-info">
                  <strong>{v.name}</strong>
                  <span className="tag">{v.bio ? v.bio.slice(0, 46) + (v.bio.length > 46 ? "…" : "") : `${v.eventsConducted} events`}</span>
                </div>
              </div>
            ))}
            {vols.length === 0 && <p className="tag">Loading community…</p>}
          </div>

          <div className="vol-ways">
            <span>🌊 Flood response</span>
            <span>🧹 Cleanups</span>
            <span>🏞️ River awareness</span>
          </div>

          {vols.length > 0 && (
            <p className="vol-count">
              <strong>{vols.length}+</strong> active volunteers · join an event near you
            </p>
          )}

          <button className="btn btn-primary btn-block" onClick={() => navigate("/account?role=volunteer")}>
            Become a Volunteer
          </button>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => navigate("/volunteers")}>
            Meet them &amp; join events
          </button>
        </aside>
      </section>

      {/* ============ NO-SIGNUP REPORT CTA (impossible to miss) ============ */}
      <section className="report-cta">
        <div className="container report-cta-inner">
          <div className="report-cta-text">
            <span className="report-cta-eyebrow">No account needed</span>
            <h2>See a water problem? Report it in seconds.</h2>
            <p>Pollution, leakage or a hazard — report anonymously, right now. No signup, no login, no waiting.</p>
          </div>
          <button className="btn btn-lg report-cta-btn" onClick={() => navigate("/report")}>
            Report a problem — it's free &amp; anonymous
          </button>
        </div>
      </section>

      {/* ============ SECOND SECTION: full-width flood over flood visual ============ */}
      <section className="flood-band">
        <video className="flood-band-bg" poster="/videos/poster-flood.svg" autoPlay muted loop playsInline preload="metadata">
          <source src="/videos/flood-bg.mp4" type="video/mp4" />
        </video>
        <div className="flood-band-overlay" />
        <div className="container flood-band-content">
          <span className="badge badge-alert" style={{ marginBottom: 10 }}>
            <span className="pulse" /> ACTIVE FLOOD INCIDENTS
          </span>

          {floodErr && <ErrorState message={floodErr} onRetry={loadFloods} />}
          {!floodErr && floods === null && <Loading label="Checking for active incidents..." />}
          {!floodErr && floods !== null && active.length === 0 && (
            <EmptyState>🟢 No active flood incidents currently reported. Stay safe.</EmptyState>
          )}

          {primary && (
            <div className="flood-primary">
              <div className="flood-primary-head">
                <h2>{primary.title}</h2>
                <span className="badge badge-alert">{primary.severity}</span>
              </div>
              <div className="flood-primary-loc">
                📍 {locationWithRegion(tree, primary.locationLabel, primary.stateId, primary.districtId, primary.talukId)}
              </div>
              <p className="flood-primary-summary">{primary.summary}</p>
              <div className="flood-primary-meta">
                <span>💬 {primary.updateCount} citizen updates</span>
                <span>🧹 {primary.volunteerCount} responding</span>
                <span>🏛️ {primary.authorityStatus}</span>
              </div>
              <button className="btn btn-alert" onClick={() => navigate(`/floods/${primary.floodId}`)}>
                View incident
              </button>
            </div>
          )}

          {rest.length > 0 && (
            <div className="flood-rest">
              {rest.map((f) => (
                <button key={f.floodId} className="flood-rest-item" onClick={() => navigate(`/floods/${f.floodId}`)}>
                  <span className="badge badge-alert">{f.severity}</span>
                  <strong>{f.title}</strong>
                  <span className="tag" style={{ color: "#cfe8f0" }}>
                    {locationWithRegion(tree, f.locationLabel, f.stateId, f.districtId, f.talukId)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section" style={{ background: "#fff", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <div className="container">
          <h2>How WaterWatch works</h2>
          <p className="sub">From a single report to real-world action.</p>
          <div className="grid grid-3 steps">
            <div className="card step"><h3>Report</h3><p>See a water problem? Report it without creating an account.</p></div>
            <div className="card step"><h3>Verify &amp; connect</h3><p>Reports are grouped with nearby and related water problems.</p></div>
            <div className="card step"><h3>Take action</h3><p>Volunteers organize events; cleaners take verified cleanup actions.</p></div>
          </div>
          <div className="grid grid-3 steps" style={{ marginTop: 16 }}>
            <div className="card step"><h3>Resolve</h3><p>Authorities track resolution and update status.</p></div>
            <div className="card step"><h3>Recognize</h3><p>Verified cleanup actions become reward eligible.</p></div>
            <div className="card step"><h3>Raise awareness</h3><p>Recurring problems trigger automatic awareness posts.</p></div>
          </div>
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="section">
        <div className="container">
          <h2>What needs attention?</h2>
          <p className="sub">Pick an action to get started.</p>
          <div className="grid grid-3">
            <button className="chip" style={{ padding: 28 }} onClick={() => navigate("/report")}>
              <span className="emoji">🌊</span> Report a water problem
            </button>
            <button className="chip" style={{ padding: 28 }} onClick={() => navigate("/regions")}>
              <span className="emoji">🗺️</span> Explore your region
            </button>
            <button className="chip" style={{ padding: 28 }} onClick={() => navigate("/volunteers")}>
              <span className="emoji">🤝</span> Meet the volunteers
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
