// Resolve region IDs to display names using the region tree (cached).
import { api } from "./client";
import type { StateNode } from "../types";

let cache: StateNode[] | null = null;

export async function getRegionTree(): Promise<StateNode[]> {
  if (cache) return cache;
  const data = await api.get<{ states: StateNode[] }>("/regions");
  cache = data.states;
  return cache;
}

export function talukLabelFromTree(
  tree: StateNode[],
  stateId?: string,
  districtId?: string,
  talukId?: string
): string {
  if (!talukId) return "";
  for (const s of tree) {
    if (stateId && s.stateId !== stateId) continue;
    for (const d of s.districts) {
      if (districtId && d.districtId !== districtId) continue;
      const t = d.taluks.find((x) => x.talukId === talukId);
      if (t) return `${t.talukName}, ${d.districtName}`;
    }
  }
  return talukId;
}

// Full administrative path "Taluk, District, State" from stable IDs. Falls back to
// whatever ids resolve (so it degrades gracefully before the tree loads).
export function fullRegionLabel(
  tree: StateNode[],
  stateId?: string,
  districtId?: string,
  talukId?: string
): string {
  for (const s of tree) {
    if (stateId && s.stateId !== stateId) continue;
    for (const d of s.districts) {
      if (districtId && d.districtId !== districtId) continue;
      const t = talukId ? d.taluks.find((x) => x.talukId === talukId) : undefined;
      if (t) return `${t.talukName}, ${d.districtName}, ${s.stateName}`;
      if (districtId && d.districtId === districtId) return `${d.districtName}, ${s.stateName}`;
    }
    if (stateId && s.stateId === stateId) return s.stateName;
  }
  // Fallback to ids if tree not loaded / not found
  return [talukId, districtId, stateId].filter(Boolean).join(", ");
}

// "Exact location — Taluk, District, State" for a region-tagged item.
export function locationWithRegion(
  tree: StateNode[],
  exact: string | undefined,
  stateId?: string,
  districtId?: string,
  talukId?: string
): string {
  const region = fullRegionLabel(tree, stateId, districtId, talukId);
  if (exact && region) return `${exact} — ${region}`;
  return exact || region;
}
