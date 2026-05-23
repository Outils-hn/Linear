import type { BarreOptimisee } from "@/lib/optimizer";
import { SEUIL_CHUTE_REUTILISABLE } from "@/lib/optimizer";
import { colorForPieceId } from "@/lib/piece-colors";

interface Props {
  barre: BarreOptimisee;
  traitScie: number;
  pieceIds: string[];
}

export function BarreSchema({ barre, traitScie, pieceIds }: Props) {
  const total = barre.longueurBarre;
  const pct = (mm: number) => (mm / total) * 100;

  return (
    <div className="w-full">
      <div className="relative flex h-16 w-full overflow-hidden rounded-md border border-border bg-muted">
        {barre.coupes.map((c, i) => {
          const color = colorForPieceId(c.pieceId, pieceIds);
          return (
            <div key={i} className="flex h-full" style={{ width: `${pct(c.longueur)}%` }}>
              <div
                className="flex h-full w-full items-center justify-center text-xs font-medium text-white shadow-inner"
                style={{ backgroundColor: color }}
                title={`${c.nom} — ${c.longueur} mm`}
              >
                <span className="truncate px-1">
                  {c.nom} <span className="opacity-80">· {c.longueur}</span>
                </span>
              </div>
              {i < barre.coupes.length - 1 && traitScie > 0 && (
                <div
                  className="h-full bg-foreground/80"
                  style={{ width: `${pct(traitScie)}%`, minWidth: 1 }}
                  title={`Trait de scie ${traitScie} mm`}
                />
              )}
            </div>
          );
        })}
        {barre.chute > 0 && (
          <div
            className="flex h-full items-center justify-center text-xs font-medium"
            style={{
              width: `${pct(barre.chute)}%`,
              backgroundColor: barre.chuteReutilisable
                ? "var(--color-warning)"
                : "var(--color-waste)",
              color: barre.chuteReutilisable
                ? "var(--color-warning-foreground)"
                : "white",
            }}
            title={`Chute ${barre.chute} mm`}
          >
            <span className="truncate px-1">
              {barre.chuteReutilisable ? "♺ " : ""}
              {barre.chute} mm
            </span>
          </div>
        )}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>0</span>
        <span>{total} mm</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
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
