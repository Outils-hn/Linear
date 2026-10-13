import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatNombre as fmt } from "@/lib/format-number";

/**
 * Badge "Résultat optimal" / "Meilleur résultat trouvé" + bulle d'aide au clic,
 * pour pouvoir expliquer simplement la différence (avec les chiffres du calcul).
 */
export function QualiteResultat({ optimal, nbBarres, borneMin }: { optimal: boolean; nbBarres: number; borneMin: number }) {
  const s = (n: number) => (n > 1 ? "s" : "");
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Que signifie ce résultat ?"
          className={
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors " +
            (optimal
              ? "border-success/20 bg-success/5 text-success hover:bg-success/10"
              : "border-border bg-muted text-muted-foreground hover:bg-muted/70")
          }
        >
          <span className={"h-1.5 w-1.5 rounded-full " + (optimal ? "bg-success" : "bg-muted-foreground")} />
          {optimal ? "Résultat optimal" : "Meilleur résultat trouvé"}
          <Info className="h-3.5 w-3.5 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-2 text-sm leading-relaxed">
        <p className="text-xs text-muted-foreground">
          <b className="text-foreground">Le minimum absolu</b> : même en mettant toutes les pièces bout à bout sans
          aucune chute, il faudrait au moins <b className="text-foreground">{fmt(borneMin)} barre{s(borneMin)}</b>.
        </p>
        {optimal ? (
          <p>
            <b>Résultat optimal</b> : le calcul utilise {fmt(nbBarres)} barre{s(nbBarres)}, soit exactement ce minimum.{" "}
            <b>Impossible de faire mieux</b>, aucune autre découpe n'économise une barre.
          </p>
        ) : (
          <p>
            <b>Meilleur résultat trouvé</b> : le calcul a testé de nombreuses découpes et garde la meilleure,{" "}
            {fmt(nbBarres)} barre{s(nbBarres)}. Le minimum absolu n'est pas atteint, souvent parce que les pièces ne
            tombent pas pile dans les barres. Le résultat est très probablement le meilleur possible, mais on ne
            peut pas le <b>prouver</b>.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
