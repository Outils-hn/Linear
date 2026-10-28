export function StatCard({
  label,
  value,
  hint,
  accent,
  large = false,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "success" | "warning";
  large?: boolean;
}) {
  // Chiffre cle (style Epure) : filet en haut, etiquette en capitales, grand nombre
  const couleur = accent === "success" ? "text-[color:var(--color-success)]" : accent === "warning" ? "text-[color:var(--color-warning)]" : "text-foreground";
  return (
    <div className="border-t border-border pt-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className={`mt-2 break-words font-semibold leading-none tracking-[-0.02em] tabular-nums ${large ? "text-5xl" : "text-[28px]"} ${couleur}`}>
        {value}
      </div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
