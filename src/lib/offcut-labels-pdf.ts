import type { jsPDF } from "jspdf";
import type { ChutesProfil } from "./chutes";
import type { OptionsChutesPDF } from "./offcut-settings";
import { choixChute } from "./offcut-settings";
import { libelleProfil } from "./multi-profil";
import { formatNombre } from "./format-number";
import { themeRgb } from "./visual-theme";

/** One physical label per selected offcut, continuing onto A4 pages when needed. */
export function ajouterEtiquettes(doc: jsPDF, groupes: ChutesProfil[], options: OptionsChutesPDF, infos: { chantier?: string; numeroTache?: string }, date: string) {
  let y = 300;
  let column = 0;
  const width = 87, gap = 6, margin = 15;
  for (const g of groupes) for (const l of g.lignes) {
    doc.setFont("PlexSans", "normal"); doc.setFontSize(9);
    const note = choixChute(options, l).note.trim();
    const lines = [
      ...doc.splitTextToSize(`Profilé : ${libelleProfil(g.profil)}`, width - 8),
      `${formatNombre(l.longueur)} mm`,
      ...doc.splitTextToSize(`Chantier : ${infos.chantier?.trim() || "—"}`, width - 8),
      ...doc.splitTextToSize(`N° de tâche : ${infos.numeroTache?.trim() || "—"}`, width - 8),
      ...doc.splitTextToSize(`Date : ${date}`, width - 8),
      ...(note ? doc.splitTextToSize(`Note : ${note}`, width - 8) : []),
    ] as string[];
    // Exceptionally long notes continue in a second label-sized block without clipping.
    const chunks: string[][] = [];
    for (let start = 0; start < lines.length; start += 48) chunks.push(lines.slice(start, start + 48));
    const height = Math.max(48, 16 + Math.min(lines.length, 48) * 4.5);
    for (let n = 0; n < l.quantite; n++) {
      for (const [part, chunk] of chunks.entries()) {
        if (y + height > 278) { doc.addPage(); y = 25; column = 0; doc.setFont("PlexSans", "bold"); doc.setFontSize(12); doc.setTextColor(...themeRgb("pdf-print-ink")); doc.text("ÉTIQUETTES — CHUTES À CONSERVER", margin, 16); }
        const x = margin + column * (width + gap);
        doc.setDrawColor(...themeRgb("pdf-print-ink")); doc.setLineWidth(0.4); doc.rect(x, y, width, height);
        doc.setTextColor(...themeRgb("pdf-print-ink")); doc.setFont("PlexSans", "bold"); doc.setFontSize(9);
        doc.text(part === 0 ? "À CONSERVER - NE PAS JETER" : "À CONSERVER — NOTE (suite)", x + 4, y + 7);
        doc.setFont("PlexSans", "normal"); doc.setFontSize(9);
        chunk.forEach((text, i) => doc.text(text, x + 4, y + 14 + i * 4.5));
        if (column === 0) column = 1;
        else { column = 0; y += height + gap; }
      }
    }
    if (column === 1) { column = 0; y += height + gap; }
  }
}