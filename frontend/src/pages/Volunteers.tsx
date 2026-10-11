// Volunteer community: searchable feed of real volunteer PROFILES (name or region),
// with a "become a volunteer" entry point + cleaning video.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { VolunteerProfile } from "../types";
import { Loading, EmptyState, ErrorState } from "../components/States";
import { Avatar } from "../components/Avatar";
import { SocialLinks } from "../components/SocialLinks";
import { SearchBar } from "../components/SearchBar";
import { useAuth } from "../context/AuthContext";

export function Volunteers() {
  const navigate = useNavigate();
  const { isVolunteer, signedIn } = useAuth();
  const [vols, setVols] = useState<VolunteerProfile[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load(q = query) {
    setError(null);
    try {
      const v = await api.get<{ volunteers: VolunteerProfile[]; total: number; count: number }>(
        `/volunteers${q ? `?q=${encodeURIComponent(q)}` : ""}`,
      );
      setVols(v.volunteers);
      setTotal(v.total);
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(""); }, []);

  function onSearch(q: string) { setQuery(q); load(q); }

  return (
    <div className="community">
      <main className="community-feed">
        <div className="community-head">
          <h1>Volunteer community</h1>
          <p>People who respond during floods, run river &amp; lake cleanups, and lead awareness drives. They create events — anyone can join.</p>
        </div>

        <SearchBar
          placeholder="Search volunteers by name or region (e.g. Belur, Hassan)…"
          onSearch={onSearch}
          count={vols?.length ?? null}
          total={total}
          noun="volunteers"
        />

        {error && <ErrorState message={error} onRetry={() => load()} />}
        {!error && vols === null && <Loading label="Loading the community…" />}
        {!error && vols !== null && vols.length === 0 && (
          <EmptyState>{query ? `No volunteers match “${query}”.` : "No volunteers yet. Be the first to join."}</EmptyState>
        )}

        {vols && vols.map((v) => (
          <article key={v.volunteerId} className="community-item">
            <div className="community-item-head" onClick={() => navigate(`/volunteers/${v.volunteerId}`)}>
              <Avatar name={v.name} avatarKey={v.avatarKey} size={54} />
              <div>
                <strong className="community-name">{v.name}</strong>
                <div className="tag">
                  {v.profileComplete
                    ? <>{v.homeRegionLabel || "WaterWatch volunteer"} · {v.eventsConducted} events</>
                    : <span className="badge badge-warn">Profile not set up yet</span>}
                </div>
              </div>
            </div>
            {v.bio && <p className="community-bio">{v.bio}</p>}
            <SocialLinks instagram={v.instagram} youtube={v.youtube} links={v.links} />
            <button className="btn btn-ghost community-view" onClick={() => navigate(`/volunteers/${v.volunteerId}`)}>
              View profile →
            </button>
          </article>
        ))}
      </main>

      <aside className="community-aside">
        <div className="join-box">
          <h2>Become a volunteer</h2>
          <p>Create a volunteer profile, then organize water awareness and cleanup events in your region.</p>
          <ol className="join-steps">
            <li>Sign up as a volunteer</li>
            <li>Build your public profile</li>
            <li>Create awareness &amp; cleanup events</li>
          </ol>
          {isVolunteer ? (
            <>
              <button className="btn btn-primary btn-block" onClick={() => navigate("/volunteers/me/edit")}>Set up / edit your profile</button>
              <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => navigate("/events/new")}>＋ Create an event</button>
              <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => navigate("/posts/new")}>Share an awareness post</button>
            </>
          ) : (
            <>
              <button className="btn btn-primary btn-block" onClick={() => navigate("/account?mode=signup&role=volunteer")}>Sign up as Volunteer</button>
              {signedIn && <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => navigate("/account")}>Your account</button>}
              {!signedIn && <p className="tag" style={{ marginTop: 8, textAlign: "center" }}>Free · email OTP verification</p>}
            </>
          )}
        </div>

        <div className="cleaning-video">
          <video poster="/videos/poster-cleaning.svg" autoPlay muted loop playsInline preload="metadata">
            <source src="/videos/volunteer-cleaning.mp4" type="video/mp4" />
          </video>
          <span className="cleaning-caption">Volunteers restoring a lake, one drive at a time.</span>
        </div>
      </aside>
    </div>
  );
}
