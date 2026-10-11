// One vertical panel of the cinematic hero. Plays a local muted/looping mp4 if
// present; otherwise the SVG poster is shown (no broken state, no external URLs).
export function HeroVideo({ src, poster, caption }: { src: string; poster: string; caption?: string }) {
  return (
    <div className="hero-video-panel">
      <video
        className="hero-video"
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      >
        {/* Local asset only; if missing, the poster remains visible. */}
        <source src={src} type="video/mp4" />
      </video>
      {caption && <span className="hero-video-caption">{caption}</span>}
    </div>
  );
}
