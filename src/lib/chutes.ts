import type { ResultatMulti } from "./multi-profil";
import { libelleProfil, nomProfil } from "./multi-profil";

export interface LigneChute {
  profil: string;
  longueur: number;
  quantite: number;
  barres: number[];
  origine: string;
}

export interface ChutesProfil {
  profil: string;
  lignes: LigneChute[];
  totalMm: number;
}

/** « Barres 7 à 28 », « Barre n°3 », « Barres 2, 5 à 8 ». */
export function libelleOrigine(indices: number[]): string {
  const v = [...indices].sort((a, b) => a - b);
  if (v.length === 1) return `Barre n°${v[0]}`;
  const parts: string[] = [];
  let i = 0;
  while (i < v.length) {
    let j = i;
    while (j + 1 < v.length && v[j + 1] === v[j] + 1) j++;
    parts.push(j > i ? `${v[i]} à ${v[j]}` : `${v[i]}`);
    i = j + 1;
  }
  return `Barres ${parts.join(", ")}`;
}

/** Chutes réutilisables groupées par profilé puis longueur décroissante (lecture seule des barres). */
export function chutesAConserver(resultat: ResultatMulti): ChutesProfil[] {
  const parProfil = new Map<string, Map<number, number[]>>();
  for (const b of resultat.barres) {
    if (!b.chuteReutilisable || b.chute <= 0) continue;
    const p = nomProfil(b.profil);
    if (!parProfil.has(p)) parProfil.set(p, new Map());
    const m = parProfil.get(p)!;
    if (!m.has(b.chute)) m.set(b.chute, []);
    m.get(b.chute)!.push(b.index);
  }
  return [...parProfil.entries()]
    .sort((a, b) => libelleProfil(a[0]).localeCompare(libelleProfil(b[0]), "fr"))
    .map(([profil, m]) => {
      const lignes = [...m.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([longueur, barres]) => ({ profil, longueur, quantite: barres.length, barres, origine: libelleOrigine(barres) }));
      return { profil, lignes, totalMm: lignes.reduce((s, l) => s + l.longueur * l.quantite, 0) };
    });
}
