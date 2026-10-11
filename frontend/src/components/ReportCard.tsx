import type { Report, ReportStatus, ReportType } from "../types";
import { MediaGallery } from "./MediaGallery";

const typeMeta: Record<ReportType, { emoji: string; label: string }> = {
  POLLUTION: { emoji: "🏞️", label: "Pollution" },
  LEAKAGE: { emoji: "💧", label: "Leakage" },
  HAZARD: { emoji: "⚠️", label: "Hazard" },
};

const statusBadge: Record<ReportStatus, string> = {
  REPORTED: "badge-warn",
  UNDER_REVIEW: "badge-warn",
  VERIFIED: "badge-ok",
  ASSIGNED: "badge-ok",
  RESOLVED: "badge-ok",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  const hrs = Math.floor(diff / 3600000);
  if (hrs > 0) return `${hrs}h ago`;
  const mins = Math.floor(diff / 60000);
  return `${mins}m ago`;
}

export function ReportCard({ report, onClick }: { report: Report; onClick?: () => void }) {
  const meta = typeMeta[report.type];
  return (
    <div className="card card-pad" style={{ cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <div className="row space-between">
        <strong>{meta.emoji} {meta.label}</strong>
        <span className={`badge ${statusBadge[report.status]}`}>{report.status.replace(/_/g, " ")}</span>
      </div>
      <p style={{ margin: "8px 0 4px" }}>{report.description}</p>
      <div className="tag">📍 {report.locationLabel} · {timeAgo(report.createdAt)}</div>
      <div className="tag" style={{ marginTop: 4 }}>
        {report.reporterName ? <>👤 {report.reporterName}{report.reporterRole ? ` · ${report.reporterRole}` : ""}</> : "👤 Anonymous"}
      </div>
      <MediaGallery media={report.media} />
      {report.upvotes > 0 && <div className="tag" style={{ marginTop: 6 }}>👍 {report.upvotes}</div>}
    </div>
  );
}
