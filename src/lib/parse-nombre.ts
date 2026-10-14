// Lecture des nombres colles depuis Excel (formats francais et suisses), sans interface :
// teste dans parse-nombre.test.js.

// Separateurs de milliers acceptes : espaces (dont insecables) et apostrophes suisses (' ’ ‘).
const SEP_MILLIERS = /[\s\u00A0\u202F'\u2019\u2018]/g;

/** Longueur sous laquelle une valeur collee est jugee suspecte (separateur mal lu, unite oubliee). */
export const LONGUEUR_SUSPECTE = 10;

export function parseNombre(s: string): number {
  const c = (s ?? "").replace(SEP_MILLIERS, "").replace(",", ".");
  if (c === "" || !/^-?\d*\.?\d+$/.test(c)) return NaN;
  return Number(c);
}

// Extrait le nombre d'une cellule en ignorant le texte autour (unités, espaces insécables)
function extraireNombre(s: string): { valeur: number; unite: string } | null {
  const c = (s ?? "").replace(SEP_MILLIERS, "").replace(",", ".");
  const m = c.match(/(-?\d*\.?\d+)([a-zA-Z]*)/);
  if (!m) return null;
  return { valeur: Number(m[1]), unite: (m[2] ?? "").toLowerCase() };
}

export function parseLongueur(s: string): number {
  const e = extraireNombre(s);
  if (!e) return NaN;
  if (e.unite === "cm") return e.valeur * 10;
  if (e.unite === "m") return e.valeur * 1000;
  if (e.unite === "" || e.unite === "mm") return e.valeur;
  return NaN; // unité inconnue
}

export function parseQuantite(s: string): number {
  const e = extraireNombre(s);
  if (!e) return NaN;
  if (e.unite === "" || /^(pces?|pcs?|u|unites?|x)$/.test(e.unite)) return e.valeur;
  return NaN;
}
