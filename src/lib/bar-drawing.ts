import type { BarreOptimisee } from "./optimizer";
import { formatNombre } from "./format-number";

export interface GroupeBarres {
  barres: BarreOptimisee[];
  signature: string;
  reference: BarreOptimisee;
}

export function grouperBarresIdentiques(barres: BarreOptimisee[]): GroupeBarres[] {
  const map = new Map<string, GroupeBarres>();
  for (const barre of barres) {
    const signature = JSON.stringify([
      (barre.profil ?? "").trim(), barre.origine, barre.longueurBrute, barre.longueurBarre,
      barre.margeDebut ?? 0, barre.margeFin ?? 0, barre.longueurTraitsScie,
      barre.chute, barre.chuteReutilisable,
      barre.coupes.map(c => [c.pieceId, c.nom, c.longueur]),
    ]);
    const groupe = map.get(signature);
    if (groupe) groupe.barres.push(barre);
    else map.set(signature, { signature, reference: barre, barres: [barre] });
  }
  return [...map.values()].sort((a, b) => a.reference.index - b.reference.index);
}

export function libelleGroupe(g: GroupeBarres): string {
  const suffixe = g.reference.origine === "stock" ? " (stock)" : "";
  const indices = g.barres.map(b => b.index).sort((a, b) => a - b);
  if (indices.length === 1) return `Barre n°${indices[0]}${suffixe}`;
  const contigu = indices.every((v, i) => i === 0 || v === indices[i - 1] + 1);
  return contigu
    ? `Barres ${indices[0]} à ${indices[indices.length - 1]}${suffixe}`
    : `Barres ${indices.join(", ")}${suffixe}`;
}

export interface SegmentBarre {
  type: "piece" | "scie" | "marge" | "reutilisable" | "dechet";
  nom: string;
  debut: number;
  fin: number;
  longueur: number;
  pieceId?: string;
}

// Presentation only: read the placed cuts and recorded margins/kerfs, never run the engine.
export function segmentsBarre(barre: BarreOptimisee, traitScie: number): SegmentBarre[] {
  const segments: SegmentBarre[] = [];
  let pos = 0;
  const add = (type: SegmentBarre["type"], nom: string, longueur: number, pieceId?: string) => {
    if (longueur <= 0) return;
    segments.push({ type, nom, longueur, debut: pos, fin: pos + longueur, pieceId });
    pos += longueur;
  };
  add("marge", "Marge début", barre.margeDebut ?? 0);
  const final = Math.max(0, barre.longueurTraitsScie - Math.max(0, barre.coupes.length - 1) * traitScie);
  barre.coupes.forEach((c, i) => {
    add("piece", c.nom, c.longueur, c.pieceId);
    add("scie", "Trait de scie", i < barre.coupes.length - 1 ? traitScie : final);
  });
  add(barre.chuteReutilisable ? "reutilisable" : "dechet", barre.chuteReutilisable ? "Chute réutilisable" : "Déchet", barre.chute);
  add("marge", "Marge fin", barre.margeFin ?? 0);
  return segments;
}

export interface CotePlacee { valeur: number; x: number; labelX: number; largeur: number; niveau: number }

// Remove binary floating-point artefacts in drawing labels only.
export const libelleCote = (valeur: number) => formatNombre(valeur);

export function placerCotes(valeurs: number[], total: number, largeur: number, mesurer: (label: string) => number): CotePlacee[] {
  return placerLibelles(valeurs.map(valeur => ({ valeur, x: valeur / total * largeur, texte: libelleCote(valeur) })), largeur, mesurer)
    .map(({ texte: _t, ...c }) => c);
}

/** Staggered labels: at most `maxRangs` rows, never an unbounded vertical stack; crowded labels slide sideways. */
export function placerLibelles(items: { valeur: number; x: number; texte: string }[], largeur: number, mesurer: (label: string) => number, maxRangs = 3): (CotePlacee & { texte: string })[] {
  // Extremely dense bars get extra staggered rows rather than overlapping text.
  for (let rangs = maxRangs; ; rangs++) {
    const res = essaiLibelles(items, largeur, mesurer, rangs);
    if (rangs >= items.length || res.every((c, i) => i === 0 || true) && !chevauche(res)) return res;
  }
}

function chevauche(c: CotePlacee[]): boolean {
  const fins = new Map<number, number>();
  for (const l of c) {
    const prev = fins.get(l.niveau);
    if (prev !== undefined && l.labelX - l.largeur / 2 < prev + 1.2 - 1e-9) return true;
    fins.set(l.niveau, l.labelX + l.largeur / 2);
  }
  return false;
}

function essaiLibelles(items: { valeur: number; x: number; texte: string }[], largeur: number, mesurer: (label: string) => number, maxRangs: number): (CotePlacee & { texte: string })[] {
  const fins: number[] = [];
  const gap = 1.2;
  return items.map(({ valeur, x, texte }) => {
    const w = Math.min(largeur, mesurer(texte));
    let labelX = Math.max(w / 2, Math.min(largeur - w / 2, x));
    let niveau = fins.findIndex(fin => labelX - w / 2 >= fin + gap);
    if (niveau < 0 && fins.length < maxRangs) niveau = fins.length;
    if (niveau < 0) {
      niveau = fins.indexOf(Math.min(...fins));
      labelX = Math.min(largeur - w / 2, fins[niveau] + gap + w / 2);
    }
    fins[niveau] = labelX + w / 2;
    return { valeur, x, labelX, largeur: w, niveau, texte };
  });
}

// Each split page must contain at least three body rows (short unsplit tables are allowed).
export function nombreLignesPage(hauteurs: number[], disponible: number): number {
  let n = 0;
  let h = 0;
  while (n < hauteurs.length && h + hauteurs[n] <= disponible) h += hauteurs[n++];
  if (n === hauteurs.length) return n;
  if (n < 3 || hauteurs.length < 6) return 0;
  if (hauteurs.length - n < 3) n = hauteurs.length - 3;
  return n >= 3 ? n : 0;
}