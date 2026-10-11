// Cleaner community: searchable feed of verified cleaner PROFILES (name or region).
// Cleaners physically clean water bodies, submit before/after evidence, get verified.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { VolunteerProfile } from "../types";
import { Loading, EmptyState, ErrorState } from "../components/States";
import { Avatar } from "../components/Avatar";
import { SocialLinks } from "../components/SocialLinks";
import { SearchBar } from "../components/SearchBar";
import { useAuth } from "../context/AuthContext";

export function Cleaners() {
  const navigate = useNavigate();
  const { isCleaner, signedIn } = useAuth();
  const [cleaners, setCleaners] = useState<VolunteerProfile[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load(q = query) {
    setError(null);
    try {
      const v = await api.get<{ cleaners: VolunteerProfile[]; total: number; count: number }>(
        `/cleaners${q ? `?q=${encodeURIComponent(q)}` : ""}`,
      );
      setCleaners(v.cleaners);
      setTotal(v.total);
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(""); }, []);

  function onSearch(q: string) { setQuery(q); load(q); }

  return (
    <div className="community">
      <main className="community-feed">
        <div className="community-head">
          <h1>Cleaner community</h1>
          <p>Verified cleaners who physically restore lakes, rivers and drains — submitting before/after evidence for every drive.</p>
        </div>

        <SearchBar
          placeholder="Search cleaners by name or region (e.g. Belur, Hassan)…"
          onSearch={onSearch}
          count={cleaners?.length ?? null}
          total={total}
          noun="cleaners"
        />

        {error && <ErrorState message={error} onRetry={() => load()} />}
        {!error && cleaners === null && <Loading label="Loading cleaners…" />}
        {!error && cleaners !== null && cleaners.length === 0 && (
          <EmptyState>{query ? `No cleaners match “${query}”.` : "No cleaners yet. Be the first to join."}</EmptyState>
        )}

        {cleaners && cleaners.map((c) => (
          <article key={c.volunteerId} className="community-item">
            <div className="community-item-head" onClick={() => navigate(`/cleaners/${c.volunteerId}`)}>
              <Avatar name={c.name} avatarKey={c.avatarKey} size={54} />
              <div>
                <strong className="community-name">{c.name}</strong>
                <div className="tag">
                  {c.profileComplete
                    ? (c.homeRegionLabel || "WaterWatch cleaner")
                    : <span className="badge badge-warn">Profile not set up yet</span>}
                </div>
              </div>
            </div>
            {c.bio && <p className="community-bio">{c.bio}</p>}
            <SocialLinks instagram={c.instagram} youtube={c.youtube} links={c.links} />
            <button className="btn btn-ghost community-view" onClick={() => navigate(`/cleaners/${c.volunteerId}`)}>
              View profile →
            </button>
          </article>
        ))}
      </main>

      <aside className="community-aside">
        <div className="join-box join-box-green">
          <h2>Become a cleaner</h2>
          <p>Clean a water body, document before/after, get verified by your region's authority, and earn recognition.</p>
          <ol className="join-steps">
            <li>Sign up as a cleaner</li>
            <li>Clean &amp; capture evidence</li>
            <li>Get verified, earn rewards</li>
          </ol>
          {isCleaner ? (
            <>
              <button className="btn btn-primary btn-block" onClick={() => navigate("/volunteers/me/edit")}>Set up / edit your profile</button>
              <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => navigate("/posts/new")}>Share a cleanup post</button>
            </>
          ) : (
            <>
              <button className="btn btn-primary btn-block" onClick={() => navigate("/account?mode=signup&role=cleaner")}>Sign up as Cleaner</button>
              {signedIn && <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => navigate("/account")}>Your account</button>}
              {!signedIn && <p className="tag" style={{ marginTop: 8, textAlign: "center" }}>Free · email OTP verification</p>}
            </>
          )}
        </div>

        <div className="cleaning-video">
          <video poster="/videos/poster-cleaning.svg" autoPlay muted loop playsInline preload="metadata">
            <source src="/videos/volunteer-cleaning.mp4" type="video/mp4" />
          </video>
          <span className="cleaning-caption">Every verified cleanup makes a river safer.</span>
        </div>
      </aside>
    </div>
  );
}
