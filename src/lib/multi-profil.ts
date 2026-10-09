import { optimiser, type OptionsOptimisation, type Piece, type ResultatOptimisation } from "./optimizer";

export interface ResultatProfil {
  profil: string;
  longueurBarre: number;
  resultat: ResultatOptimisation;
}

export type ResultatMulti = ResultatOptimisation & { profils: ResultatProfil[] };

export const nomProfil = (p?: string) => (p ?? "").trim();
export const libelleProfil = (p?: string) => nomProfil(p) || "Sans profil";

export function listeProfils(pieces: Piece[]): string[] {
  const out: string[] = [];
  for (const p of pieces) {
    const n = nomProfil(p.profil);
    if (!out.includes(n)) out.push(n);
  }
  return out;
}

export function longueurPourProfil(profil: string | undefined, longueurs: Record<string, number>, defaut: number) {
  const n = nomProfil(profil);
  return n && longueurs[n] > 0 ? longueurs[n] : defaut;
}

/**
 * Optimise profil par profil avec le moteur existant, puis assemble les
 * résultats (numérotation continue des barres, totaux recalculés).
 * Le stock est attribué aux pièces sans profil, ou au premier profil sinon.
 */
export function optimiserParProfil(
  pieces: Piece[],
  longueurs: Record<string, number>,
  options: Omit<OptionsOptimisation, "longueurBarreUtileDefaut" | "longueurBarreBruteDefaut"> & { longueurBarreDefaut: number },
): ResultatMulti {
  const { longueurBarreDefaut, ...rest } = options;
  const profils = listeProfils(pieces);
  const profilStock = profils.includes("") ? "" : profils[0];
  const res: ResultatProfil[] = [];
  let index = 0;
  for (const profil of profils) {
    const lb = longueurPourProfil(profil, longueurs, longueurBarreDefaut);
    const r = optimiser(
      pieces.filter((p) => nomProfil(p.profil) === profil),
      {
        ...rest,
        longueurBarreBruteDefaut: lb,
        longueurBarreUtileDefaut: Math.max(0, lb - rest.margeSecurite),
        stock: profil === profilStock ? rest.stock : [],
      },
    );
    for (const b of r.barres) {
      b.index = ++index;
      b.profil = profil;
    }
    res.push({ profil, longueurBarre: lb, resultat: r });
  }
  const barres = res.flatMap((p) => p.resultat.barres);
  const sum = (k: keyof ResultatOptimisation) => res.reduce((s, p) => s + (p.resultat[k] as number), 0);
  const longueurTotale = sum("longueurTotale");
  const longueurUtile = sum("longueurUtile");
  const longueurChutes = sum("longueurChutes");
  const longueurChutesReutilisables = sum("longueurChutesReutilisables");
  const consomme = longueurTotale - longueurChutesReutilisables;
  return {
    barres,
    nbBarres: barres.length,
    nbBarresStock: sum("nbBarresStock"),
    nbBarresDefaut: sum("nbBarresDefaut"),
    longueurTotale,
    longueurUtile,
    longueurChutes,
    longueurDechets: sum("longueurDechets"),
    longueurChutesReutilisables,
    rendement: longueurTotale > 0 ? (longueurUtile / longueurTotale) * 100 : 0,
    rendementHorsChutesReutilisables: consomme > 0 ? (longueurUtile / consomme) * 100 : 0,
    longueurTraitsScie: sum("longueurTraitsScie"),
    longueurMarges: sum("longueurMarges"),
    pourcentageChutes: longueurTotale > 0 ? (longueurChutes / longueurTotale) * 100 : 0,
    profils: res.filter((p) => p.resultat.nbBarres > 0),
  };
}
