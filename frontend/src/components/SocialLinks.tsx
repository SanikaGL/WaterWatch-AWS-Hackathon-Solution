import type { ProfileLink } from "../types";

function normalize(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

// Inline SVG brand glyphs (no external icon lib needed).
function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.17.05 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.42.37 1.06.42 2.23.06 1.27.07 1.65.07 4.86s0 3.6-.07 4.86c-.05 1.17-.25 1.8-.42 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.17-1.06.37-2.23.42-1.27.06-1.65.07-4.86.07s-3.6 0-4.86-.07c-1.17-.05-1.8-.25-2.23-.42-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.17-.42-.37-1.06-.42-2.23C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.86c.05-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.17 1.06-.37 2.23-.42C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.15 0-3.5.01-4.74.07-.9.04-1.38.19-1.7.32-.43.17-.74.37-1.06.69-.32.32-.52.63-.69 1.06-.13.32-.28.8-.32 1.7C3.4 8.5 3.4 8.85 3.4 12s0 3.5.07 4.74c.04.9.19 1.38.32 1.7.17.43.37.74.69 1.06.32.32.63.52 1.06.69.32.13.8.28 1.7.32 1.24.06 1.6.07 4.74.07s3.5 0 4.74-.07c.9-.04 1.38-.19 1.7-.32.43-.17.74-.37 1.06-.69.32-.32.52-.63.69-1.06.13-.32.28-.8.32-1.7.06-1.24.07-1.6.07-4.74s0-3.5-.07-4.74c-.04-.9-.19-1.38-.32-1.7a2.85 2.85 0 0 0-.69-1.06 2.85 2.85 0 0 0-1.06-.69c-.32-.13-.8-.28-1.7-.32C15.5 4 15.15 4 12 4zm0 3.06A4.94 4.94 0 1 1 7.06 12 4.94 4.94 0 0 1 12 7.06zm0 1.8A3.14 3.14 0 1 0 15.14 12 3.14 3.14 0 0 0 12 8.86zm5.03-3.1a1.15 1.15 0 1 1-1.15 1.15 1.15 1.15 0 0 1 1.15-1.15z"/>
    </svg>
  );
}
function YouTubeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6z"/>
    </svg>
  );
}

export function SocialLinks({
  instagram,
  youtube,
  links,
}: {
  instagram?: string;
  youtube?: string;
  links?: ProfileLink[];
}) {
  const hasAny = instagram || youtube || (links && links.length > 0);
  if (!hasAny) return null;
  return (
    <div className="social-links">
      {instagram && (
        <a className="social-icon ig" href={normalize(instagram)} target="_blank" rel="noreferrer"
          title="Instagram" aria-label="Instagram" onClick={(e) => e.stopPropagation()}>
          <InstagramIcon />
        </a>
      )}
      {youtube && (
        <a className="social-icon yt" href={normalize(youtube)} target="_blank" rel="noreferrer"
          title="YouTube" aria-label="YouTube" onClick={(e) => e.stopPropagation()}>
          <YouTubeIcon />
        </a>
      )}
      {(links ?? []).map((l) => (
        <a key={l.url} className="social-chip" href={normalize(l.url)} target="_blank" rel="noreferrer"
          onClick={(e) => e.stopPropagation()}>
          {l.label}
        </a>
      ))}
    </div>
  );
}
