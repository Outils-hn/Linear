import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ResultatOptimisation, Piece, Strategie, BarreOptimisee } from "./optimizer";
import { hexColorForPieceId } from "./piece-colors";

const STRATEGIE_LABELS: Record<Strategie, string> = {
  "min-barres": "Minimum de barres utilisées",
  "max-chutes": "Maximiser les grandes chutes réutilisables",
  "tri-simple": "Coupes simplifiées / Priorité au tri",
};

export interface InfosProjet {
  chantier?: string;
  numeroTache?: string;
}

export interface OptionsExportPDF {
  longueurBarreBrute: number;
  longueurBarreUtile: number;
  margeSecurite: number;
  traitScie: number;
  strategie: Strategie;
  infos: InfosProjet;
}

export interface GroupeBarres {
  barres: BarreOptimisee[];
  signature: string;
  reference: BarreOptimisee;
}


export interface GroupeCoupe {
  pieceId: string;
  nom: string;
  longueur: number;
  quantite: number;
  largeurMm: number; // somme longueurs + traits de scie internes
}

export function grouperCoupesConsecutives(
  coupes: BarreOptimisee["coupes"],
  traitScie: number,
): GroupeCoupe[] {
  const groupes: GroupeCoupe[] = [];
  for (const c of coupes) {
    const last = groupes[groupes.length - 1];
    if (last && last.pieceId === c.pieceId && last.longueur === c.longueur) {
      last.quantite += 1;
      last.largeurMm += (traitScie > 0 ? traitScie : 0) + c.longueur;
    } else {
      groupes.push({
        pieceId: c.pieceId,
        nom: c.nom,
        longueur: c.longueur,
        quantite: 1,
        largeurMm: c.longueur,
      });
    }
  }
  return groupes;
}

function signatureBarre(b: BarreOptimisee): string {
  return (
    `${b.longueurBarre}|` +
    b.coupes.map((c) => `${c.pieceId}:${c.longueur}`).join(",") +
    `|c=${b.chute}`
  );
}

export function grouperBarresIdentiques(barres: BarreOptimisee[]): GroupeBarres[] {
  const map = new Map<string, GroupeBarres>();
  for (const b of barres) {
    const sig = signatureBarre(b);
    const g = map.get(sig);
    if (g) g.barres.push(b);
    else map.set(sig, { signature: sig, reference: b, barres: [b] });
  }
  // tri : par premier index croissant
  return [...map.values()].sort((a, b) => a.barres[0].index - b.barres[0].index);
}

export function libelleGroupe(g: GroupeBarres): string {
  if (g.barres.length === 1) return `Barre n°${g.barres[0].index}`;
  const indices = g.barres.map((b) => b.index).sort((a, b) => a - b);
  // contigus ?
  const contigu = indices.every((v, i) => i === 0 || v === indices[i - 1] + 1);
  if (contigu) return `Barres n°${indices[0]} à n°${indices[indices.length - 1]}`;
  return `Barres n°${indices.join(", n°")}`;
}

export function exporterPDF(
  resultat: ResultatOptimisation,
  pieces: Piece[],
  options: OptionsExportPDF,
) {
  const { longueurBarreBrute, longueurBarreUtile, margeSecurite, traitScie, strategie, infos } =
    options;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const pieceIds = pieces.map((p) => p.id);

  // ====== EN-TÊTE ======
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("FICHE DE DÉBIT — Atelier", margin, 12);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const date = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.text(date, pageWidth - margin, 12, { align: "right" });

  // Infos projet bien visibles
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const chantier = infos.chantier?.trim() || "—";
  const numTache = infos.numeroTache?.trim() || "—";
  doc.text(`Chantier : ${chantier}`, margin, 22);
  doc.text(`N° de tâche : ${numTache}`, pageWidth - margin, 22, { align: "right" });

  doc.setTextColor(20, 20, 20);
  let y = 38;

  // ====== PARAMÈTRES ======
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Paramètres", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const ligneLongueur =
    margeSecurite > 0
      ? `Longueur de barre : ${longueurBarreBrute} mm (Calculé sur ${longueurBarreUtile} mm après marge)`
      : `Longueur de barre : ${longueurBarreBrute} mm`;
  doc.text(ligneLongueur, margin, y);
  y += 4;
  doc.text(`Trait de scie : ${traitScie} mm`, margin, y);
  y += 4;
  if (margeSecurite > 0) {
    doc.text(`Marge de rafraîchissement / sécurité : ${margeSecurite} mm`, margin, y);
    y += 4;
  }
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

  // ====== DÉTAIL PAR GROUPE DE BARRES ======
  const groupes = grouperBarresIdentiques(resultat.barres);

  for (const g of groupes) {
    const barre = g.reference;
    const qte = g.barres.length;

    if (y > pageHeight - 70) {
      doc.addPage();
      y = margin;
    }

    // Titre du groupe
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(libelleGroupe(g), margin, y);

    if (qte > 1) {
      doc.setFontSize(10);
      doc.setTextColor(220, 38, 38);
      doc.text(`Quantité : ${qte} barres identiques`, pageWidth - margin, y, {
        align: "right",
      });
    } else {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(
        `${barre.coupes.length} coupe(s)`,
        pageWidth - margin,
        y,
        { align: "right" },
      );
    }
    y += 5;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(
      `Longueur utile : ${barre.longueurBarre} mm  |  ${barre.coupes.length} coupe(s) par barre`,
      margin,
      y,
    );
    y += 4;

    // Schéma graphique
    const schemaX = margin;
    const schemaY = y;
    const schemaW = pageWidth - 2 * margin;
    const schemaH = 14;
    let cursorMm = 0;
    const mmToPx = (mm: number) => (mm / barre.longueurBarre) * schemaW;

    doc.setFillColor(240, 240, 240);
    doc.rect(schemaX, schemaY, schemaW, schemaH, "F");

    const coupesGroupes = grouperCoupesConsecutives(barre.coupes, traitScie);

    coupesGroupes.forEach((g, gi) => {
      const x = schemaX + mmToPx(cursorMm);
      const w = mmToPx(g.largeurMm);
      const hex = hexColorForPieceId(g.pieceId, pieceIds);
      const r = parseInt(hex.slice(1, 3), 16);
      const gg = parseInt(hex.slice(3, 5), 16);
      const bb = parseInt(hex.slice(5, 7), 16);
      doc.setFillColor(r, gg, bb);
      doc.rect(x, schemaY, w, schemaH, "F");

      // Texte centré
      doc.setTextColor(255, 255, 255);
      const cx = x + w / 2;
      const cy = schemaY + schemaH / 2;
      const padding = 1.2;
      const maxW = Math.max(0, w - padding * 2);

      const fitFontSize = (txt: string, weight: "bold" | "normal", start: number, min: number) => {
        doc.setFont("helvetica", weight);
        let size = start;
        while (size > min) {
          doc.setFontSize(size);
          if (doc.getTextWidth(txt) <= maxW) return size;
          size -= 0.5;
        }
        doc.setFontSize(min);
        return min;
      };

      if (maxW >= 4) {
        const ligne2 =
          g.quantite > 1
            ? `${g.longueur}mm x${g.quantite}`
            : `${g.longueur} mm`;
        const canTwoLines = schemaH >= 9;
        if (canTwoLines) {
          const sNom = fitFontSize(g.nom, "bold", 8, 4);
          const sLng = fitFontSize(ligne2, "normal", 7, 4);
          const ptToMm = 0.3528;
          const offNom = (sNom * ptToMm) / 2 + 0.2;
          const offLng = (sLng * ptToMm) / 2 + 0.2;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(sNom);
          doc.text(g.nom, cx, cy - offNom, { align: "center", baseline: "middle" });
          doc.setFont("helvetica", "normal");
          doc.setFontSize(sLng);
          doc.text(ligne2, cx, cy + offLng, { align: "center", baseline: "middle" });
        } else {
          const combo = `${g.nom} (${ligne2})`;
          const s = fitFontSize(combo, "bold", 7, 4);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(s);
          doc.text(combo, cx, cy, { align: "center", baseline: "middle" });
        }
      }

      cursorMm += g.largeurMm;
      // Trait de scie entre groupes
      if (gi < coupesGroupes.length - 1 && traitScie > 0) {
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
      if (barre.chuteReutilisable) doc.setFillColor(234, 179, 8);
      else doc.setFillColor(180, 180, 180);
      doc.rect(x, schemaY, w, schemaH, "F");
      if (w > 14) {
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text(`Chute ${barre.chute} mm`, x + w / 2, schemaY + schemaH / 2 + 1, {
          align: "center",
        });
      }
    }
    y += schemaH + 4;

    // Chute textuelle
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const labelChute = barre.chuteReutilisable
      ? `Chute finale : ${barre.chute} mm  (réutilisable ♺)`
      : `Chute finale : ${barre.chute} mm  (déchet)`;
    doc.text(labelChute, margin, y);
    y += 4;

    // Instructions de coupe
    doc.setFont("helvetica", "normal");
    const body: string[][] = coupesGroupes.map((c, i) => [
      `${i + 1}`,
      c.nom,
      `${c.longueur} mm`,
      `${c.quantite}`,
    ]);
    autoTable(doc, {
      startY: y,
      head: [["#", "Pièce", "Longueur de coupe", "Quantité"]],
      body,
      theme: "striped",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        2: { cellWidth: 40, halign: "right" },
        3: { cellWidth: 25, halign: "center" },
      },
    });
    // @ts-expect-error
    y = doc.lastAutoTable.finalY + 8;
  }

  // Pied de page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} / ${totalPages}`, pageWidth - margin, pageHeight - 8, {
      align: "right",
    });
    const pied = [
      "Fiche de débit — Optimisation linéaire",
      infos.chantier?.trim() ? `Chantier : ${infos.chantier.trim()}` : null,
      infos.numeroTache?.trim() ? `Tâche : ${infos.numeroTache.trim()}` : null,
    ]
      .filter(Boolean)
      .join("  ·  ");
    doc.text(pied, margin, pageHeight - 8);
  }

  const slug = (infos.numeroTache?.trim() || infos.chantier?.trim() || `${Date.now()}`)
    .replace(/[^a-z0-9-_]+/gi, "-")
    .toLowerCase();
  doc.save(`fiche-debit-${slug}.pdf`);
}
