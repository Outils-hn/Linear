import type { jsPDF } from "jspdf";
import type { BarreOptimisee } from "./optimizer";
import { segmentsBarre, placerCotes, libelleCote } from "./bar-drawing";
import { themeHex } from "./visual-theme";
import { hexColorForPieceId } from "./piece-colors";
import { formatNombre } from "./format-number";


const escapeXml = (value: string) => value.replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c] ?? c);

export function dessinBarrePDF(doc: jsPDF, barre: BarreOptimisee, traitScie: number, ids: string[], largeur: number) {
  const PDF_INK = { text: themeHex("piece-ink"), paper: themeHex("cut-separator"), waste: themeHex("waste"), hatch: themeHex("hatch"), reusable: themeHex("offcut-paper"), reusableHatch: themeHex("warning"), kerf: themeHex("cut-separator") };
  const h = 14;
  const x = (mm: number) => mm / barre.longueurBrute * largeur;
  const segments = segmentsBarre(barre, traitScie);
  const elements: string[] = [];
  for (const s of segments) {
    const left = x(s.debut), w = x(s.longueur);
    const fill = s.type === "piece" ? hexColorForPieceId(s.pieceId ?? "", ids) : s.type === "scie" ? PDF_INK.kerf : s.type === "reutilisable" ? PDF_INK.reusable : PDF_INK.waste;
    elements.push(`<rect x="${left}" y="0" width="${w}" height="${h}" fill="${fill}"/>`);
    if (["marge", "reutilisable", "dechet"].includes(s.type)) {
      const step = s.type === "marge" ? 1.5 : 3;
      const stroke = s.type === "reutilisable" ? PDF_INK.reusableHatch : PDF_INK.hatch;
      for (let d = -h; d < w; d += step) {
        const a = Math.max(0, -d), b = Math.min(h, w - d);
        const yy = (v: number) => s.type === "reutilisable" ? h - v : v;
        if (b > a) elements.push(`<line x1="${left + d + a}" y1="${yy(a)}" x2="${left + d + b}" y2="${yy(b)}" stroke="${stroke}" stroke-width="${s.type === "reutilisable" ? 0.265 : 0.1}"/>`);
      }
    }
    if (s.type === "piece") {
      elements.push(`<path d="M${left} 0V${h}M${left + w} 0V${h}" stroke="${PDF_INK.paper}" stroke-width="0.53" fill="none"/>`);
      if (w >= 4) {
        doc.setFont("PlexSans", "normal");
        doc.setFontSize(9);
        const longueur = `${formatNombre(s.longueur)} mm`;
        const nom = s.nom?.replace(/\s+/g, " ").trim();
        const complet = nom ? `${nom} · ${longueur}` : longueur;
        const label = doc.getTextWidth(complet) <= w - 2.4 ? complet : formatNombre(s.longueur);
        if (doc.getTextWidth(label) <= w - 2.4) elements.push(`<text x="${left + w / 2}" y="8" font-size="3.175" letter-spacing="0" font-family="PlexSans" font-weight="normal" fill="${PDF_INK.text}" text-anchor="middle">${escapeXml(label)}</text>`);
      }
    } else if ((s.type === "reutilisable" || s.type === "dechet") && w > 14) {
      elements.push(`<text x="${left + w / 2}" y="8" font-size="2.47" fill="${PDF_INK.text}" text-anchor="middle">Chute ${formatNombre(s.longueur)} mm</text>`);
    }
  }
  doc.setFont("PlexSans", "normal"); doc.setFontSize(6.5);
  const cotes = placerCotes(segments.filter(s => s.type === "piece").map(s => s.fin), barre.longueurBrute, largeur, txt => doc.getTextWidth(txt));
  let niveaux = 1;
  for (const cote of cotes) {
    niveaux = Math.max(niveaux, cote.niveau + 1);
    const yy = h + 4.2 + cote.niveau * 3.5;
    elements.push(`<path d="M${cote.x} ${h}V${yy - 2.4}" stroke="${PDF_INK.hatch}" stroke-width="0.1" fill="none"/><text x="${cote.labelX}" y="${yy}" font-size="2.293" font-family="PlexSans" font-weight="normal" text-anchor="middle" fill="${PDF_INK.text}">${libelleCote(cote.valeur)}</text>`);
  }
  const hauteur = h + 6 + (niveaux - 1) * 3.5;
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${largeur}" height="${hauteur}" viewBox="0 0 ${largeur} ${hauteur}" font-family="PlexSans" style="font-variant-numeric:tabular-nums">${elements.join("")}</svg>`;
  return { source, hauteur };
}