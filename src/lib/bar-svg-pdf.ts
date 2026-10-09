import type { jsPDF } from "jspdf";
import type { BarreOptimisee } from "./optimizer";
import { segmentsBarre, placerCotes, libelleCote } from "./bar-drawing";
import { themeHex } from "./visual-theme";
import { hexColorForPieceId } from "./piece-colors";
import { formatNombre } from "./format-number";
import { etiquettesPieces, MM_PER_PX, LABEL_BASE_PX } from "./piece-labels";


const escapeXml = (value: string) => value.replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c] ?? c);

export function dessinBarrePDF(doc: jsPDF, barre: BarreOptimisee, traitScie: number, ids: string[], largeur: number, conserver = false, masquerTypes = false) {
  const PDF_INK = { text: themeHex("piece-ink"), paper: themeHex("cut-separator"), waste: themeHex("waste"), hatch: themeHex("hatch"), reusable: themeHex("offcut-paper"), reusableHatch: themeHex("warning"), kerf: themeHex("cut-separator") };
  const h = 14;
  const x = (mm: number) => mm / barre.longueurBrute * largeur;
  const segments = segmentsBarre(barre, traitScie);
  doc.setFont("PlexSans", "normal");
  const measure = (text: string, size: number) => {
    doc.setFontSize(size * 0.75);
    return doc.getTextWidth(text) / MM_PER_PX;
  };
  const labels = etiquettesPieces(segments, mm => x(mm) / MM_PER_PX, largeur / MM_PER_PX, h / MM_PER_PX, measure);
  const refs = labels.filter(l => !l.lignes.length);
  const top = refs.length ? ((Math.max(...refs.map(l => l.niveau)) + 1) * 16 + 4) * MM_PER_PX : 0;
  const elements: string[] = [];
  for (const s of segments) {
    const left = x(s.debut), w = x(s.longueur);
    const fill = s.type === "piece" ? hexColorForPieceId(s.pieceId ?? "", ids) : s.type === "scie" ? PDF_INK.kerf : s.type === "reutilisable" && !masquerTypes ? PDF_INK.reusable : PDF_INK.waste;
    elements.push(`<rect x="${left}" y="0" width="${w}" height="${h}" fill="${fill}"/>`);
    if (["marge", "reutilisable", "dechet"].includes(s.type)) {
      const step = s.type === "marge" ? 1.5 : 3;
      const stroke = s.type === "reutilisable" && !masquerTypes ? PDF_INK.reusableHatch : PDF_INK.hatch;
      for (let d = -h; d < w; d += step) {
        const a = Math.max(0, -d), b = Math.min(h, w - d);
        const yy = (v: number) => s.type === "reutilisable" ? h - v : v;
        if (b > a) elements.push(`<line x1="${left + d + a}" y1="${yy(a)}" x2="${left + d + b}" y2="${yy(b)}" stroke="${stroke}" stroke-width="${s.type === "reutilisable" ? 0.265 : 0.1}"/>`);
      }
    }
    if (s.type === "piece") {
      elements.push(`<path d="M${left} 0V${h}M${left + w} 0V${h}" stroke="${PDF_INK.paper}" stroke-width="0.53" fill="none"/>`);
    } else if ((s.type === "reutilisable" || s.type === "dechet") && w > 14) {
      elements.push(`<text x="${left + w / 2}" y="8" font-size="2.47" fill="${PDF_INK.text}" text-anchor="middle">Chute ${formatNombre(s.longueur)} mm</text>`);
    }
    if (s.type === "reutilisable" && conserver) elements.push(`<rect x="${left + 0.35}" y="0.35" width="${Math.max(0, w - 0.7)}" height="${h - 0.7}" fill="none" stroke="${themeHex("pdf-print-ink")}" stroke-width="0.7"/>`);
  }
  labels.forEach((label, i) => {
    const cx = (label.gauche + label.droite) / 2 * MM_PER_PX;
    if (!label.lignes.length) {
      const text = String(label.ligneTableau), width = measure(text, LABEL_BASE_PX) * MM_PER_PX;
      const center = Math.max(width / 2, Math.min(largeur - width / 2, cx));
      const y = (-8 - label.niveau * 16) * MM_PER_PX;
      elements.push(`<path d="M${cx} 0V${y + 5 * MM_PER_PX}H${center}" stroke="${PDF_INK.text}" stroke-width="0.13" fill="none"/><text x="${center}" y="${y + LABEL_BASE_PX * MM_PER_PX * 0.35}" font-size="${LABEL_BASE_PX * MM_PER_PX}" text-anchor="middle" fill="${PDF_INK.text}">${text}</text>`);
      return;
    }
    const size = label.taille * MM_PER_PX;
    elements.push(`<defs><clipPath id="piece-label-${i}"><rect x="${(label.gauche + 4) * MM_PER_PX}" y="0" width="${Math.max(0, label.droite - label.gauche - 8) * MM_PER_PX}" height="${h}"/></clipPath></defs>`);
    label.lignes.forEach((text, line) => {
      const y = h / 2 + (line - (label.lignes.length - 1) / 2) * size * 1.2 + size * 0.35;
      elements.push(`<text x="${cx}" y="${y}" font-size="${size}" letter-spacing="0" font-family="PlexSans" font-weight="normal" fill="${PDF_INK.text}" text-anchor="middle" clip-path="url(#piece-label-${i})">${escapeXml(text)}</text>`);
    });
  });
  doc.setFont("PlexSans", "normal"); doc.setFontSize(6.5);
  const cotes = placerCotes(segments.filter(s => s.type === "piece").map(s => s.fin), barre.longueurBrute, largeur, txt => doc.getTextWidth(txt));
  let niveaux = 1;
  for (const cote of cotes) {
    niveaux = Math.max(niveaux, cote.niveau + 1);
    const yy = h + 4.2 + cote.niveau * 3.5;
    elements.push(`<path d="M${cote.x} ${h}V${yy - 2.4}" stroke="${PDF_INK.hatch}" stroke-width="0.1" fill="none"/><text x="${cote.labelX}" y="${yy}" font-size="2.293" font-family="PlexSans" font-weight="normal" text-anchor="middle" fill="${PDF_INK.text}">${libelleCote(cote.valeur)}</text>`);
  }
  const hauteur = top + h + 6 + (niveaux - 1) * 3.5;
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${largeur}" height="${hauteur}" viewBox="0 0 ${largeur} ${hauteur}" font-family="PlexSans" style="font-variant-numeric:tabular-nums"><g transform="translate(0 ${top})">${elements.join("")}</g></svg>`;
  return { source, hauteur };
}