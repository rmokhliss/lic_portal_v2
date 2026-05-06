// ==============================================================================
// LIC v2 — /clients loading skeleton (Phase 18 R-15)
// Affiché pendant le fetch listClientsUseCase. Évite le flash blanc avant
// rendu Server Component.
// ==============================================================================

export default function ClientsLoading(): React.JSX.Element {
  return (
    <div className="space-y-4 p-6" aria-busy="true" aria-label="Chargement de la liste des clients">
      <div className="bg-muted h-8 w-48 animate-pulse rounded" />
      <div className="bg-muted h-4 w-72 animate-pulse rounded" />
      <div className="border-border bg-card mt-4 rounded-md border p-3">
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
