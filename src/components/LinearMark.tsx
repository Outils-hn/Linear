interface LinearMarkProps {
  size?: number;
  className?: string;
}

/** Logo « Linear » : pastille bleue et son pictogramme (meme logo que sur l'Accueil). */
export function LinearMark({ size = 22, className = "" }: LinearMarkProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="5.5" fill="#2B50FF"/><g transform="translate(4.56 4.56) scale(.62)" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="9" width="18" height="6" rx="1"/><path d="M9 9v6M15 9v6"/></g></svg>
  );
}
