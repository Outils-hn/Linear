// Lecture des nombres colles depuis Excel (formats francais et suisses), sans interface :
// teste dans parse-nombre.test.js.

// Separateurs de milliers acceptes : espaces (dont insecables) et apostrophes suisses (' ’ ‘).
const SEP_MILLIERS = /[\s\u00A0\u202F'\u2019\u2018]/g;

/** Longueur sous laquelle une valeur collee est jugee suspecte (separateur mal lu, unite oubliee). */
export const LONGUEUR_SUSPECTE = 10;

/**
 * Met un texte au format « 1234.5 » : « 1.250,5 » et « 1,250.5 » (le dernier séparateur est la
 * décimale, l'autre sépare les milliers). Plusieurs virgules ou plusieurs points seuls
 * (« 1,2,3 », « 12..5 ») sont illisibles : null, jamais un nombre deviné.
 */
function normaliser(s: string): string | null {
  const c = (s ?? "").replace(SEP_MILLIERS, "");
  const nbV = (c.match(/,/g) ?? []).length, nbP = (c.match(/\./g) ?? []).length;
  if (nbV && nbP) {
    const dec = c.lastIndexOf(",") > c.lastIndexOf(".") ? "," : ".";
    const mil = dec === "," ? "." : ",";
    if ((c.match(dec === "," ? /,/g : /\./g) ?? []).length > 1) return null;
    return c.split(mil).join("").replace(",", ".");
  }
  if (nbV > 1 || nbP > 1) return null;
  return c.replace(",", ".");
}

export function parseNombre(s: string): number {
  const c = normaliser(s);
  if (c === null || c === "" || !/^-?\d*\.?\d+$/.test(c)) return NaN;
  return Number(c);
}

// Extrait le nombre d'une cellule en ignorant le texte autour (unités, espaces insécables)
function extraireNombre(s: string): { valeur: number; unite: string } | null {
  const c = normaliser(s);
  if (c === null) return null;
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
