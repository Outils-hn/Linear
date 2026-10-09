import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  ResultatOptimisation,
  Piece,
  Strategie,
  BarreOptimisee,
  StockBarre,
  PositionMarge,
} from "./optimizer";
import { POSITION_MARGE_LABELS } from "./optimizer";
import { hexColorForPieceId } from "./piece-colors";

const STRATEGIE_LABELS: Record<Strategie, string> = {
  "min-barres": "Minimum de barres",
  "priorite-stock": "Priorité stock",
};

export interface InfosProjet {
  chantier?: string;
  numeroTache?: string;
  client?: string;
  date?: string;
}

export interface OptionsExportPDF {
  longueurBarreBrute: number;
  longueurBarreUtile: number;
  margeSecurite: number;
  positionMarge?: PositionMarge;
  traitScie: number;
  strategie: Strategie;
  stock?: StockBarre[];
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
  largeurMm: number;
}

export function calculerReperes(
  coupes: BarreOptimisee["coupes"],
  traitScie: number,
  margeDebut = 0,
): number[] {
  const reperes: number[] = [];
  let pos = margeDebut;
  coupes.forEach((c, i) => {
    if (i > 0 && traitScie > 0) pos += traitScie;
    pos += c.longueur;
    reperes.push(pos);
  });
  return reperes;
}

export function grouperCoupesConsecutives(
  coupes: BarreOptimisee["coupes"],
  traitScie: number,
  margeDebut = 0,
): (GroupeCoupe & { reperes: number[] })[] {
  const groupes: (GroupeCoupe & { reperes: number[] })[] = [];
  const reperesAll = calculerReperes(coupes, traitScie, margeDebut);
  coupes.forEach((c, idx) => {
    const last = groupes[groupes.length - 1];
    if (last && last.pieceId === c.pieceId && last.longueur === c.longueur) {
      last.quantite += 1;
      last.largeurMm += (traitScie > 0 ? traitScie : 0) + c.longueur;
      last.reperes.push(reperesAll[idx]);
    } else {
      groupes.push({
        pieceId: c.pieceId,
        nom: c.nom,
        longueur: c.longueur,
        quantite: 1,
        largeurMm: c.longueur,
        reperes: [reperesAll[idx]],
      });
    }
  });
  return groupes;
}

function signatureBarre(b: BarreOptimisee): string {
  return (
    `${b.origine}|${b.longueurBrute}|${b.longueurBarre}|` +
    b.coupes.map((c) => `${c.pieceId}:${c.longueur}`).join(",") +
    `|c=${b.chute}|m=${b.margeDebut ?? 0}:${b.margeFin ?? 0}`
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
  return [...map.values()].sort((a, b) => a.barres[0].index - b.barres[0].index);
}

export function libelleGroupe(g: GroupeBarres): string {
  const suffixe = g.reference.origine === "stock" ? " (stock)" : "";
  if (g.barres.length === 1) return `Barre n°${g.barres[0].index}${suffixe}`;
  const indices = g.barres.map((b) => b.index).sort((a, b) => a - b);
  const contigu = indices.every((v, i) => i === 0 || v === indices[i - 1] + 1);
  if (contigu)
    return `Barres n°${indices[0]} à n°${indices[indices.length - 1]}${suffixe}`;
  return `Barres n°${indices.join(", n°")}${suffixe}`;
}

export function exporterPDF(
  resultat: ResultatOptimisation,
  pieces: Piece[],
  options: OptionsExportPDF,
) {
  const {
    longueurBarreBrute,
    longueurBarreUtile,
    margeSecurite,
    traitScie,
    strategie,
    stock,
    infos,
  } = options;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const pieceIds = pieces.map((p) => p.id);

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("FICHE DE DÉBIT — Atelier", margin, 12);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const dateSrc = infos.date ? new Date(infos.date) : new Date();
  const date = (isNaN(dateSrc.getTime()) ? new Date() : dateSrc).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.text(date, pageWidth - margin, 12, { align: "right" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const chantier = infos.chantier?.trim() || "—";
  const numTache = infos.numeroTache?.trim() || "—";
  const clientStr = infos.client?.trim();
  doc.text(`Chantier : ${chantier}`, margin, 22);
  doc.text(`N° de tâche : ${numTache}`, pageWidth - margin, 22, { align: "right" });
  if (clientStr) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Client : ${clientStr}`, margin, 27);
  }

  doc.setTextColor(20, 20, 20);
  let y = 38;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Paramètres", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const ligneLongueur =
    margeSecurite > 0
      ? `Barre de base : ${longueurBarreBrute} mm (calculé sur ${longueurBarreUtile} mm après marge)`
      : `Barre de base : ${longueurBarreBrute} mm`;
  doc.text(ligneLongueur, margin, y);
  y += 4;
  doc.text(`Trait de scie : ${traitScie} mm`, margin, y);
  y += 4;
  if (margeSecurite > 0) {
    doc.text(`Marge de rafraîchissement / sécurité : ${margeSecurite} mm — ${POSITION_MARGE_LABELS[options.positionMarge ?? "debut"]}`, margin, y);
    y += 4;
  }
  doc.text(`Stratégie : ${STRATEGIE_LABELS[strategie]}`, margin, y);
  y += 4;

  if (strategie === "priorite-stock" && stock && stock.length > 0) {
    const stockValide = stock.filter((s) => s.longueur > 0 && s.quantite > 0);
    if (stockValide.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("Stock initial disponible :", margin, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      for (const s of stockValide) {
        const suffixe = s.appliquerMarge === false ? " (sans marge)" : "";
        doc.text(`• ${s.quantite} × ${s.longueur} mm${suffixe}`, margin + 4, y);
        y += 4;
      }
      doc.setFont("helvetica", "bold");
      doc.text(
        `Utilisées : ${resultat.nbBarresStock} barre(s) stock + ${resultat.nbBarresDefaut} barre(s) de base`,
        margin,
        y,
      );
      y += 4;
      doc.setFont("helvetica", "normal");
    }
  }
  y += 4;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Synthèse du projet", margin, y);
  y += 3;
  autoTable(doc, {
    startY: y,
    head: [["Barres utilisées", "Rendement brut", "Hors chutes réutilisables", "Chutes totales", "Réutilisables", "Déchets"]],
    body: [
      [
        `${resultat.nbBarres}`,
        `${resultat.rendement.toFixed(1)} %`,
        `${resultat.rendementHorsChutesReutilisables.toFixed(1)} %`,
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
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const bilan = `${resultat.longueurTotale} mm = ${resultat.longueurUtile} pièces + ${resultat.longueurTraitsScie} traits de scie + ${resultat.longueurMarges} marges + ${resultat.longueurChutes} chutes`;
  const lignesBilan = doc.splitTextToSize(bilan, pageWidth - 2 * margin);
  doc.text(lignesBilan, margin, y);
  y += lignesBilan.length * 4 + 6;

  // ---- Récapitulatif des pièces demandées ----
  const piecesValides = pieces.filter((p) => p.quantite > 0 && p.longueur > 0);
  if (piecesValides.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text("Récapitulatif des pièces demandées", margin, y);
    y += 3;
    const totalPieces = piecesValides.reduce((s, p) => s + p.quantite, 0);
    autoTable(doc, {
      startY: y,
      head: [["Repère", "Longueur (mm)", "Quantité requise"]],
      body: piecesValides.map((p) => [p.nom, `${p.longueur}`, `${p.quantite}`]),
      foot: [["Total", "", `${totalPieces}`]],
      theme: "grid",
      styles: { fontSize: 9, lineColor: [200, 200, 200], lineWidth: 0.1 },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontStyle: "bold",
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
        halign: "center",
      },
      footStyles: {
        fillColor: [248, 250, 252],
        textColor: [30, 41, 59],
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: "auto", halign: "left" },
        1: { cellWidth: 36, halign: "center" },
        2: { cellWidth: 36, halign: "center" },
      },
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error lastAutoTable
    y = doc.lastAutoTable.finalY + 10;
  }


  const groupes = grouperBarresIdentiques(resultat.barres);

  for (const g of groupes) {
    const barre = g.reference;
    const qte = g.barres.length;

    if (y > pageHeight - 70) {
      doc.addPage();
      y = margin;
    }

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
    }
    y += 5;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    const brutInfo =
      barre.longueurBrute !== barre.longueurBarre
        ? ` (barre ${barre.longueurBrute} mm)`
        : "";
    doc.text(
      `Longueur utile : ${barre.longueurBarre} mm${brutInfo}  |  ${barre.coupes.length} coupe(s) par barre`,
      margin,
      y,
    );
    y += 4;

    const schemaX = margin;
    const schemaY = y;
    const schemaW = pageWidth - 2 * margin;
    const schemaH = 14;
    const margeDebut = barre.margeDebut ?? 0;
    const margeFin = barre.margeFin ?? 0;
    let cursorMm = margeDebut;
    const mmToPx = (mm: number) => (mm / barre.longueurBrute) * schemaW;

    const hachurer = (x: number, w: number, reutilisable: boolean, marge = false) => {
      if (w <= 0) return;
      if (reutilisable) doc.setFillColor(248, 184, 74);
      else doc.setFillColor(232, 232, 232);
      doc.rect(x, schemaY, w, schemaH, "F");
      if (reutilisable) doc.setDrawColor(177, 99, 18);
      else doc.setDrawColor(110, 110, 110);
      doc.setLineWidth(0.15);
      for (let d = -schemaH; d < w; d += marge ? 1.5 : 3) {
        const start = Math.max(0, -d);
        const end = Math.min(schemaH, w - d);
        if (end > start) doc.line(x + d + start, schemaY + start, x + d + end, schemaY + end);
      }
    };

    doc.setFillColor(240, 240, 240);
    doc.rect(schemaX, schemaY, schemaW, schemaH, "F");
    hachurer(schemaX, mmToPx(margeDebut), false, true);

    const coupesGroupes = grouperCoupesConsecutives(barre.coupes, traitScie, margeDebut);

    coupesGroupes.forEach((gp, gi) => {
      const x = schemaX + mmToPx(cursorMm);
      const w = mmToPx(gp.largeurMm);
      const hex = hexColorForPieceId(gp.pieceId, pieceIds);
      const r = parseInt(hex.slice(1, 3), 16);
      const gg = parseInt(hex.slice(3, 5), 16);
      const bb = parseInt(hex.slice(5, 7), 16);
      doc.setFillColor(r, gg, bb);
      doc.rect(x, schemaY, w, schemaH, "F");

      for (let k = 1; k < gp.quantite && traitScie > 0; k++) {
        doc.setFillColor(30, 30, 30);
        doc.rect(schemaX + mmToPx(cursorMm + k * gp.longueur + (k - 1) * traitScie), schemaY, mmToPx(traitScie), schemaH, "F");
      }

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
          gp.quantite > 1 ? `${gp.longueur}mm x${gp.quantite}` : `${gp.longueur} mm`;
        const canTwoLines = schemaH >= 9;
        if (canTwoLines) {
          const sNom = fitFontSize(gp.nom, "bold", 8, 4);
          const sLng = fitFontSize(ligne2, "normal", 7, 4);
          const ptToMm = 0.3528;
          const offNom = (sNom * ptToMm) / 2 + 0.2;
          const offLng = (sLng * ptToMm) / 2 + 0.2;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(sNom);
          doc.text(gp.nom, cx, cy - offNom, { align: "center", baseline: "middle" });
          doc.setFont("helvetica", "normal");
          doc.setFontSize(sLng);
          doc.text(ligne2, cx, cy + offLng, { align: "center", baseline: "middle" });
        } else {
          const combo = `${gp.nom} (${ligne2})`;
          const s = fitFontSize(combo, "bold", 7, 4);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(s);
          doc.text(combo, cx, cy, { align: "center", baseline: "middle" });
        }
      }

      cursorMm += gp.largeurMm;
      if (gi < coupesGroupes.length - 1 && traitScie > 0) {
        const xt = schemaX + mmToPx(cursorMm);
        doc.setFillColor(30, 30, 30);
        doc.rect(xt, schemaY, mmToPx(traitScie), schemaH, "F");
        cursorMm += traitScie;
      }
    });

    const traitFinal = Math.max(0, barre.longueurTraitsScie - Math.max(0, barre.coupes.length - 1) * traitScie);
    if (traitFinal > 0) {
      doc.setFillColor(30, 30, 30);
      doc.rect(schemaX + mmToPx(cursorMm), schemaY, mmToPx(traitFinal), schemaH, "F");
      cursorMm += traitFinal;
    }
    if (barre.chute > 0) {
      const x = schemaX + mmToPx(cursorMm);
      const w = mmToPx(barre.chute);
      hachurer(x, w, barre.chuteReutilisable);
      if (w > 14) {
        doc.setTextColor(20, 20, 20);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text(`Chute ${barre.chute} mm`, x + w / 2, schemaY + schemaH / 2 + 1, {
          align: "center",
        });
      }
    }
    hachurer(schemaX + mmToPx(barre.longueurBrute - margeFin), mmToPx(margeFin), false, true);

    // Repères cumulés sous la barre (graduations)
    const reperesBarre = calculerReperes(barre.coupes, traitScie, margeDebut);
    const tickY = schemaY + schemaH;
    doc.setDrawColor(60, 60, 60);
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    let lastLabelX = -Infinity;
    reperesBarre.forEach((r) => {
      const xr = schemaX + mmToPx(r);
      doc.line(xr, tickY, xr, tickY + 1.6);
      if (xr - lastLabelX >= 8) {
        doc.text(`${r}`, xr, tickY + 4.2, { align: "center" });
        lastLabelX = xr;
      }
    });
    y += schemaH + 12;

    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`Chute finale : ${barre.chute} mm — ${barre.chuteReutilisable ? "Réutilisable" : "Déchet"}`, margin, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Marge début : ${margeDebut} mm | Marge fin : ${margeFin} mm`, margin, y);
    y += 4;
    doc.text("Cotes mesurées depuis l’extrémité brute de la barre", margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    const body: string[][] = coupesGroupes.map((c, i) => [
      `${i + 1}`,
      c.nom,
      `${c.longueur} mm`,
      `${c.quantite}`,
      c.reperes.join(" / "),
    ]);
    autoTable(doc, {
      startY: y,
      head: [["#", "Pièce", "Longueur de coupe", "Quantité", "Repère cumulé (mm)"]],
      body,
      theme: "striped",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        2: { cellWidth: 36, halign: "right" },
        3: { cellWidth: 20, halign: "center" },
        4: { halign: "right", fontStyle: "bold" },
      },
    });
    // @ts-expect-error
    y = doc.lastAutoTable.finalY + 8;
  }

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
