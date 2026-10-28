interface LinearMarkProps {
  size?: number;
  className?: string;
}

/** Logo « Linear » (style Epure) : une barre, sa chute a garder en bleu. */
export function LinearMark({ size = 22, className = "" }: LinearMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" className={className} aria-hidden="true">
      <rect x="1" y="7" width="20" height="8" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-foreground" />
      <path d="M9 7v8" stroke="currentColor" strokeWidth="1.5" className="text-foreground" />
      <rect x="14.5" y="8.5" width="5.75" height="5" fill="var(--signal)" />
    </svg>
  );
}
