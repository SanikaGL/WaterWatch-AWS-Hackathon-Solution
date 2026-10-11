// Public authority profile: identity, region responsibility, contact, message action.
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { AuthorityProfile as Profile } from "../types";
import { Loading, ErrorState } from "../components/States";
import { Avatar } from "../components/Avatar";
import { MessageButton } from "../components/MessageButton";
import { useAuth } from "../context/AuthContext";

export function AuthorityProfile() {
  const { authorityId } = useParams();
  const navigate = useNavigate();
  const { signedIn, isAuthority, sub } = useAuth();
  const [a, setA] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null); setA(null);
    try {
      const res = await api.get<{ authority: Profile }>(`/authorities/${authorityId}`);
      setA(res.authority);
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(); }, [authorityId]);

  if (error) return <section className="section"><div className="container"><ErrorState message={error} onRetry={load} /></div></section>;
  if (!a) return <section className="section"><div className="container"><Loading /></div></section>;

  const isSelf = isAuthority && sub === a.authorityId;

  return (
    <>
      <header className="profile-hero profile-hero-authority">
        <div className="container profile-hero-inner">
          <div className="row space-between" style={{ marginBottom: 18 }}>
            <button className="btn btn-ghost" onClick={() => navigate("/authorities")}>← Authorities</button>
            {signedIn && !isSelf
              ? <MessageButton recipientId={a.authorityId} label="Message authority" className="btn btn-primary" />
              : !signedIn && <button className="btn btn-primary" onClick={() => navigate(`/account?mode=signin&next=${encodeURIComponent(`/authorities/${a.authorityId}`)}`)}>Sign in to message</button>}
          </div>
          <div className="profile-id">
            <Avatar name={a.name} avatarKey={a.avatarKey} size={104} />
            <div className="profile-id-main">
              <h1>{a.name}</h1>
              <div className="profile-sub">🏛️ {a.designation} · {a.department}</div>
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <span className="badge badge-warn">Authority</span>
                <span className="badge badge-ok">📍 {a.regionLabel || a.talukId}</span>
              </div>
              {a.bio && <p className="profile-bio">{a.bio}</p>}
            </div>
          </div>
        </div>
      </header>

      <div className="container profile-body">
        <section className="profile-section">
          <h3>Responsibility</h3>
          <p className="muted">Responsible for water bodies, flood response and report verification across <strong>{a.regionLabel || a.talukId}</strong>.</p>
        </section>
        {(a.email || a.phone) && (
          <section className="profile-section">
            <h3>Office contact</h3>
            <div className="contact-list">
              {a.email && <div>✉️ <a href={`mailto:${a.email}`}>{a.email}</a></div>}
              {a.phone && <div>☎️ {a.phone}</div>}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
