interface LinearMarkProps {
  size?: number;
  className?: string;
}

/**
 * Logo "Linear" inspiré du visuel client : empilement de barres horizontales
 * en acier brossé traversées par une oblique cuivrée lumineuse.
 */
export function LinearMark({ size = 36, className = "" }: LinearMarkProps) {
  const w = size;
  const h = size;
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 40 40"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lm-bar" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#6a7079" />
          <stop offset="50%" stopColor="#aab1ba" />
          <stop offset="100%" stopColor="#5a6068" />
        </linearGradient>
        <linearGradient id="lm-copper" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#ff9a3c" />
          <stop offset="55%" stopColor="#ff7a00" />
          <stop offset="100%" stopColor="#c44a00" />
        </linearGradient>
        <filter id="lm-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* 6 barres horizontales */}
      {[6, 11, 16, 21, 26, 31].map((y, i) => (
        <rect
          key={i}
          x={3}
          y={y}
          width={i % 2 === 0 ? 34 : 30}
          height={1.6}
          rx={0.6}
          fill="url(#lm-bar)"
        />
      ))}
      {/* Oblique cuivrée lumineuse */}
      <rect
        x={18.5}
        y={1.5}
        width={2}
        height={37}
        rx={0.8}
        transform="rotate(18 20 20)"
        fill="url(#lm-copper)"
        filter="url(#lm-glow)"
      />
    </svg>
  );
}
