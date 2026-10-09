import type { BarreOptimisee } from "@/lib/optimizer";
import { SEUIL_CHUTE_REUTILISABLE } from "@/lib/optimizer";
import { colorForPieceId } from "@/lib/piece-colors";

interface Props {
  barre: BarreOptimisee;
  traitScie: number;
  pieceIds: string[];
}

export function BarreSchema({ barre, traitScie, pieceIds }: Props) {
  const total = barre.longueurBrute;
  const pct = (mm: number) => (mm / total) * 100;
  const margeDebut = barre.margeDebut ?? 0;
  const margeFin = barre.margeFin ?? 0;
  const traitFinal = Math.max(0, barre.longueurTraitsScie - Math.max(0, barre.coupes.length - 1) * traitScie);

  return (
    <div className="w-full">
      <div className="relative flex h-16 w-full overflow-hidden rounded-md border border-border bg-muted">
        {margeDebut > 0 && <div className="margin-hatch h-full shrink-0 bg-muted" style={{ width: `${pct(margeDebut)}%` }} title={`Marge début : ${margeDebut} mm`} />}
        {barre.coupes.map((c, i) => {
          const color = colorForPieceId(c.pieceId, pieceIds);
          return (
            <div key={i} className="flex h-full shrink-0" style={{ width: `${pct(c.longueur + (i < barre.coupes.length - 1 ? traitScie : traitFinal))}%` }}>
              <div
                className="flex h-full min-w-0 flex-1 items-center justify-center text-xs font-medium text-primary-foreground shadow-inner"
                style={{ backgroundColor: color }}
                title={`${c.nom} — ${c.longueur} mm`}
              >
                <span className="truncate px-1">
                  {c.nom} <span className="opacity-80">· {c.longueur}</span>
                </span>
              </div>
              {(i < barre.coupes.length - 1 ? traitScie : traitFinal) > 0 && (
                <div
                  className="h-full shrink-0 bg-foreground/80"
                  style={{ width: `${((i < barre.coupes.length - 1 ? traitScie : traitFinal) / (c.longueur + (i < barre.coupes.length - 1 ? traitScie : traitFinal))) * 100}%` }}
                  title={`Trait de scie ${i < barre.coupes.length - 1 ? traitScie : traitFinal} mm`}
                />
              )}
            </div>
          );
        })}
        {barre.chute > 0 && (
          <div
            className="offcut-hatch flex h-full shrink-0 items-center justify-center text-xs font-medium"
            style={{
              width: `${pct(barre.chute)}%`,
              backgroundColor: barre.chuteReutilisable
                ? "var(--color-warning)"
                : "var(--color-waste)",
              color: barre.chuteReutilisable
                ? "var(--color-warning-foreground)"
                : "var(--color-foreground)",
            }}
            title={`Chute ${barre.chute} mm`}
          >
            <span className="truncate px-1">
              {barre.chuteReutilisable ? "♺ " : ""}
              {barre.chute} mm
            </span>
          </div>
        )}
        {margeFin > 0 && <div className="margin-hatch h-full shrink-0 bg-muted" style={{ width: `${pct(margeFin)}%` }} title={`Marge fin : ${margeFin} mm`} />}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>0</span>
        <span>{total} mm</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        <span>Marge début : {margeDebut} mm · Marge fin : {margeFin} mm · </span>
        Chute :{" "}
        <span
          className={
            barre.chuteReutilisable
              ? "font-semibold text-[color:var(--color-warning)]"
              : "font-semibold text-[color:var(--color-waste)]"
          }
        >
          {barre.chute} mm —{" "}
          {barre.chuteReutilisable
            ? `Réutilisable (≥ ${SEUIL_CHUTE_REUTILISABLE} mm)`
            : "Déchet"}
        </span>
      </div>
    </div>
  );
}
