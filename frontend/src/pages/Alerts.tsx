// Community Alerts: AI-generated, evidence-backed water awareness.
// Two kinds: recurring-issue alerts (triggered when a water body crosses the
// report threshold) and a monthly "most-polluted water body per region" alert.
// Each carries the real photo/video PROOF from the reports and never names anyone.
import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { SocialPost } from "../types";
import { Loading, EmptyState, ErrorState } from "../components/States";
import { MediaGallery } from "../components/MediaGallery";
import { SearchBar } from "../components/SearchBar";
import { useAuth } from "../context/AuthContext";

export function Alerts() {
  const { isAuthority } = useAuth();
  const [posts, setPosts] = useState<SocialPost[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(q = query) {
    setError(null);
    try {
      const data = await api.get<{ posts: SocialPost[]; total: number; count: number }>(
        `/posts${q ? `?q=${encodeURIComponent(q)}` : ""}`,
      );
      setPosts(data.posts);
      setTotal(data.total);
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(""); }, []);

  function onSearch(q: string) { setQuery(q); load(q); }

  async function runMonthly() {
    setRunning(true); setNotice(null);
    try {
      const res = await api.post<{ alertsCreated: number; period: string }>("/alerts/run-monthly");
      setNotice(`Monthly analysis complete — ${res.alertsCreated} alert(s) generated for ${res.period}.`);
      await load("");
      setQuery("");
    } catch (e) { setNotice(`Run failed: ${(e as Error).message}`); }
    finally { setRunning(false); }
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="community-head" style={{ marginBottom: 14 }}>
          <h1>Community Alerts</h1>
          <p>
            Evidence-based awareness, generated automatically from citizen reports. We flag recurring
            problems and, every month, the most-polluted water body in each region — always with photo
            or video proof, and never naming or blaming anyone.
          </p>
        </div>

        {isAuthority && (
          <div className="alerts-admin">
            <div>
              <strong>Monthly pollution analysis</strong>
              <p className="tag" style={{ margin: "2px 0 0" }}>Runs automatically on the 1st of each month. Trigger it now to refresh.</p>
            </div>
            <button className="btn btn-primary" disabled={running} onClick={runMonthly}>
              {running ? "Analyzing…" : "Run analysis now"}
            </button>
          </div>
        )}
        {notice && <div className="state state-empty" style={{ textAlign: "left" }}>{notice}</div>}

        <SearchBar
          placeholder="Search alerts by region or water body (e.g. Belur, Hassan)…"
          onSearch={onSearch}
          count={posts?.length ?? null}
          total={total}
          noun="alerts"
        />

        {error && <ErrorState message={error} onRetry={() => load()} />}
        {!error && posts === null && <Loading label="Loading alerts…" />}
        {!error && posts !== null && posts.length === 0 && (
          <EmptyState>{query ? `No alerts match “${query}”.` : "No community alerts yet. They appear automatically as problems are detected."}</EmptyState>
        )}

        {posts && posts.map((p) => (
          <article key={p.postId} className="alert-card">
            <div className="row space-between" style={{ flexWrap: "wrap", gap: 8 }}>
              <span className={`badge ${p.kind === "MONTHLY_POLLUTION" ? "badge-alert" : "badge-warn"}`}>
                {p.kind === "MONTHLY_POLLUTION" ? "🗓️ Monthly pollution alert" : "🔁 Recurring concern"}
              </span>
              {p.reportCount != null && <span className="tag">{p.reportCount} source reports</span>}
            </div>

            <h3 className="alert-title">{p.title}</h3>

            {(p.regionLabel || p.exactLocation) && (
              <div className="alert-location">
                📍 {p.exactLocation ? `${p.exactLocation} — ` : ""}{p.regionLabel}
              </div>
            )}

            <p className="alert-body">{p.content}</p>

            {p.proofMedia && p.proofMedia.length > 0 && (
              <div className="alert-proof">
                <div className="tag" style={{ marginBottom: 6 }}>📷 Community evidence</div>
                <MediaGallery media={p.proofMedia} />
              </div>
            )}

            <div className="alert-foot">
              <span className="tag">{new Date(p.createdAt).toLocaleDateString()}</span>
              {p.aiSource && <span className="tag">· AI-generated{p.aiSource === "fallback" ? " (offline)" : ""}</span>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
