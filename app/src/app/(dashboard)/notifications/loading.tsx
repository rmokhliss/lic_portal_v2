// ==============================================================================
// LIC v2 — /notifications loading skeleton (Phase 18 R-15)
// ==============================================================================

export default function NotificationsLoading(): React.JSX.Element {
  return (
    <div className="space-y-4 p-6" aria-busy="true" aria-label="Chargement des notifications">
      <div className="bg-muted h-8 w-56 animate-pulse rounded" />
      <div className="bg-muted h-4 w-72 animate-pulse rounded" />
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="border-border bg-card flex animate-pulse items-start gap-3 rounded-lg border p-4"
          >
            <div className="bg-muted size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="bg-muted h-4 w-2/3 rounded" />
              <div className="bg-muted h-3 w-full rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
