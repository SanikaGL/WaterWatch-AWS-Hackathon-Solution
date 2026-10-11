// Resolve a stored media key to a displayable URL.
// Local dev: the backend stub serves bytes at /api/__local_s3__/<key>.
// Production: VITE_MEDIA_BASE (CloudFront/S3 public base) + key.
const MEDIA_BASE = import.meta.env.VITE_MEDIA_BASE || "";

export function mediaUrl(key: string): string {
  // Seeded/demo proof points at bundled public assets (e.g. "videos/poster-*.svg").
  // Serve those straight from the site root so demo evidence always renders.
  if (/^videos\//.test(key) || /^\/?videos\//.test(key)) return `/${key.replace(/^\//, "")}`;
  if (MEDIA_BASE) return `${MEDIA_BASE.replace(/\/$/, "")}/${key}`;
  // Local fallback via the dev proxy -> backend stub.
  return `/api/__local_s3__/${encodeURIComponent(key)}`;
}
