// Shared comments UI for reports AND volunteer posts (both key by target id).
// Anyone can comment. Logged-in volunteer/cleaner/authority comments show their
// real name + a role badge; guests post as "Anonymous".
import { useState } from "react";
import { api } from "../api/client";
import type { Comment } from "../types";
import { useAuth } from "../context/AuthContext";

const roleBadge: Record<string, string> = {
  volunteer: "badge-ok",
  cleaner: "badge-ok",
  authority: "badge-warn",
};

export function Comments({
  targetId,
  comments,
  onPosted,
}: {
  targetId: string;
  comments: Comment[];
  onPosted: () => void;
}) {
  const { signedIn, email } = useAuth();
  const [text, setText] = useState("");
  const [guestName, setGuestName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post() {
    if (text.trim().length < 1) return;
    setBusy(true); setError(null);
    try {
      // Logged-in: send a display name; backend attaches the real role from the JWT.
      const author = signedIn ? (email ? email.split("@")[0] : undefined) : (guestName.trim() || undefined);
      await api.post(`/reports/${targetId}/comments`, { text, author });
      setText("");
      onPosted();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <div className="card card-pad">
        {!signedIn && (
          <div className="field">
            <input className="input" placeholder="Your name (optional)" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
          </div>
        )}
        <div className="field" style={{ marginBottom: 10 }}>
          <textarea className="textarea" placeholder={signedIn ? "Comment as yourself…" : "Add a comment…"}
            value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        {error && <p className="tag" style={{ color: "var(--alert)" }}>{error}</p>}
        <button className="btn btn-primary" disabled={busy} onClick={post}>
          {busy ? "Posting…" : "Add comment"}
        </button>
        {signedIn && <span className="tag" style={{ marginLeft: 10 }}>Posting with your real identity</span>}
      </div>

      <div style={{ marginTop: 14 }}>
        {comments.length === 0 ? (
          <p className="muted">No comments yet. Be the first.</p>
        ) : (
          comments
            .slice()
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
            .map((c) => (
              <div key={c.commentId} className="card card-pad" style={{ marginBottom: 10 }}>
                <div className="row space-between">
                  <strong>
                    👤 {c.author}
                    {c.authorRole && (
                      <span className={`badge ${roleBadge[c.authorRole] ?? "badge-ok"}`} style={{ marginLeft: 8 }}>
                        {c.authorRole}
                      </span>
                    )}
                  </strong>
                  <span className="tag">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p style={{ margin: "6px 0 0" }}>{c.text}</p>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
