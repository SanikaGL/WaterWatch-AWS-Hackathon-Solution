// Loading / empty / error states. Empty states stay calm (never look broken).
export function Loading({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="state">
      <div className="spinner" />
      <p className="muted" style={{ marginTop: 12 }}>{label}</p>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="state state-empty">{children}</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state-error">
      <p style={{ margin: 0 }}>{message}</p>
      {onRetry && (
        <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
