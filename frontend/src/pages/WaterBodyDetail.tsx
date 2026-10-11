import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { WaterBody, Report, RecurringIssue } from "../types";
import { Loading, EmptyState, ErrorState } from "../components/States";
import { ReportCard } from "../components/ReportCard";
import { useRegion } from "../context/RegionContext";

interface WaterBodyDetailResponse {
  waterBody: WaterBody;
  counts: { pollution: number; leakage: number; total: number };
  reports: Report[];
  recurring: RecurringIssue[];
}

const statusMeta: Record<WaterBody["status"], { label: string; cls: string; dot: string }> = {
  OK: { label: "Healthy", cls: "badge-ok", dot: "🟢" },
  MONITORING: { label: "Monitoring", cls: "badge-warn", dot: "🟡" },
  NEEDS_ATTENTION: { label: "Needs attention", cls: "badge-alert", dot: "🔴" },
};

export function WaterBodyDetail() {
  const { waterBodyId } = useParams();
  const { region } = useRegion();
  const navigate = useNavigate();
  const [data, setData] = useState<WaterBodyDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!region || !waterBodyId) return;
    setError(null); setData(null);
    try {
      const res = await api.get<WaterBodyDetailResponse>(
        `/regions/${region.talukId}/waterbodies/${waterBodyId}`
      );
      setData(res);
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(); }, [region?.talukId, waterBodyId]);

  if (!region) {
    navigate("/regions");
    return null;
  }

  if (error) return <section className="section"><div className="container"><ErrorState message={error} onRetry={load} /></div></section>;
  if (!data) return <section className="section"><div className="container"><Loading label="Loading water body..." /></div></section>;

  const sm = statusMeta[data.waterBody.status];

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <button className="btn btn-ghost" onClick={() => navigate("/region")} style={{ marginBottom: 16 }}>
          ← Back to {region.talukName}
        </button>

        <div className="row space-between">
          <div>
            <h2 style={{ margin: 0 }}>🏞️ {data.waterBody.name}</h2>
            <p className="sub" style={{ margin: "2px 0 0" }}>
              {region.talukName}, {region.districtName} · {data.waterBody.kind}
            </p>
          </div>
          <span className={`badge ${sm.cls}`}>{sm.dot} {sm.label}</span>
        </div>

        <div className="grid grid-3" style={{ marginTop: 18 }}>
          <div className="card stat"><div className="num">{data.counts.pollution}</div><div className="lbl">🏞️ Pollution reports</div></div>
          <div className="card stat"><div className="num">{data.counts.leakage}</div><div className="lbl">💧 Leakage reports</div></div>
          <div className="card stat"><div className="num">{data.counts.total}</div><div className="lbl">📋 Total reports</div></div>
        </div>

        {data.recurring.length > 0 && (
          <div className="state state-error" style={{ textAlign: "left", marginTop: 18 }}>
            🔁 Recurring water problem detected: {data.recurring[0].reportCount} reports within {data.recurring[0].windowDays} days.
          </div>
        )}

        <div className="row space-between" style={{ marginTop: 26 }}>
          <h3 style={{ margin: 0 }}>Reports at this water body</h3>
          <button className="btn btn-primary" onClick={() => navigate(`/report?type=POLLUTION&wb=${data.waterBody.waterBodyId}`)}>
            Report pollution here
          </button>
        </div>

        {data.reports.length === 0 ? (
          <EmptyState>No reports yet for {data.waterBody.name}. A clean record is good news.</EmptyState>
        ) : (
          <div className="grid grid-2" style={{ marginTop: 14 }}>
            {data.reports.map((r) => (
              <ReportCard key={r.reportId} report={r} onClick={() => navigate(`/reports/${r.reportId}?taluk=${region.talukId}&at=${encodeURIComponent(r.createdAt)}`)} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
