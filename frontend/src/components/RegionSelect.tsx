// Cascading State -> District -> Taluk selector. Emits stable IDs (never names).
// Used in signup/profile-setup to capture a member's home region.
import { useEffect, useState } from "react";
import { getRegionTree } from "../api/regionNames";
import type { StateNode } from "../types";

export interface RegionValue {
  homeStateId?: string;
  homeDistrictId?: string;
  homeTalukId?: string;
}

export function RegionSelect({
  value,
  onChange,
  compact,
}: {
  value: RegionValue;
  onChange: (v: RegionValue) => void;
  compact?: boolean;
}) {
  const [tree, setTree] = useState<StateNode[]>([]);
  useEffect(() => { getRegionTree().then(setTree).catch(() => setTree([])); }, []);

  const state = tree.find((s) => s.stateId === value.homeStateId);
  const district = state?.districts.find((d) => d.districtId === value.homeDistrictId);

  return (
    <div className="region-select" style={{ display: "grid", gap: 10, gridTemplateColumns: compact ? "1fr" : "repeat(3, 1fr)" }}>
      <select
        className="select"
        value={value.homeStateId ?? ""}
        onChange={(e) => onChange({ homeStateId: e.target.value || undefined, homeDistrictId: undefined, homeTalukId: undefined })}
      >
        <option value="">State…</option>
        {tree.map((s) => <option key={s.stateId} value={s.stateId}>{s.stateName}</option>)}
      </select>

      <select
        className="select"
        value={value.homeDistrictId ?? ""}
        disabled={!state}
        onChange={(e) => onChange({ ...value, homeDistrictId: e.target.value || undefined, homeTalukId: undefined })}
      >
        <option value="">District…</option>
        {state?.districts.map((d) => <option key={d.districtId} value={d.districtId}>{d.districtName}</option>)}
      </select>

      <select
        className="select"
        value={value.homeTalukId ?? ""}
        disabled={!district}
        onChange={(e) => onChange({ ...value, homeTalukId: e.target.value || undefined })}
      >
        <option value="">Taluk…</option>
        {district?.taluks.map((t) => <option key={t.talukId} value={t.talukId}>{t.talukName}</option>)}
      </select>
    </div>
  );
}
