import type { SegmentBarre } from "./bar-drawing";
import { formatNombre } from "./format-number";

export const LABEL_BASE_PX = 12;
export const LABEL_MIN_PX = 8; // 6 pt
export const MM_PER_PX = 25.4 / 96;

export interface EtiquettePiece {
  gauche: number;
  droite: number;
  lignes: string[];
  taille: number;
  ligneTableau: number;
  niveau: number;
}

/** All coordinates and font sizes are CSS pixels; measurements come from the renderer. */
export function etiquettesPieces(
  segments: SegmentBarre[],
  position: (mm: number) => number,
  largeur: number,
  hauteur: number,
  mesurer: (texte: string, taille: number) => number,
): EtiquettePiece[] {
  const runs: SegmentBarre[][] = [];
  for (const s of segments) {
    if (s.type !== "piece") continue;
    const last = runs.at(-1);
    const previous = last?.at(-1);
    if (previous && previous.pieceId === s.pieceId && previous.nom === s.nom && previous.longueur === s.longueur) last?.push(s);
    else runs.push([s]);
  }
  const labels: EtiquettePiece[] = [];
  const bounds = (start: number, end: number) => [Math.max(0, position(start)), Math.min(largeur, position(end))];
  const complet = (s: SegmentBarre) => `${s.nom.replace(/\s+/g, " ").trim()} · ${formatNombre(s.longueur)} mm`;
  runs.forEach((run, row) => {
    const first = run[0], last = run.at(-1);
    if (!first || !last) return;
    const [left, right] = bounds(first.debut, last.fin);
    const grouped = `${first.nom.replace(/\s+/g, " ").trim()} · ${formatNombre(run.length)} x ${formatNombre(first.longueur)}`;
    if (run.length > 1 && run.every(s => {
      const [a, b] = bounds(s.debut, s.fin);
      return mesurer(complet(s), LABEL_BASE_PX) > b - a - 8;
    }) && mesurer(grouped, LABEL_BASE_PX) <= right - left - 8) {
      labels.push({ gauche: left, droite: right, lignes: [grouped], taille: LABEL_BASE_PX, ligneTableau: row + 1, niveau: 0 });
      return;
    }
    for (const s of run) {
      const [gauche, droite] = bounds(s.debut, s.fin);
      if (droite <= gauche) continue;
      const available = droite - gauche - 8;
      const length = formatNombre(s.longueur);
      const name = s.nom.replace(/\s+/g, " ").trim();
      let lignes: string[] = [], taille = LABEL_BASE_PX;
      if (mesurer(complet(s), taille) <= available) lignes = [complet(s)];
      else if (hauteur >= taille * 2.4 && name && [name, length].every(t => mesurer(t, taille) <= available)) lignes = [name, length];
      else if (mesurer(length, taille) <= available) lignes = [length];
      else {
        for (let size = LABEL_BASE_PX - 0.25; size >= LABEL_MIN_PX; size -= 0.25) {
          if (mesurer(length, size) <= available) { lignes = [length]; taille = size; break; }
        }
      }
      labels.push({ gauche, droite, lignes, taille, ligneTableau: row + 1, niveau: 0 });
    }
  });
  const ends: number[] = [];
  for (const label of labels.filter(l => !l.lignes.length)) {
    const w = mesurer(String(label.ligneTableau), LABEL_BASE_PX);
    const center = Math.max(w / 2, Math.min(largeur - w / 2, (label.gauche + label.droite) / 2));
    let level = ends.findIndex(end => center - w / 2 >= end + 4);
    if (level < 0) level = ends.length;
    ends[level] = center + w / 2;
    label.niveau = level;
  }
  return labels;
}