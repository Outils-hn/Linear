import { optimiser, type OptionsOptimisation, type Piece, type ResultatOptimisation } from "./optimizer";

export interface ResultatProfil {
  profil: string;
  longueurBarre: number;
  resultat: ResultatOptimisation;
  /** Borne minimale théorique de barres pour ce profilé. */
  borneMin: number;
  smartCut: boolean;
}

export type ResultatMulti = ResultatOptimisation & { profils: ResultatProfil[]; borneMin: number; optimal: boolean };

export const nomProfil = (p?: string) => (p ?? "").trim();
export const libelleProfil = (p?: string) => nomProfil(p) || "Sans profilé";

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

export function seuilPourProfil(profil: string | undefined, seuils: Record<string, number>, defaut?: number) {
  const n = nomProfil(profil);
  const d = defaut ?? 500;
  return n && seuils[n] !== undefined && seuils[n] >= 0 ? seuils[n] : d;
}

/**
 * Optimise profil par profil avec le moteur existant, puis assemble les
 * résultats (numérotation continue des barres, totaux recalculés).
 * Le stock est attribué aux pièces sans profil, ou au premier profil sinon.
 */
/** Borne minimale : ceil((Σ longueurs + traits) / longueur utile), un trait de moins par barre. */
export function borneMinimale(pieces: Piece[], utile: number, traitScie: number): number {
  let total = 0;
  let n = 0;
  for (const p of pieces) {
    if (p.longueur <= 0 || p.longueur > utile) continue;
    total += p.longueur * p.quantite;
    n += p.quantite;
  }
  if (n === 0 || utile <= 0) return 0;
  const k = Math.max(0, traitScie);
  return Math.ceil((total + n * k) / (utile + k) - 1e-9);
}

const plusGrandeChuteReutilisable = (r: ResultatOptimisation) =>
  r.barres.reduce((m, b) => (b.chuteReutilisable && b.chute > m ? b.chute : m), 0);

export function optimiserParProfil(
  pieces: Piece[],
  longueurs: Record<string, number>,
  options: Omit<OptionsOptimisation, "longueurBarreUtileDefaut" | "longueurBarreBruteDefaut"> & { longueurBarreDefaut: number; seuilsProfils?: Record<string, number>; seuilChuteDefaut?: number },
): ResultatMulti {
  const { longueurBarreDefaut, seuilsProfils = {}, seuilChuteDefaut, ...rest } = options;
  const profils = listeProfils(pieces);
  const profilStock = profils.includes("") ? "" : profils[0];
  const res: ResultatProfil[] = [];
  let index = 0;
  for (const profil of profils) {
    const lb = longueurPourProfil(profil, longueurs, longueurBarreDefaut);
    const pp = pieces.filter((p) => nomProfil(p.profil) === profil);
    const opts: OptionsOptimisation = {
        ...rest,
        longueurBarreBruteDefaut: lb,
        longueurBarreUtileDefaut: Math.max(0, lb - rest.margeSecurite),
        stock: profil === profilStock ? rest.stock : [],
        seuilChuteReutilisable: seuilPourProfil(profil, seuilsProfils, seuilChuteDefaut ?? rest.seuilChuteReutilisable),
        modeUltra: false,
    };
    const stockUtiles = (opts.stock ?? []).filter((s) => s.quantite > 0).map((s) => s.longueur - (s.appliquerMarge === false ? 0 : rest.margeSecurite));
    const borne = borneMinimale(pp, Math.max(opts.longueurBarreUtileDefaut, ...stockUtiles), rest.traitScie);
    let r = optimiser(pp, opts);
    let smartCut = false;
    if (r.nbBarres > borne && rest.strategie === "min-barres") {
      smartCut = true;
      const u = optimiser(pp, { ...opts, modeUltra: true });
      if (u.nbBarres < r.nbBarres || (u.nbBarres === r.nbBarres && plusGrandeChuteReutilisable(u) > plusGrandeChuteReutilisable(r))) r = u;
    }
    for (const b of r.barres) {
      b.index = ++index;
      b.profil = profil;
    }
    res.push({ profil, longueurBarre: lb, resultat: r, borneMin: borne, smartCut });
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
    borneMin: res.reduce((s, p) => s + p.borneMin, 0),
    optimal: res.every((p) => p.resultat.nbBarres <= p.borneMin),
  };
}
