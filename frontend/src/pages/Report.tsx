import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { getRegionTree } from "../api/regionNames";
import type { ReportType, StateNode } from "../types";
import { useRegion } from "../context/RegionContext";
import { ErrorState } from "../components/States";
import { MediaUpload, type UploadedMedia } from "../components/MediaUpload";
import { useAuth } from "../context/AuthContext";

const TYPES: { id: ReportType; emoji: string; label: string }[] = [
  { id: "POLLUTION", emoji: "🏞️", label: "Water Pollution" },
  { id: "LEAKAGE", emoji: "💧", label: "Water Leakage" },
  { id: "HAZARD", emoji: "⚠️", label: "Water Safety Hazard" },
];

export function Report() {
  const navigate = useNavigate();
  const { region } = useRegion();
  const { signedIn, email } = useAuth();
  const reporterName = signedIn && email ? email.split("@")[0] : undefined;
  const [params] = useSearchParams();

  const [tree, setTree] = useState<StateNode[]>([]);
  // Region selection — pre-filled from current context if present, but editable here.
  const [stateId, setStateId] = useState(region?.stateId ?? "");
  const [districtId, setDistrictId] = useState(region?.districtId ?? "");
  const [talukId, setTalukId] = useState(region?.talukId ?? "");

  const [type, setType] = useState<ReportType | "">((params.get("type") as ReportType) || "");
  const [locationLabel, setLocationLabel] = useState("");
  const [description, setDescription] = useState("");
  const [noticedWhen, setNoticedWhen] = useState("today");
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reportId: string; recurring?: { triggered: boolean } } | null>(null);

  useEffect(() => { getRegionTree().then(setTree).catch(() => setTree([])); }, []);

  const stateNode = useMemo(() => tree.find((s) => s.stateId === stateId), [tree, stateId]);
  const districtNode = useMemo(() => stateNode?.districts.find((d) => d.districtId === districtId), [stateNode, districtId]);
  const talukName = useMemo(
    () => districtNode?.taluks.find((t) => t.talukId === talukId)?.talukName ?? "",
    [districtNode, talukId]
  );

  async function submit() {
    setError(null);
    if (!stateId || !districtId || !talukId) { setError("Select the region (State, District, Taluk)."); return; }
    if (!type) { setError("Choose what happened."); return; }
    if (locationLabel.trim().length < 2) { setError("Add the exact location."); return; }
    if (description.trim().length < 3) { setError("Add a short description."); return; }

    setSubmitting(true);
    try {
      const res = await api.post<{ report: { reportId: string }; recurring?: { triggered: boolean } }>("/reports", {
        type, locationLabel, description, noticedWhen,
        media: media.map((m) => ({ key: m.key, type: m.type })),
        reporterName, // backend attaches role; ignored when not signed in
        stateId, districtId, talukId,
      });
      setDone({ reportId: res.report.reportId, recurring: res.recurring });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 560 }}>
          <div className="card card-pad">
            <h2 className="mt-0">✅ Report submitted</h2>
            <p className="muted">Thank you. Your report (#{done.reportId}) is now visible to the community and authorities{talukName ? ` in ${talukName}` : ""}.</p>
            {done.recurring?.triggered && (
              <div className="state state-error" style={{ textAlign: "left" }}>
                🔁 This location has now crossed the recurring-issue threshold. An awareness post has been drafted automatically.
              </div>
            )}
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn btn-primary" onClick={() => navigate(region ? "/region" : "/regions")}>Done</button>
              <button className="btn btn-ghost" onClick={() => { setDone(null); setDescription(""); setLocationLabel(""); }}>Report another</button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 560 }}>
        <h2 className="mb-0">Report a water problem</h2>
        <p className="sub">
          {signedIn ? <>Posting as <strong>{reporterName}</strong>.</> : "No account needed."}{" "}
          Choose the region and tell us what you saw.
        </p>

        <div className="card card-pad">
          {/* Region selection — State > District > Taluk */}
          <div className="field">
            <label>Region</label>
            <div className="grid grid-3" style={{ gap: 10 }}>
              <select className="select" value={stateId}
                onChange={(e) => { setStateId(e.target.value); setDistrictId(""); setTalukId(""); }}>
                <option value="">State</option>
                {tree.map((s) => <option key={s.stateId} value={s.stateId}>{s.stateName}</option>)}
              </select>
              <select className="select" value={districtId} disabled={!stateNode}
                onChange={(e) => { setDistrictId(e.target.value); setTalukId(""); }}>
                <option value="">District</option>
                {stateNode?.districts.map((d) => <option key={d.districtId} value={d.districtId}>{d.districtName}</option>)}
              </select>
              <select className="select" value={talukId} disabled={!districtNode}
                onChange={(e) => { setTalukId(e.target.value); }}>
                <option value="">Taluk</option>
                {districtNode?.taluks.map((t) => <option key={t.talukId} value={t.talukId}>{t.talukName}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label>What happened?</label>
            <div className="chips">
              {TYPES.map((t) => (
                <button key={t.id} className={`chip ${type === t.id ? "selected" : ""}`} onClick={() => setType(t.id)}>
                  <span className="emoji">{t.emoji}</span>{t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Exact location</label>
            <input className="input" placeholder="e.g. Northern bank, near the inlet"
              value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} />
          </div>

          <div className="field">
            <label>Describe what you saw</label>
            <textarea className="textarea" placeholder="Short description of the problem"
              value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="field">
            <label>When did you notice it?</label>
            <select className="select" value={noticedWhen} onChange={(e) => setNoticedWhen(e.target.value)}>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="past_week">Past week</option>
              <option value="not_sure">Not sure</option>
            </select>
          </div>

          <div className="field">
            <label>Evidence (optional but powerful)</label>
            <MediaUpload prefix="reports" onChange={setMedia} />
          </div>

          {error && <ErrorState message={error} />}

          <button className="btn btn-primary btn-block btn-lg" disabled={submitting} onClick={submit}>
            {submitting ? "Submitting..." : "Submit Report"}
          </button>
          <p className="tag" style={{ textAlign: "center", marginTop: 10 }}>
            {signedIn ? "This report will be linked to your profile." : "No account needed. Your report helps protect our water."}
          </p>
        </div>
      </div>
    </section>
  );
}
