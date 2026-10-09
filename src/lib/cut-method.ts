import { formatNombre } from "./format-number";

export type MethodeCoupe = "butee" | "ruban";

export const METHODES_COUPE: Record<MethodeCoupe, string> = {
  butee: "Butée (coupes en série)",
  ruban: "Mètre ruban (cotes cumulées)",
};

export const RAPPEL_RUBAN = "Mesurer toutes les cotes depuis le bout brut, sans déplacer le mètre";

export const lireMethodeCoupe = (v: unknown): MethodeCoupe => (v === "ruban" ? "ruban" : "butee");

/** Lignes de la colonne « Repère cumulé » selon la méthode (présentation uniquement). */
export function lignesReperes(reperes: number[], methode: MethodeCoupe): string[] {
  if (methode === "butee" && reperes.length > 5) {
    const pas = reperes[1] - reperes[0];
    return [`de ${formatNombre(reperes[0])} à ${formatNombre(reperes[reperes.length - 1])} (pas de ${formatNombre(pas)} mm)`];
  }
  const lignes: string[] = [];
  for (let i = 0; i < reperes.length; i += 10) lignes.push(reperes.slice(i, i + 10).map(v => formatNombre(v)).join(" / "));
  return lignes;
}

/** Séries de pièces identiques consécutives : début/fin (mm) et quantité, lues depuis les segments placés. */
export interface SeriePieces { debut: number; fin: number; quantite: number; longueur: number }
export function seriesPieces(pieces: { pieceId?: string; longueur: number; debut: number; fin: number }[]): SeriePieces[] {
  const series: (SeriePieces & { id?: string })[] = [];
  for (const p of pieces) {
    const last = series[series.length - 1];
    if (last && last.id === p.pieceId && last.longueur === p.longueur) { last.fin = p.fin; last.quantite++; }
    else series.push({ id: p.pieceId, debut: p.debut, fin: p.fin, quantite: 1, longueur: p.longueur });
  }
  return series.map(({ id: _id, ...s }) => s);
}

/** Seuil de chute réutilisable lu sur les barres calculées de chaque profilé. */
export function seuilsDesProfils(profils: { profil: string; resultat: { barres: { seuilChute?: number }[] } }[]): { profil: string; seuil: number }[] {
  return profils.flatMap(p => {
    const s = p.resultat.barres.find(b => typeof b.seuilChute === "number")?.seuilChute;
    return typeof s === "number" ? [{ profil: p.profil, seuil: s }] : [];
  });
}
