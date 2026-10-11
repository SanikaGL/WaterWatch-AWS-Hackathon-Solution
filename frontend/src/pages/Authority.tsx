// Authority dashboard: totals + pending-verification queue with status updates.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Report, ReportStatus, Flood } from "../types";
import { Loading, EmptyState, ErrorState } from "../components/States";
import { MediaUpload, type UploadedMedia } from "../components/MediaUpload";
import { useAuth } from "../context/AuthContext";

interface Overview {
  region?: string;
  scopedTalukId?: string;
  totals: {
    reports: number; pollution: number; leakage: number; hazard: number;
    activeFloods: number; recurring: number; pending: number; resolved: number;
  };
  pending: Report[];
}

const NEXT_STATUS: ReportStatus[] = ["UNDER_REVIEW", "VERIFIED", "ASSIGNED", "RESOLVED"];

export function Authority() {
  const navigate = useNavigate();
  const { isAuthority, loading } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  // Declare-flood-incident form (region comes from the authority's own profile).
  const [showFlood, setShowFlood] = useState(false);
  const [fTitle, setFTitle] = useState("");
  const [fLocation, setFLocation] = useState("");
  const [fSeverity, setFSeverity] = useState<Flood["severity"]>("MODERATE");
  const [fSummary, setFSummary] = useState("");
  const [fMedia, setFMedia] = useState<UploadedMedia[]>([]);
  const [fPosting, setFPosting] = useState(false);
  const [fNotice, setFNotice] = useState<string | null>(null);

  async function declareFlood() {
    if (fTitle.trim().length < 3) { setFNotice("Add a title (min 3 chars)."); return; }
    if (fLocation.trim().length < 2) { setFNotice("Add the exact location."); return; }
    setFPosting(true); setFNotice(null);
    try {
      await api.post<{ flood: Flood }>("/floods", {
        title: fTitle.trim(),
        locationLabel: fLocation.trim(),
        severity: fSeverity,
        summary: fSummary.trim(),
        media: fMedia.map((m) => ({ key: m.key, type: m.type })),
      });
      setFNotice("Flood incident declared for your region. It's now live on the Floods page.");
      setFTitle(""); setFLocation(""); setFSummary(""); setFMedia([]); setFSeverity("MODERATE");
      setShowFlood(false);
    } catch (e) { setFNotice(`Could not declare incident: ${(e as Error).message}`); }
    finally { setFPosting(false); }
  }

  async function load() {
    setError(null); setData(null);
    try {
      setData(await api.get<Overview>("/authority/overview"));
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { if (isAuthority) load(); }, [isAuthority]);

  async function setStatus(r: Report, status: ReportStatus) {
    setWorking(r.reportId);
    try {
      await api.patch(`/regions/${r.talukId}/reports/${r.reportId}/status`, { status, createdAt: r.createdAt });
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setWorking(null); }
  }

  if (loading) return <section className="section"><div className="container"><Loading /></div></section>;

  if (!isAuthority) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 480 }}>
          <h2>Authority access required</h2>
          <p className="sub">This dashboard is for authority accounts (assigned by an administrator).</p>
          <button className="btn btn-primary" onClick={() => navigate("/account")}>Sign in</button>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <div className="row space-between" style={{ flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>🏛️ Authority Dashboard</h2>
            <p className="sub" style={{ margin: 0 }}>
              {data?.region ? <>Water-safety overview for <strong>{data.region}</strong>. Verify reports and track resolution.</> : "Water-safety overview. Verify reports and track resolution."}
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => navigate("/messages")}>💬 Messages</button>
            <button className="btn btn-alert" onClick={() => setShowFlood((s) => !s)}>
              {showFlood ? "Cancel" : "🚨 Declare flood incident"}
            </button>
          </div>
        </div>

        {/* Declare flood incident — region auto-scoped to this authority's region */}
        {showFlood && (
          <div className="card card-pad" style={{ marginTop: 14, borderLeft: "5px solid var(--alert)" }}>
            <h3 style={{ marginTop: 0 }}>Declare a flood incident{data?.region ? ` — ${data.region}` : ""}</h3>
            <p className="sub" style={{ marginTop: 0 }}>This incident will appear on the Floods page for your region. Citizens can then post live updates.</p>
            <div className="field">
              <label>Title</label>
              <input className="input" value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="e.g. Belur Road flooding near market" />
            </div>
            <div className="field">
              <label>Exact location</label>
              <input className="input" value={fLocation} onChange={(e) => setFLocation(e.target.value)} placeholder="e.g. Main Road junction, near bus stand" />
            </div>
            <div className="field">
              <label>Severity</label>
              <select className="select" value={fSeverity} onChange={(e) => setFSeverity(e.target.value as Flood["severity"])}>
                <option value="LOW">Low</option>
                <option value="MODERATE">Moderate</option>
                <option value="SEVERE">Severe</option>
              </select>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea className="textarea" value={fSummary} onChange={(e) => setFSummary(e.target.value)} placeholder="What's happening and what people should do." />
            </div>
            <div className="field">
              <label>Photo (optional)</label>
              <MediaUpload prefix="floods" onChange={setFMedia} />
            </div>
            <button className="btn btn-alert" disabled={fPosting} onClick={declareFlood}>
              {fPosting ? "Declaring…" : "Declare incident"}
            </button>
          </div>
        )}
        {fNotice && <div className="state state-empty" style={{ textAlign: "left", marginTop: 10 }}>{fNotice}</div>}

        {error && <ErrorState message={error} onRetry={load} />}
        {!error && !data && <Loading label="Loading dashboard..." />}

        {data && (
          <>
            <div className="grid grid-3" style={{ marginBottom: 10 }}>
              <div className="card stat"><div className="num">{data.totals.reports}</div><div className="lbl">Total reports</div></div>
              <div className="card stat"><div className="num">{data.totals.pending}</div><div className="lbl">Pending verification</div></div>
              <div className="card stat"><div className="num">{data.totals.activeFloods}</div><div className="lbl">🚨 Active floods</div></div>
            </div>
            <div className="grid grid-3">
              <div className="card stat"><div className="num">{data.totals.pollution}</div><div className="lbl">🏞️ Pollution</div></div>
              <div className="card stat"><div className="num">{data.totals.recurring}</div><div className="lbl">🔁 Recurring</div></div>
              <div className="card stat"><div className="num">{data.totals.resolved}</div><div className="lbl">✅ Resolved</div></div>
            </div>

            <h3 style={{ marginTop: 30 }}>Pending verification</h3>
            {data.pending.length === 0 ? (
              <EmptyState>🟢 Nothing pending. All reports have been reviewed.</EmptyState>
            ) : (
              <div className="grid grid-2">
                {data.pending.map((r) => (
                  <div key={r.reportId} className="card card-pad">
                    <div className="row space-between">
                      <strong>{r.type}</strong>
                      <span className="badge badge-warn">{r.status.replace(/_/g, " ")}</span>
                    </div>
                    <p style={{ margin: "8px 0 4px" }}>{r.description}</p>
                    <div className="tag">📍 {r.locationLabel} · {r.talukId}</div>
                    <div className="row" style={{ marginTop: 10, gap: 8 }}>
                      {NEXT_STATUS.map((s) => (
                        <button key={s} className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                          disabled={working === r.reportId} onClick={() => setStatus(r, s)}>
                          {s.replace(/_/g, " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
