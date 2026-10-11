// Awareness post card with INLINE expandable comments (no separate page).
// Click "comments" to expand: fetches comments on demand + shows the comment box.
import { useState } from "react";
import { api } from "../api/client";
import type { VolunteerPost, Comment } from "../types";
import { MediaGallery } from "./MediaGallery";
import { Comments } from "./Comments";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  const h = Math.floor(diff / 3600000);
  if (h > 0) return `${h}h ago`;
  return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
}

export function PostCard({ post }: { post: VolunteerPost }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [count, setCount] = useState(post.commentCount);
  const [loading, setLoading] = useState(false);

  async function loadComments() {
    setLoading(true);
    try {
      const res = await api.get<{ post: VolunteerPost; comments: Comment[] }>(
        `/posts/awareness/${post.postId}?at=${encodeURIComponent(post.createdAt)}`
      );
      setComments(res.comments);
      setCount(res.comments.length);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && comments === null) await loadComments();
  }

  return (
    <div className="card card-pad">
      <div className="row space-between">
        <strong style={{ color: "var(--water-900)" }}>
          👤 {post.authorName}
          {post.authorRole && <span className="badge badge-ok" style={{ marginLeft: 8, fontWeight: 600 }}>{post.authorRole}</span>}
        </strong>
        <span className="tag">{timeAgo(post.createdAt)}</span>
      </div>
      {post.title && <h4 style={{ margin: "8px 0 4px" }}>{post.title}</h4>}
      <p style={{ margin: "4px 0 0", color: "var(--ink)" }}>{post.description}</p>
      <MediaGallery media={post.media} />

      <button className="btn btn-ghost" style={{ marginTop: 12, padding: "6px 12px" }} onClick={toggle}>
        💬 {count} {count === 1 ? "comment" : "comments"} {open ? "▲" : "▼"}
      </button>

      {open && (
        <div style={{ marginTop: 14 }}>
          {loading && comments === null ? (
            <p className="muted">Loading comments…</p>
          ) : (
            <Comments
              targetId={post.postId}
              comments={comments ?? []}
              onPosted={loadComments}
            />
          )}
        </div>
      )}
    </div>
  );
}
