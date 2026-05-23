import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ResultatOptimisation, Piece, Strategie } from "./optimizer";
import { SEUIL_CHUTE_REUTILISABLE } from "./optimizer";
import { hexColorForPieceId } from "./piece-colors";

const STRATEGIE_LABELS: Record<Strategie, string> = {
  "min-barres": "Minimum de barres utilisées",
  "max-chutes": "Maximiser les grandes chutes réutilisables",
  "tri-simple": "Coupes simplifiées / Priorité au tri",
};

export function exporterPDF(
  resultat: ResultatOptimisation,
  pieces: Piece[],
  longueurBarre: number,
  traitScie: number,
  strategie: Strategie,
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const pieceIds = pieces.map((p) => p.id);

  // ====== EN-TÊTE ======
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("FICHE DE DÉBIT — Atelier", margin, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const date = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.text(date, pageWidth - margin, 14, { align: "right" });

  doc.setTextColor(20, 20, 20);
  let y = 32;

  // ====== PARAMÈTRES ======
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Paramètres", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Longueur de barre : ${longueurBarre} mm`, margin, y);
  y += 4;
  doc.text(`Trait de scie : ${traitScie} mm`, margin, y);
  y += 4;
  doc.text(`Stratégie : ${STRATEGIE_LABELS[strategie]}`, margin, y);
  y += 8;

  // ====== SYNTHÈSE ======
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Synthèse du projet", margin, y);
  y += 3;
  autoTable(doc, {
    startY: y,
    head: [["Barres utilisées", "Rendement", "Chutes totales", "Réutilisables", "Déchets"]],
    body: [
      [
        `${resultat.nbBarres}`,
        `${resultat.rendement.toFixed(1)} %`,
        `${resultat.longueurChutes} mm (${resultat.pourcentageChutes.toFixed(1)} %)`,
        `${resultat.longueurChutesReutilisables} mm`,
        `${resultat.longueurDechets} mm`,
      ],
    ],
    theme: "grid",
    styles: { fontSize: 9, halign: "center" },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
    margin: { left: margin, right: margin },
  });
  // @ts-expect-error lastAutoTable
  y = doc.lastAutoTable.finalY + 8;

  // ====== DÉTAIL PAR BARRE ======
  for (const barre of resultat.barres) {
    if (y > pageHeight - 60) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(`Barre n°${barre.index}`, margin, y);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(
      `Longueur : ${barre.longueurBarre} mm  |  ${barre.coupes.length} coupe(s)`,
      pageWidth - margin,
      y,
      { align: "right" },
    );
    y += 4;

    // Schéma graphique
    const schemaX = margin;
    const schemaY = y;
    const schemaW = pageWidth - 2 * margin;
    const schemaH = 10;
    let cursorMm = 0;
    const mmToPx = (mm: number) => (mm / barre.longueurBarre) * schemaW;

    // Background
    doc.setFillColor(240, 240, 240);
    doc.rect(schemaX, schemaY, schemaW, schemaH, "F");

    barre.coupes.forEach((c, i) => {
      const x = schemaX + mmToPx(cursorMm);
      const w = mmToPx(c.longueur);
      const hex = hexColorForPieceId(c.pieceId, pieceIds);
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      doc.setFillColor(r, g, b);
      doc.rect(x, schemaY, w, schemaH, "F");
      // label
      if (w > 12) {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.text(`${c.nom}`, x + w / 2, schemaY + schemaH / 2 + 1, {
          align: "center",
        });
      }
      cursorMm += c.longueur;
      if (i < barre.coupes.length - 1 && traitScie > 0) {
        const xt = schemaX + mmToPx(cursorMm);
        doc.setFillColor(30, 30, 30);
        doc.rect(xt, schemaY, Math.max(0.3, mmToPx(traitScie)), schemaH, "F");
        cursorMm += traitScie;
      }
    });

    // Chute
    if (barre.chute > 0) {
      const x = schemaX + mmToPx(cursorMm);
      const w = schemaW - mmToPx(cursorMm);
      if (barre.chuteReutilisable) {
        doc.setFillColor(234, 179, 8);
      } else {
        doc.setFillColor(180, 180, 180);
      }
      doc.rect(x, schemaY, w, schemaH, "F");
      if (w > 12) {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.text(`${barre.chute} mm`, x + w / 2, schemaY + schemaH / 2 + 1, {
          align: "center",
        });
      }
    }
    y += schemaH + 4;

    // Instructions de coupe
    doc.setTextColor(20, 20, 20);
    const body: string[][] = barre.coupes.map((c, i) => [
      `${i + 1}`,
      c.nom,
      `${c.longueur} mm`,
    ]);
    autoTable(doc, {
      startY: y,
      head: [["#", "Pièce", "Longueur de coupe"]],
      body,
      theme: "striped",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        2: { cellWidth: 40, halign: "right" },
      },
    });
    // @ts-expect-error
    y = doc.lastAutoTable.finalY + 2;

    y += 6;
  }

  // Pied de page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} / ${totalPages}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: "right" },
    );
    doc.text("Fiche de débit — Optimisation linéaire", margin, pageHeight - 8);
  }

  doc.save(`fiche-debit-${Date.now()}.pdf`);
}
