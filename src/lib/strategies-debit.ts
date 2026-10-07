// Stratégies de débit classiques (bin packing 1D), indépendantes de l'algorithme
// "Minimum de barres". Mêmes règles (trait de scie, longueur utile, chutes
// réutilisables) et même format de sortie que `optimiser`.
import {
  SEUIL_CHUTE_REUTILISABLE,
  type BarreOptimisee,
  type Piece,
  type ResultatOptimisation,
} from "./optimizer";

export type StrategieDebit = "min-barres" | "next-fit" | "first-fit" | "best-fit" | "worst-fit";

export const LIBELLES_DEBIT: Record<StrategieDebit, string> = {
  "min-barres": "Minimum de barres",
  "next-fit": "Next Fit",
  "first-fit": "First Fit",
  "best-fit": "Best Fit",
  "worst-fit": "Worst Fit",
};

export const DESCRIPTIONS_DEBIT: Record<StrategieDebit, string> = {
  "min-barres": "Notre algorithme optimisé : vise le moins de barres possible.",
  "next-fit":
    "On remplit une barre jusqu'à ce que la pièce ne rentre plus, puis on passe à la suivante sans revenir en arrière. Très simple, souvent plus de chutes.",
  "first-fit": "Chaque pièce va dans la première barre ouverte où elle rentre.",
  "best-fit":
    "Chaque pièce va dans la barre où elle laisse le plus petit reste. Tend à finir les barres et à regrouper les chutes.",
  "worst-fit": "Chaque pièce va dans la barre la plus vide. Répartit les chutes en morceaux moyens.",
};

interface Opts {
  longueurBarreUtile: number;
  longueurBarreBrute: number;
  traitScie: number;
  trier: boolean;
}

function reste(b: BarreOptimisee) {
  return b.longueurBarre - b.longueurUtilisee - b.longueurTraitsScie;
}
function cout(b: BarreOptimisee, L: number, kerf: number) {
  return L + (b.coupes.length > 0 ? kerf : 0);
}

export function optimiserDebit(
  pieces: Piece[],
  strategie: Exclude<StrategieDebit, "min-barres">,
  { longueurBarreUtile, longueurBarreBrute, traitScie, trier }: Opts,
): ResultatOptimisation {
  const items: { pieceId: string; nom: string; longueur: number }[] = [];
  for (const p of pieces)
    for (let i = 0; i < p.quantite; i++)
      if (p.longueur > 0 && p.longueur <= longueurBarreUtile)
        items.push({ pieceId: p.id, nom: p.nom, longueur: p.longueur });
  if (trier) items.sort((a, b) => b.longueur - a.longueur);

  const barres: BarreOptimisee[] = [];
  const ouvrir = (): BarreOptimisee => {
    const b: BarreOptimisee = {
      index: barres.length + 1,
      longueurBarre: longueurBarreUtile,
      longueurBrute: longueurBarreBrute,
      origine: "defaut",
      coupes: [],
      longueurUtilisee: 0,
      longueurTraitsScie: 0,
      chute: longueurBarreUtile,
      chuteReutilisable: false,
    };
    barres.push(b);
    return b;
  };

  for (const it of items) {
    let cible: BarreOptimisee | null = null;
    const fits = (b: BarreOptimisee) => cout(b, it.longueur, traitScie) <= reste(b);
    if (strategie === "next-fit") {
      const last = barres[barres.length - 1];
      if (last && fits(last)) cible = last;
    } else if (strategie === "first-fit") {
      cible = barres.find(fits) ?? null;
    } else {
      let bestVal = strategie === "best-fit" ? Infinity : -Infinity;
      for (const b of barres) {
        if (!fits(b)) continue;
        const apres = reste(b) - cout(b, it.longueur, traitScie);
        if (strategie === "best-fit" ? apres < bestVal : apres > bestVal) {
          bestVal = apres;
          cible = b;
        }
      }
    }
    if (!cible) cible = ouvrir();
    const c = cible.coupes.length > 0 ? traitScie : 0;
    cible.coupes.push({ ...it });
    cible.longueurUtilisee += it.longueur;
    cible.longueurTraitsScie += c;
    cible.chute = reste(cible);
  }

  for (const b of barres) b.chuteReutilisable = b.chute >= SEUIL_CHUTE_REUTILISABLE;
  const nbBarres = barres.length;
  const longueurTotale = barres.reduce((s, b) => s + b.longueurBrute, 0);
  const longueurUtile = barres.reduce((s, b) => s + b.longueurUtilisee, 0);
  const longueurChutes = barres.reduce((s, b) => s + b.chute, 0);
  const longueurChutesReutilisables = barres
    .filter((b) => b.chuteReutilisable)
    .reduce((s, b) => s + b.chute, 0);
  return {
    barres,
    nbBarres,
    nbBarresStock: 0,
    nbBarresDefaut: nbBarres,
    longueurTotale,
    longueurUtile,
    longueurChutes,
    longueurDechets: longueurChutes - longueurChutesReutilisables,
    longueurChutesReutilisables,
    rendement: longueurTotale > 0 ? (longueurUtile / longueurTotale) * 100 : 0,
    pourcentageChutes: longueurTotale > 0 ? (longueurChutes / longueurTotale) * 100 : 0,
  };
}
