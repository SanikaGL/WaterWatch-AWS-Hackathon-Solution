// "Message" action: starts (or reuses) a 1:1 thread with a recipient and opens it.
// Login required; if signed out, routes to sign-in with a return path.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { MessageThread } from "../types";

export function MessageButton({
  recipientId,
  label = "Message",
  className = "btn btn-primary",
}: {
  recipientId: string;
  label?: string;
  className?: string;
}) {
  const navigate = useNavigate();
  const { signedIn, sub } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Hide the button when viewing your own identity.
  if (sub && sub === recipientId) return null;

  async function start() {
    if (!signedIn) {
      navigate(`/account?mode=signin&next=${encodeURIComponent("/messages")}`);
      return;
    }
    setBusy(true); setErr(null);
    try {
      const res = await api.post<{ thread: MessageThread }>("/messages/start", { recipientId });
      navigate(`/messages/${res.thread.threadId}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <>
      <button className={className} disabled={busy} onClick={start}>
        {busy ? "Opening…" : label}
      </button>
      {err && <span className="tag" style={{ color: "var(--alert)", marginLeft: 8 }}>{err}</span>}
    </>
  );
}
