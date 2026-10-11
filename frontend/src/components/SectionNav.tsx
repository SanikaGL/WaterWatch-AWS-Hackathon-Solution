// Sticky signpost for detail pages: chips that tell users what's further down and
// scroll them there. Fixes the "I didn't see the content below" problem on mobile.
export interface SectionLink { id: string; label: string; count?: number }

export function SectionNav({ links }: { links: SectionLink[] }) {
  const visible = links.filter(Boolean);
  if (visible.length === 0) return null;

  function go(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="section-nav" aria-label="On this page">
      {visible.map((l) => (
        <button key={l.id} className="section-nav-chip" onClick={() => go(l.id)}>
          {l.label}
          {l.count != null && <span className="section-nav-count">{l.count}</span>}
        </button>
      ))}
    </nav>
  );
}
