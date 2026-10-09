import type { ResultatOptimisation } from "./optimizer";
import { formatNombre } from "./format-number";

/** Presentation-only accounting: never changes the placed bars or engine totals. */
export function bilanMatiere(resultat: ResultatOptimisation) {
  const perte = resultat.longueurDechets + resultat.longueurTraitsScie + resultat.longueurMarges;
  const valeurs = [resultat.longueurUtile, resultat.longueurChutesReutilisables, perte];
  const pourcentages = valeurs.map(value => resultat.longueurTotale > 0 ? value / resultat.longueurTotale * 100 : 0);
  // Allocate tenths by largest remainder so the displayed breakdown also totals 100%.
  const dixiemes = pourcentages.map(value => Math.floor(value * 10));
  const ordre = pourcentages.map((value, i) => ({ i, reste: value * 10 - dixiemes[i] }))
    .sort((a, b) => b.reste - a.reste || a.i - b.i);
  const manquants = resultat.longueurTotale > 0 ? 1000 - dixiemes.reduce((s, v) => s + v, 0) : 0;
  for (let i = 0; i < Math.min(manquants, ordre.length); i++) dixiemes[ordre[i].i] += 1;
  const parts = valeurs.map((value, i) => ({ value, pourcentage: pourcentages[i], affiche: dixiemes[i] / 10 }));
  return {
    perte,
    parts,
    repartition: `${formatNombre(parts[0].affiche, 1)} % pièces + ${formatNombre(parts[1].affiche, 1)} % chutes réutilisables + ${formatNombre(parts[2].affiche, 1)} % perte définitive = ${resultat.longueurTotale > 0 ? "100" : "0"} %`,
  };
}