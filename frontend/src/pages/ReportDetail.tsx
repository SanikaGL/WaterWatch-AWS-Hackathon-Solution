import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Report, Comment } from "../types";
import { Loading, ErrorState } from "../components/States";
import { MediaGallery } from "../components/MediaGallery";
import { Comments } from "../components/Comments";

interface ReportDetailResponse { report: Report; comments: Comment[]; }

const typeLabel: Record<Report["type"], string> = {
  POLLUTION: "🏞️ Water Pollution", LEAKAGE: "💧 Water Leakage", HAZARD: "⚠️ Water Hazard",
};

export function ReportDetail() {
  const { reportId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const talukId = params.get("taluk") || "";
  const createdAt = params.get("at") || "";

  const [data, setData] = useState<ReportDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.get<ReportDetailResponse>(
        `/regions/${talukId}/reports/${reportId}?createdAt=${encodeURIComponent(createdAt)}`
      );
      setData(res);
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(); }, [reportId, talukId, createdAt]);

  if (error) return <section className="section"><div className="container"><ErrorState message={error} onRetry={load} /></div></section>;
  if (!data) return <section className="section"><div className="container"><Loading /></div></section>;

  const r = data.report;

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 680 }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>← Back</button>

        <div className="card card-pad">
          <div className="row space-between">
            <strong>{typeLabel[r.type]}</strong>
            <span className={`badge ${r.status === "VERIFIED" || r.status === "RESOLVED" ? "badge-ok" : "badge-warn"}`}>
              {r.status.replace(/_/g, " ")}
            </span>
          </div>
          <h2 style={{ margin: "10px 0 4px" }}>{r.description}</h2>
          <div className="tag">📍 {r.locationLabel} · {new Date(r.createdAt).toLocaleString()}</div>
          {/* Attribution: identified member vs anonymous citizen */}
          <div className="tag" style={{ marginTop: 6 }}>
            {r.reporterId ? (
              <>Reported by{" "}
                <a onClick={() => navigate(`/volunteers/${r.reporterId}`)} style={{ cursor: "pointer" }}>
                  {r.reporterName}
                </a>
                {r.reporterRole && <span className={`badge ${r.reporterRole === "authority" ? "badge-warn" : "badge-ok"}`} style={{ marginLeft: 6 }}>{r.reporterRole}</span>}
              </>
            ) : (
              <>Reported anonymously</>
            )}
          </div>
          <MediaGallery media={r.media} />
        </div>

        <h3 style={{ marginTop: 26 }}>Community observations</h3>
        <p className="sub" style={{ marginTop: -6 }}>
          Comments support a report but are not official verification.
        </p>
        <Comments targetId={reportId!} comments={data.comments} onPosted={load} />
      </div>
    </section>
  );
}
