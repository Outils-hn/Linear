import type { BarreOptimisee } from "./optimizer";

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
export const libelleCote = (valeur: number) => String(Number(valeur.toFixed(6)));

export function placerCotes(valeurs: number[], total: number, largeur: number, mesurer: (label: string) => number): CotePlacee[] {
  const fins: number[] = [];
  return valeurs.map(valeur => {
    const x = valeur / total * largeur;
    const w = Math.min(largeur, mesurer(libelleCote(valeur)));
    const labelX = Math.max(w / 2, Math.min(largeur - w / 2, x));
    const gauche = labelX - w / 2;
    let niveau = fins.findIndex(fin => gauche >= fin + 1.2);
    if (niveau < 0) niveau = fins.length;
    fins[niveau] = labelX + w / 2;
    return { valeur, x, labelX, largeur: w, niveau };
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