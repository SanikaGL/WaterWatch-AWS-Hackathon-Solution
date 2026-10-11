// Inline "see more" wrapper: renders the first `initial` children, then a toggle
// to reveal the rest in place (no separate page). Keeps long sections discoverable
// without overwhelming the page.
import { useState, Children } from "react";

export function ShowMore({
  initial = 3,
  moreLabel,
  lessLabel = "Show less",
  children,
}: {
  initial?: number;
  moreLabel?: string;
  lessLabel?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const items = Children.toArray(children);
  const hidden = items.length - initial;
  const shown = open ? items : items.slice(0, initial);

  return (
    <>
      {shown}
      {hidden > 0 && (
        <button className="btn btn-ghost show-more-btn" onClick={() => setOpen((o) => !o)}>
          {open ? lessLabel : (moreLabel ?? `Show ${hidden} more`)} {open ? "▲" : "▼"}
        </button>
      )}
    </>
  );
}
