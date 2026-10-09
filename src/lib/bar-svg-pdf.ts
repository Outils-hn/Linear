import type { jsPDF } from "jspdf";
import type { BarreOptimisee } from "./optimizer";
import { segmentsBarre, placerCotes } from "./bar-drawing";
import { hexColorForPieceId } from "./piece-colors";

const PDF_INK = { text: "#141414", paper: "#ffffff", waste: "#e8e8e8", hatch: "#6e6e6e", reusable: "#f8b84a", reusableHatch: "#b16312", kerf: "#1e1e1e" };
const escapeXml = (value: string) => value.replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c] ?? c);

export function dessinBarrePDF(doc: jsPDF, barre: BarreOptimisee, traitScie: number, ids: string[], largeur: number) {
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
        if (b > a) elements.push(`<line x1="${left + d + a}" y1="${a}" x2="${left + d + b}" y2="${b}" stroke="${stroke}" stroke-width="0.15"/>`);
      }
    }
    if (s.type === "piece") {
      elements.push(`<path d="M${left} 0V${h}M${left + w} 0V${h}" stroke="${PDF_INK.text}" stroke-width="0.35" fill="none"/>`);
      if (w >= 4) {
        for (const [label, yy, bold, initial] of [[s.nom, 6, true, 8], [`${s.longueur} mm`, 10, false, 7]] as const) {
          doc.setFont("helvetica", bold ? "bold" : "normal");
          let pt = initial as number;
          doc.setFontSize(pt);
          while (pt > 4 && doc.getTextWidth(label) > w - 2.4) { pt -= 0.5; doc.setFontSize(pt); }
          if (doc.getTextWidth(label) <= w - 2.4) elements.push(`<text x="${left + w / 2}" y="${yy}" font-size="${pt * 0.352778}" font-weight="${bold ? "bold" : "normal"}" fill="${PDF_INK.paper}" text-anchor="middle">${escapeXml(label)}</text>`);
        }
      }
    } else if ((s.type === "reutilisable" || s.type === "dechet") && w > 14) {
      elements.push(`<text x="${left + w / 2}" y="8" font-size="2.47" fill="${PDF_INK.text}" text-anchor="middle">Chute ${s.longueur} mm</text>`);
    }
  }
  doc.setFont("helvetica", "bold"); doc.setFontSize(6.5);
  const cotes = placerCotes(segments.filter(s => s.type === "piece").map(s => s.fin), barre.longueurBrute, largeur, txt => doc.getTextWidth(txt));
  let niveaux = 1;
  for (const cote of cotes) {
    niveaux = Math.max(niveaux, cote.niveau + 1);
    const yy = h + 4.2 + cote.niveau * 3.5;
    elements.push(`<path d="M${cote.x} ${h}V${yy - 2.4}" stroke="${PDF_INK.hatch}" stroke-width="0.15" fill="none"/><text x="${cote.labelX}" y="${yy}" font-size="2.293" font-weight="bold" text-anchor="middle" fill="${PDF_INK.text}">${cote.valeur}</text>`);
  }
  const hauteur = h + 6 + (niveaux - 1) * 3.5;
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${largeur}" height="${hauteur}" viewBox="0 0 ${largeur} ${hauteur}" font-family="helvetica">${elements.join("")}</svg>`;
  return { source, hauteur };
}