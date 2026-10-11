import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Flood, StateNode } from "../types";
import { getRegionTree, locationWithRegion } from "../api/regionNames";

const severityBadge: Record<Flood["severity"], string> = {
  SEVERE: "badge-alert",
  MODERATE: "badge-warn",
  LOW: "badge-ok",
};

export function FloodCard({ flood, showRegion = true }: { flood: Flood; showRegion?: boolean }) {
  const [tree, setTree] = useState<StateNode[]>([]);
  useEffect(() => { getRegionTree().then(setTree).catch(() => setTree([])); }, []);

  const where = locationWithRegion(tree, flood.locationLabel, flood.stateId, flood.districtId, flood.talukId);

  return (
    <div className="card flood-card card-pad">
      <div className="row space-between">
        <span className="badge badge-alert"><span className="pulse" /> ACTIVE FLOOD</span>
        <span className={`badge ${severityBadge[flood.severity]}`}>{flood.severity}</span>
      </div>
      <h3 style={{ margin: "12px 0 2px", color: "var(--water-900)" }}>{flood.title}</h3>
      {showRegion && <div className="tag">📍 {where}</div>}
      <p className="muted" style={{ margin: "10px 0" }}>{flood.summary}</p>
      <div className="row" style={{ gap: 16, fontSize: "0.9rem" }}>
        <span>💬 {flood.updateCount} citizen updates</span>
        <span>🧹 {flood.volunteerCount} responding</span>
      </div>
      <Link to={`/floods/${flood.floodId}`} className="btn btn-alert" style={{ marginTop: 14 }}>
        View Incident
      </Link>
    </div>
  );
}
