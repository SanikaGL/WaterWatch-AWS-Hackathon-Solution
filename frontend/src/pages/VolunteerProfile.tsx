// Public community profile (volunteer OR cleaner): bio, home region, links, posts,
// and event activity. Works for both /volunteers/:id and /cleaners/:id.
import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { api } from "../api/client";
import type { VolunteerProfile as Profile, VolunteerEvent, VolunteerPost } from "../types";
import { Loading, EmptyState, ErrorState } from "../components/States";
import { Avatar } from "../components/Avatar";
import { EventCard } from "../components/EventCard";
import { SocialLinks } from "../components/SocialLinks";
import { PostCard } from "../components/PostCard";
import { MessageButton } from "../components/MessageButton";
import { SectionNav } from "../components/SectionNav";
import { ShowMore } from "../components/ShowMore";
import { useAuth } from "../context/AuthContext";

interface ProfileResponse {
  volunteer: Profile;
  organized: VolunteerEvent[];
  upcoming: VolunteerEvent[];
  completed: VolunteerEvent[];
  posts: VolunteerPost[];
}

export function VolunteerProfile() {
  const { volunteerId, cleanerId } = useParams();
  const id = volunteerId ?? cleanerId;
  const location = useLocation();
  const isCleanerRoute = location.pathname.startsWith("/cleaners");
  const navigate = useNavigate();
  const { sub, isVolunteer, isCleaner, isAuthority } = useAuth();
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const base = isCleanerRoute ? "cleaners" : "volunteers";

  async function load() {
    setError(null); setData(null);
    try {
      setData(await api.get<ProfileResponse>(`/${base}/${id}`));
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(); }, [id, base]);

  if (error) return <section className="section"><div className="container"><ErrorState message={error} onRetry={load} /></div></section>;
  if (!data) return <section className="section"><div className="container"><Loading /></div></section>;

  const v = data.volunteer;
  const role = v.role ?? (isCleanerRoute ? "cleaner" : "volunteer");
  const roleLabel = role === "cleaner" ? "WaterWatch Cleaner" : "WaterWatch Volunteer";
  const isOwner = (isVolunteer || isCleaner) && sub === v.volunteerId;
  // Anyone verified can message; the backend enforces that one side is an authority.
  const canMessage = isAuthority && !isOwner;

  return (
    <>
      <header className="profile-hero">
        <div className="container profile-hero-inner">
          <div className="row space-between" style={{ marginBottom: 18 }}>
            <button className="btn btn-ghost" onClick={() => navigate(`/${base}`)}>← Community</button>
            <div className="row" style={{ gap: 8 }}>
              {canMessage && <MessageButton recipientId={v.volunteerId} label="Message" className="btn btn-primary" />}
              {isOwner && (
                <>
                  <button className={`btn ${v.profileComplete ? "btn-ghost" : "btn-primary"}`} onClick={() => navigate("/volunteers/me/edit")}>
                    {v.profileComplete ? "Edit profile" : "Set up your profile"}
                  </button>
                  {v.profileComplete && <button className="btn btn-primary" onClick={() => navigate("/posts/new")}>＋ New post</button>}
                </>
              )}
            </div>
          </div>
          <div className="profile-id">
            <Avatar name={v.name} avatarKey={v.avatarKey} size={104} />
            <div className="profile-id-main">
              <h1>{v.name}</h1>
              <div className="profile-sub">📍 {v.homeRegionLabel || "Region not set"} · {roleLabel}</div>
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                {v.badges.map((b) => <span key={b} className="badge badge-ok">🏅 {b}</span>)}
              </div>
              {v.bio && <p className="profile-bio">{v.bio}</p>}
              <SocialLinks instagram={v.instagram} youtube={v.youtube} links={v.links} />
            </div>
            <div className="profile-stats">
              {role === "volunteer" && <div className="stat"><div className="num">{v.eventsConducted}</div><div className="lbl">Events</div></div>}
              {role === "volunteer" && <div className="stat"><div className="num">{data.upcoming.length}</div><div className="lbl">Upcoming</div></div>}
              <div className="stat"><div className="num">{data.posts.length}</div><div className="lbl">Posts</div></div>
            </div>
          </div>
        </div>
      </header>

      <div className="container profile-body">
        <SectionNav links={[
          { id: "vp-posts", label: "Posts", count: data.posts.length },
          ...(role === "volunteer" ? [
            { id: "vp-upcoming", label: "Upcoming", count: data.upcoming.length },
            { id: "vp-completed", label: "Completed", count: data.completed.length },
          ] : []),
        ]} />

        <section id="vp-posts" className="section-anchor profile-section">
          <h3>Posts</h3>
          {data.posts.length === 0 ? (
            <EmptyState>No posts yet.</EmptyState>
          ) : (
            <div className="post-stack">
              <ShowMore initial={3} moreLabel="Show all posts">
                {data.posts.map((p) => <PostCard key={p.postId} post={p} />)}
              </ShowMore>
            </div>
          )}
        </section>

        {role === "volunteer" && (
          <>
            <section id="vp-upcoming" className="section-anchor profile-section">
              <h3>Upcoming events</h3>
              {data.upcoming.length === 0 ? (
                <EmptyState>No upcoming events scheduled.</EmptyState>
              ) : (
                <div className="grid grid-3">{data.upcoming.map((e) => <EventCard key={e.eventId} event={e} />)}</div>
              )}
            </section>

            <section id="vp-completed" className="section-anchor profile-section">
              <h3>Completed events</h3>
              {data.completed.length === 0 ? (
                <EmptyState>No completed events yet.</EmptyState>
              ) : (
                <div className="grid grid-3">{data.completed.map((e) => <EventCard key={e.eventId} event={e} />)}</div>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
