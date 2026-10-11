// Canonical region tree with STABLE IDs. Display identity = Taluk, District, State.
export interface StateNode {
  stateId: string;
  stateName: string;
  districts: DistrictNode[];
}
export interface DistrictNode {
  districtId: string;
  districtName: string;
  taluks: TalukNode[];
}
export interface TalukNode {
  talukId: string;
  talukName: string;
}

export const REGION_TREE: StateNode[] = [
  {
    stateId: "KA",
    stateName: "Karnataka",
    districts: [
      {
        districtId: "HASSAN",
        districtName: "Hassan",
        taluks: [
          { talukId: "BELUR", talukName: "Belur" },
          { talukId: "ARKALGUD", talukName: "Arkalgud" },
          { talukId: "ALUR", talukName: "Alur" },
          { talukId: "ARASIKERE", talukName: "Arasikere" },
          { talukId: "CHANNARAYAPATNA", talukName: "Channarayapatna" },
          { talukId: "HOLENARASIPURA", talukName: "Holenarasipura" },
          { talukId: "HASSAN", talukName: "Hassan" },
          { talukId: "SAKLESHPUR", talukName: "Sakleshpur" },
        ],
      },
    ],
  },
];

export interface SeedWaterBody {
  waterBodyId: string;
  name: string;
  kind: "LAKE" | "RIVER" | "POND" | "RESERVOIR" | "CANAL";
  stateId: string;
  districtId: string;
  talukId: string;
}

// A few seeded water bodies inside Belur taluk (nested in region).
export const SEED_WATER_BODIES: SeedWaterBody[] = [
  { waterBodyId: "BELUR_LAKE", name: "Belur Lake", kind: "LAKE", stateId: "KA", districtId: "HASSAN", talukId: "BELUR" },
  { waterBodyId: "YAGACHI_RIVER", name: "Yagachi River", kind: "RIVER", stateId: "KA", districtId: "HASSAN", talukId: "BELUR" },
  { waterBodyId: "YAGACHI_RESERVOIR", name: "Yagachi Reservoir", kind: "RESERVOIR", stateId: "KA", districtId: "HASSAN", talukId: "BELUR" },
];

// Resolve a taluk id -> {talukName, districtName, stateName} for display + search.
export function resolveRegion(talukId?: string): { stateName: string; districtName: string; talukName: string } | undefined {
  if (!talukId) return undefined;
  for (const s of REGION_TREE)
    for (const d of s.districts)
      for (const t of d.taluks)
        if (t.talukId === talukId)
          return { stateName: s.stateName, districtName: d.districtName, talukName: t.talukName };
  return undefined;
}

// A lowercase "Taluk District State" haystack for free-text region search.
export function regionSearchText(talukId?: string): string {
  const r = resolveRegion(talukId);
  if (!r) return "";
  return `${r.talukName} ${r.districtName} ${r.stateName}`.toLowerCase();
}

export function flattenTaluks() {
  const out: { stateId: string; stateName: string; districtId: string; districtName: string; talukId: string; talukName: string }[] = [];
  for (const s of REGION_TREE)
    for (const d of s.districts)
      for (const t of d.taluks)
        out.push({
          stateId: s.stateId,
          stateName: s.stateName,
          districtId: d.districtId,
          districtName: d.districtName,
          talukId: t.talukId,
          talukName: t.talukName,
        });
  return out;
}
