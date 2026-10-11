// Public authority directory: searchable list of regional water authorities.
// Each authority is responsible for one taluk. Verified members can message them.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { AuthorityProfile } from "../types";
import { Loading, EmptyState, ErrorState } from "../components/States";
import { Avatar } from "../components/Avatar";
import { SearchBar } from "../components/SearchBar";
import { MessageButton } from "../components/MessageButton";
import { useAuth } from "../context/AuthContext";

export function Authorities() {
  const navigate = useNavigate();
  const { signedIn, isAuthority } = useAuth();
  const [auths, setAuths] = useState<AuthorityProfile[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load(q = query) {
    setError(null);
    try {
      const v = await api.get<{ authorities: AuthorityProfile[]; total: number; count: number }>(
        `/authorities${q ? `?q=${encodeURIComponent(q)}` : ""}`,
      );
      setAuths(v.authorities);
      setTotal(v.total);
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(""); }, []);

  function onSearch(q: string) { setQuery(q); load(q); }

  return (
    <section className="section">
      <div className="container">
        <div className="community-head" style={{ marginBottom: 16 }}>
          <h1>Regional water authorities</h1>
          <p>Each taluk has a designated water authority responsible for reports, floods and verification. Verified volunteers and cleaners can message them directly.</p>
        </div>

        <SearchBar
          placeholder="Search authorities by name, department or region…"
          onSearch={onSearch}
          count={auths?.length ?? null}
          total={total}
          noun="authorities"
        />

        {error && <ErrorState message={error} onRetry={() => load()} />}
        {!error && auths === null && <Loading label="Loading authorities…" />}
        {!error && auths !== null && auths.length === 0 && (
          <EmptyState>{query ? `No authorities match “${query}”.` : "No authorities listed yet."}</EmptyState>
        )}

        {auths && auths.length > 0 && (
          <div className="authority-grid">
            {auths.map((a) => (
              <article key={a.authorityId} className="authority-card">
                <div className="authority-card-head" onClick={() => navigate(`/authorities/${a.authorityId}`)}>
                  <Avatar name={a.name} avatarKey={a.avatarKey} size={52} />
                  <div className="authority-card-id">
                    <strong>{a.name}</strong>
                    <span className="tag">{a.designation}</span>
                  </div>
                </div>
                <div className="authority-region">📍 {a.regionLabel || a.talukId}</div>
                <div className="authority-dept">{a.department}</div>
                {a.bio && <p className="authority-bio">{a.bio}</p>}
                <div className="authority-card-actions">
                  <button className="btn btn-ghost" onClick={() => navigate(`/authorities/${a.authorityId}`)}>View</button>
                  {signedIn && !isAuthority
                    ? <MessageButton recipientId={a.authorityId} label="Message" className="btn btn-primary" />
                    : !signedIn && <button className="btn btn-primary" onClick={() => navigate(`/account?mode=signin&next=${encodeURIComponent("/authorities")}`)}>Message</button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
