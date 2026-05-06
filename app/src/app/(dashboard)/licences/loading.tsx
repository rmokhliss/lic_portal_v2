// ==============================================================================
// LIC v2 — /licences loading skeleton (Phase 18 R-15)
// ==============================================================================

export default function LicencesLoading(): React.JSX.Element {
  return (
    <div className="space-y-4 p-6" aria-busy="true" aria-label="Chargement des licences">
      <div className="bg-muted h-8 w-48 animate-pulse rounded" />
      <div className="bg-muted h-4 w-72 animate-pulse rounded" />
      <div className="border-border bg-card rounded-md border p-3">
        <div className="bg-muted h-9 w-full animate-pulse rounded" />
      </div>
      <div className="border-border bg-card overflow-hidden rounded-lg border">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="bg-muted/50 border-border h-12 animate-pulse border-b" />
        ))}
      </div>
    </div>
  );
}
