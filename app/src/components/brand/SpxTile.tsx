export function SpxTile({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="SELECT-PX">
      <defs>
        <linearGradient id="spxGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#74ECFF" />
          <stop offset="55%" stopColor="#00CAFF" />
          <stop offset="100%" stopColor="#0006A5" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="120" height="120" rx="22" fill="var(--color-surface-1)" />
      <g transform="translate(20 20) scale(0.667)">
        <path d="M 8 14 L 28 14 L 76 82 L 112 112 L 92 112 L 44 60 L 8 30 Z" fill="#FFFFFF" />
        <path d="M 112 14 L 92 14 L 60 58 L 72 74 L 112 22 Z" fill="url(#spxGradient)" />
      </g>
    </svg>
  );
}
