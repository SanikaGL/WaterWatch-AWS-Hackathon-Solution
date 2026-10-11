// A single 1:1 conversation: message history + composer. Participants only.
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Message, MessageThread as Thread } from "../types";
import { Loading, ErrorState } from "../components/States";
import { Avatar } from "../components/Avatar";
import { useAuth } from "../context/AuthContext";

export function MessageThread() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { signedIn, sub, loading } = useAuth();
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.get<{ thread: Thread; messages: Message[] }>(`/messages/threads/${threadId}`);
      setThread(res.thread);
      setMessages(res.messages);
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { if (signedIn) load(); }, [threadId, signedIn]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setBusy(true); setError(null);
    try {
      const res = await api.post<{ message: Message }>(`/messages/threads/${threadId}`, { text: body });
      setMessages((m) => [...(m ?? []), res.message]);
      setText("");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  if (loading) return <section className="section"><div className="container"><Loading /></div></section>;
  if (!signedIn) { navigate(`/account?mode=signin&next=${encodeURIComponent(`/messages/${threadId}`)}`); return null; }
  if (error && !thread) return <section className="section"><div className="container"><ErrorState message={error} onRetry={load} /></div></section>;
  if (!thread || !messages) return <section className="section"><div className="container"><Loading /></div></section>;

  const other = thread.participants.find((p) => p.id !== sub) ?? thread.participants[0];
  const me = thread.participants.find((p) => p.id === sub);
  // A message is "mine" when its sender is the signed-in user. Fall back to matching
  // my participant id so alignment stays correct even on legacy/demo threads.
  const isMine = (m: Message) => m.senderId === sub || (me ? m.senderId === me.id : false);

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 680 }}>
        <div className="thread-head">
          <button className="btn btn-ghost" onClick={() => navigate("/messages")}>← Inbox</button>
          <div className="thread-head-id">
            <Avatar name={other.name} size={40} />
            <div>
              <div>
                <strong>{other.name}</strong>
                <span className={`badge ${other.role === "authority" ? "badge-warn" : "badge-ok"}`} style={{ marginLeft: 8 }}>{other.role}</span>
              </div>
              {other.regionLabel && <div className="thread-head-region">📍 {other.regionLabel}</div>}
            </div>
          </div>
        </div>

        <div className="thread-stream">
          {messages.length === 0 && <p className="muted" style={{ textAlign: "center" }}>No messages yet. Say hello.</p>}
          {messages.map((m) => {
            const mine = isMine(m);
            return (
              <div key={m.messageId} className={`bubble-row ${mine ? "mine" : "theirs"}`}>
                <div className={`bubble ${mine ? "bubble-mine" : "bubble-theirs"}`}>
                  <div className={`bubble-sender ${mine ? "sender-mine" : ""}`}>{mine ? "You" : m.senderName}</div>
                  <div className="bubble-text">{m.text}</div>
                  <div className="bubble-time">{new Date(m.createdAt).toLocaleString([], { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {error && <ErrorState message={error} />}
        <div className="thread-composer">
          <input
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Write a message…"
            aria-label="Message text"
          />
          <button className="btn btn-primary" disabled={busy || !text.trim()} onClick={send}>
            {busy ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </section>
  );
}
