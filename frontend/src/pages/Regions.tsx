import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { StateNode } from "../types";
import { Loading, ErrorState } from "../components/States";
import { useRegion } from "../context/RegionContext";

export function Regions() {
  const navigate = useNavigate();
  const { setRegion } = useRegion();
  const [tree, setTree] = useState<StateNode[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [stateId, setStateId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [talukId, setTalukId] = useState("");

  async function load() {
    setError(null); setTree(null);
    try {
      const data = await api.get<{ states: StateNode[] }>("/regions");
      setTree(data.states);
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(); }, []);

  const stateNode = useMemo(() => tree?.find((s) => s.stateId === stateId), [tree, stateId]);
  const districtNode = useMemo(() => stateNode?.districts.find((d) => d.districtId === districtId), [stateNode, districtId]);

  function explore() {
    if (!stateNode || !districtNode) return;
    const taluk = districtNode.taluks.find((t) => t.talukId === talukId);
    if (!taluk) return;
    setRegion({
      stateId: stateNode.stateId, stateName: stateNode.stateName,
      districtId: districtNode.districtId, districtName: districtNode.districtName,
      talukId: taluk.talukId, talukName: taluk.talukName,
    });
    navigate("/region");
  }

  return (
    <div className="region-page">
      {/* Full-page background video (fixed) + readability overlay */}
      <video className="region-bg-video" poster="/videos/poster-region.svg" autoPlay muted loop playsInline preload="metadata">
        <source src="/videos/region-bg.mp4" type="video/mp4" />
      </video>
      <div className="region-bg-overlay" />

      <section className="section region-content">
      <div className="container" style={{ maxWidth: 560 }}>
        <h2 className="region-title">Explore WaterWatch in your area</h2>
        <p className="region-subtitle">Choose State, District and Taluk. Everything you see becomes local to that region.</p>

        {error && <ErrorState message={error} onRetry={load} />}
        {!error && tree === null && <Loading />}

        {tree && (
          <div className="card card-pad">
            <div className="field">
              <label>State</label>
              <select className="select" value={stateId}
                onChange={(e) => { setStateId(e.target.value); setDistrictId(""); setTalukId(""); }}>
                <option value="">Select state</option>
                {tree.map((s) => <option key={s.stateId} value={s.stateId}>{s.stateName}</option>)}
              </select>
            </div>

            <div className="field">
              <label>District</label>
              <select className="select" value={districtId} disabled={!stateNode}
                onChange={(e) => { setDistrictId(e.target.value); setTalukId(""); }}>
                <option value="">Select district</option>
                {stateNode?.districts.map((d) => <option key={d.districtId} value={d.districtId}>{d.districtName}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Taluk (Region)</label>
              <select className="select" value={talukId} disabled={!districtNode}
                onChange={(e) => setTalukId(e.target.value)}>
                <option value="">Select taluk</option>
                {districtNode?.taluks.map((t) => <option key={t.talukId} value={t.talukId}>{t.talukName}</option>)}
              </select>
            </div>

            <button className="btn btn-primary btn-block btn-lg" disabled={!talukId} onClick={explore}>
              Explore Region
            </button>
          </div>
        )}
      </div>
      </section>
    </div>
  );
}
