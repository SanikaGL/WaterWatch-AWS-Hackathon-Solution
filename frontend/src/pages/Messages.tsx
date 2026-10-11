// Messaging inbox: the signed-in user's 1:1 conversations, newest first.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { InboxThread } from "../types";
import { Loading, EmptyState, ErrorState } from "../components/States";
import { Avatar } from "../components/Avatar";
import { useAuth } from "../context/AuthContext";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3.6e6);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function Messages() {
  const navigate = useNavigate();
  const { signedIn, loading } = useAuth();
  const [threads, setThreads] = useState<InboxThread[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null); setThreads(null);
    try {
      const res = await api.get<{ threads: InboxThread[] }>("/messages/threads");
      setThreads(res.threads);
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { if (signedIn) load(); }, [signedIn]);

  if (loading) return <section className="section"><div className="container"><Loading /></div></section>;

  if (!signedIn) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 480 }}>
          <h2>Your messages</h2>
          <p className="sub">Sign in to view and send direct messages to your region's authority.</p>
          <button className="btn btn-primary" onClick={() => navigate("/account?mode=signin&next=/messages")}>Sign in</button>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 680 }}>
        <h2>Messages</h2>
        <p className="sub">Direct conversations between you and water authorities.</p>

        {error && <ErrorState message={error} onRetry={load} />}
        {!error && threads === null && <Loading label="Loading your inbox…" />}
        {!error && threads !== null && threads.length === 0 && (
          <EmptyState>No conversations yet. Message an authority from the <a onClick={() => navigate("/authorities")} style={{ cursor: "pointer" }}>authorities</a> page.</EmptyState>
        )}

        {threads && threads.length > 0 && (
          <div className="inbox">
            {threads.map((t) => (
              <button key={t.threadId} className="inbox-row" onClick={() => navigate(`/messages/${t.threadId}`)}>
                <Avatar name={t.other.name} size={46} />
                <div className="inbox-row-main">
                  <div className="inbox-row-top">
                    <strong>{t.other.name}</strong>
                    <span className={`badge ${t.other.role === "authority" ? "badge-warn" : "badge-ok"}`}>{t.other.role}</span>
                    <span className="inbox-time">{timeAgo(t.updatedAt)}</span>
                  </div>
                  {t.other.regionLabel && <div className="inbox-region">📍 {t.other.regionLabel}</div>}
                  {t.lastMessage && <div className="inbox-preview">{t.lastMessage}</div>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
