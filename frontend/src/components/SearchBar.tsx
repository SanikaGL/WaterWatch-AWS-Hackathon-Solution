// Smart search box: one input matching a NAME or a REGION (taluk/district/state).
// Shows a live result count. Debounced so typing stays smooth.
import { useEffect, useState } from "react";

export function SearchBar({
  placeholder,
  onSearch,
  count,
  total,
  noun,
}: {
  placeholder: string;
  onSearch: (q: string) => void;
  count: number | null;
  total: number | null;
  noun: string; // e.g. "volunteers"
}) {
  const [q, setQ] = useState("");

  useEffect(() => {
    const id = setTimeout(() => onSearch(q.trim()), 220);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <div className="searchbar">
      <div className="searchbar-input">
        <span className="searchbar-icon" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
        </span>
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
        />
        {q && (
          <button className="searchbar-clear" aria-label="Clear search" onClick={() => setQ("")}>×</button>
        )}
      </div>
      {count !== null && total !== null && (
        <div className="searchbar-count">
          {q
            ? <>Showing <strong>{count}</strong> of {total} {noun}{count !== 1 || !q ? "" : ""}</>
            : <><strong>{total}</strong> {noun}</>}
        </div>
      )}
    </div>
  );
}
