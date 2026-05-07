// ==============================================================================
// LIC v2 — VolumeSparkline (Phase 23 — EC-04 mini graph 12 mois)
//
// SVG inline d'une polyline représentant la consommation cumulée sur les 12
// derniers mois. Pas de dépendance externe (Recharts/Chart.js) — taille
// constante (120×24px) pour intégration table sans casser le layout.
//
// Comportement :
//   - 0 points → tiret "—" (aligné dimensions sparkline)
//   - 1 point → barre unique de hauteur proportionnelle au taux
//   - 2+ points → polyline normalisée min/max sur la fenêtre
// ==============================================================================

interface SparklinePoint {
  readonly periode: string;
  readonly volumeAutorise: number;
  readonly volumeConsomme: number;
}

const WIDTH = 120;
const HEIGHT = 24;
const PAD = 2;

export function VolumeSparkline({ points }: { readonly points: readonly SparklinePoint[] }) {
  if (points.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  // Normalise sur le ratio consommé/autorisé (0..1.2 pour gérer dépassement).
  const ratios = points.map((p) =>
    p.volumeAutorise > 0 ? Math.min(1.2, p.volumeConsomme / p.volumeAutorise) : 0,
  );

  const innerWidth = WIDTH - PAD * 2;
  const innerHeight = HEIGHT - PAD * 2;
  const xStep = points.length === 1 ? 0 : innerWidth / (points.length - 1);
  const maxRatio = Math.max(1, ...ratios); // au moins 1 pour avoir une échelle

  const coords = ratios.map((r, idx) => {
    const x = PAD + idx * xStep;
    const y = PAD + innerHeight * (1 - r / maxRatio);
    return { x, y, r };
  });

  // Couleur selon le dernier ratio
  const lastRatio = ratios[ratios.length - 1] ?? 0;
  const stroke =
    lastRatio >= 1
      ? "var(--color-danger)"
      : lastRatio >= 0.8
        ? "var(--color-warning)"
        : "var(--color-success)";

  const polylinePoints = coords.map((c) => `${String(c.x)},${String(c.y)}`).join(" ");

  // Ligne de seuil 100% (cap autorisé) en pointillés.
  const seuilY = PAD + innerHeight * (1 - 1 / maxRatio);

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
      role="img"
      aria-label={`Sparkline volume ${String(points.length)} points`}
      className="overflow-visible"
    >
      <line
        x1={PAD}
        y1={seuilY}
        x2={WIDTH - PAD}
        y2={seuilY}
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeDasharray="2 2"
        strokeWidth="0.5"
      />
      {points.length > 1 && (
        <polyline fill="none" stroke={stroke} strokeWidth="1.5" points={polylinePoints} />
      )}
      {coords.map((c) => (
        <circle key={`${String(c.x)}-${String(c.y)}`} cx={c.x} cy={c.y} r="1.5" fill={stroke} />
      ))}
    </svg>
  );
}
