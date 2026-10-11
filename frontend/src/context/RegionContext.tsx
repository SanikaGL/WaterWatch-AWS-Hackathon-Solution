// The "selected region" is the central context of the whole app.
// Persisted to localStorage so a refresh keeps the user's region.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SelectedRegion } from "../types";

const STORAGE_KEY = "waterwatch.region";

interface RegionContextValue {
  region: SelectedRegion | null;
  setRegion: (r: SelectedRegion) => void;
  clearRegion: () => void;
}

const RegionContext = createContext<RegionContextValue | undefined>(undefined);

export function RegionProvider({ children }: { children: ReactNode }) {
  const [region, setRegionState] = useState<SelectedRegion | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SelectedRegion) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (region) localStorage.setItem(STORAGE_KEY, JSON.stringify(region));
    else localStorage.removeItem(STORAGE_KEY);
  }, [region]);

  const value = useMemo<RegionContextValue>(
    () => ({
      region,
      setRegion: setRegionState,
      clearRegion: () => setRegionState(null),
    }),
    [region]
  );

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion() {
  const ctx = useContext(RegionContext);
  if (!ctx) throw new Error("useRegion must be used within RegionProvider");
  return ctx;
}

export function regionLabel(r: SelectedRegion): string {
  // Display identity is always "Taluk, District, State".
  return `${r.talukName}, ${r.districtName}, ${r.stateName}`;
}

export function regionLabelCompact(r: SelectedRegion): string {
  return `${r.talukName}, ${r.districtName}`;
}
