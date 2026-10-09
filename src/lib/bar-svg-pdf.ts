import type { jsPDF } from "jspdf";
import type { BarreOptimisee } from "./optimizer";
import { segmentsBarre, placerCotes, libelleCote } from "./bar-drawing";
import { themeHex } from "./visual-theme";
import { hexColorForPieceId } from "./piece-colors";


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
        if (b > a) elements.push(`<line x1="${left + d + a}" y1="${yy(a)}" x2="${left + d + b}" y2="${yy(b)}" stroke="${stroke}" stroke-width="0.1"/>`);
      }
    }
    if (s.type === "piece") {
      elements.push(`<path d="M${left} 0V${h}M${left + w} 0V${h}" stroke="${PDF_INK.paper}" stroke-width="0.53" fill="none"/>`);
      if (w >= 4) {
        for (const [label, yy, bold, initial] of [[s.nom, 6, false, 8], [`${s.longueur} mm`, 10, false, 7]] as const) {
          doc.setFont(label === s.nom ? "PlexSans" : "PlexMono", "normal");
          let pt = initial as number;
          doc.setFontSize(pt);
          while (pt > 4 && doc.getTextWidth(label) > w - 2.4) { pt -= 0.5; doc.setFontSize(pt); }
          if (doc.getTextWidth(label) <= w - 2.4) elements.push(`<text x="${left + w / 2}" y="${yy}" font-size="${pt * 0.352778}" font-family="${label === s.nom ? "PlexSans" : "PlexMono"}" font-weight="normal" fill="${PDF_INK.text}" text-anchor="middle">${escapeXml(label)}</text>`);
        }
      }
    } else if ((s.type === "reutilisable" || s.type === "dechet") && w > 14) {
      elements.push(`<text x="${left + w / 2}" y="8" font-size="2.47" fill="${PDF_INK.text}" text-anchor="middle">Chute ${s.longueur} mm</text>`);
    }
  }
  doc.setFont("PlexMono", "normal"); doc.setFontSize(6.5);
  const cotes = placerCotes(segments.filter(s => s.type === "piece").map(s => s.fin), barre.longueurBrute, largeur, txt => doc.getTextWidth(txt));
  let niveaux = 1;
  for (const cote of cotes) {
    niveaux = Math.max(niveaux, cote.niveau + 1);
    const yy = h + 4.2 + cote.niveau * 3.5;
    elements.push(`<path d="M${cote.x} ${h}V${yy - 2.4}" stroke="${PDF_INK.hatch}" stroke-width="0.1" fill="none"/><text x="${cote.labelX}" y="${yy}" font-size="2.293" font-family="PlexMono" font-weight="normal" text-anchor="middle" fill="${PDF_INK.text}">${libelleCote(cote.valeur)}</text>`);
  }
  const hauteur = h + 6 + (niveaux - 1) * 3.5;
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${largeur}" height="${hauteur}" viewBox="0 0 ${largeur} ${hauteur}" font-family="PlexSans">${elements.join("")}</svg>`;
  return { source, hauteur };
}