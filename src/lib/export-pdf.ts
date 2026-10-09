import { jsPDF } from "jspdf";
import { installerPolicesPDF } from "./pdf-fonts";
import { themeRgb } from "./visual-theme";
import { tableauAtelier as autoTable } from "./pdf-table";
import { dessinBarrePDF } from "./bar-svg-pdf";
import { grouperBarresIdentiques, libelleGroupe, libelleCote } from "./bar-drawing";
export { grouperBarresIdentiques, libelleGroupe } from "./bar-drawing";
export type { GroupeBarres } from "./bar-drawing";
import type {
  Piece,
  Strategie,
  BarreOptimisee,
  StockBarre,
  PositionMarge,
} from "./optimizer";
import { POSITION_MARGE_LABELS } from "./optimizer";
import { hexColorForPieceId } from "./piece-colors";
import { libelleProfil, type ResultatMulti } from "./multi-profil";

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
  longueursProfils?: Record<string, number>;
  infos: InfosProjet;
  verification?: { ok: boolean; problemes: string[] };
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

export async function exporterPDF(
  resultat: ResultatMulti,
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
  const { svg2pdf } = await import("svg2pdf.js");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await installerPolicesPDF(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const pieceIds = pieces.map((p) => p.id);

  doc.setFillColor(...themeRgb("pdf-heading"));
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(...themeRgb("cut-separator"));
  doc.setFontSize(16);
  doc.setFont("PlexSans", "bold");
  doc.text("FICHE DE DÉBIT — Atelier", margin, 12);

  doc.setFontSize(10);
  doc.setFont("PlexSans", "normal");
  const dateSrc = infos.date ? new Date(infos.date) : new Date();
  const date = (isNaN(dateSrc.getTime()) ? new Date() : dateSrc).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.text(date, pageWidth - margin, 12, { align: "right" });

  doc.setFontSize(11);
  doc.setFont("PlexSans", "bold");
  const chantier = infos.chantier?.trim() || "—";
  const numTache = infos.numeroTache?.trim() || "—";
  const clientStr = infos.client?.trim();
  doc.text(`Chantier : ${chantier}`, margin, 22);
  doc.text(`N° de tâche : ${numTache}`, pageWidth - margin, 22, { align: "right" });
  if (clientStr) {
    doc.setFont("PlexSans", "normal");
    doc.setFontSize(9);
    doc.text(`Client : ${clientStr}`, margin, 27);
  }

  doc.setTextColor(...themeRgb("piece-ink"));
  let y = 38;

  doc.setFontSize(11);
  doc.setFont("PlexSans", "bold");
  doc.text("Paramètres", margin, y);
  y += 5;
  doc.setFont("PlexSans", "normal");
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
      doc.setFont("PlexSans", "bold");
      doc.text("Stock initial disponible :", margin, y);
      y += 4;
      doc.setFont("PlexSans", "normal");
      for (const s of stockValide) {
        const suffixe = s.appliquerMarge === false ? " (sans marge)" : "";
        doc.text(`• ${s.quantite} × ${s.longueur} mm${suffixe}`, margin + 4, y);
        y += 4;
      }
      doc.setFont("PlexSans", "bold");
      doc.text(
        `Utilisées : ${resultat.nbBarresStock} barre(s) stock + ${resultat.nbBarresDefaut} barre(s) de base`,
        margin,
        y,
      );
      y += 4;
      doc.setFont("PlexSans", "normal");
    }
  }
  y += 4;

  doc.setFontSize(11);
  doc.setFont("PlexSans", "bold");
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
    headStyles: { fillColor: themeRgb("pdf-table-head"), textColor: themeRgb("pdf-heading"), fontStyle: "bold" },
    margin: { left: margin, right: margin },
  });
  // @ts-expect-error lastAutoTable
  y = doc.lastAutoTable.finalY + 8;
  doc.setFont("PlexSans", "normal");
  doc.setFontSize(9);
  const bilan = `${resultat.longueurTotale} mm = ${resultat.longueurUtile} pièces + ${resultat.longueurTraitsScie} traits de scie + ${resultat.longueurMarges} marges + ${resultat.longueurChutes} chutes`;
  const lignesBilan = doc.splitTextToSize(bilan, pageWidth - 2 * margin);
  doc.text(lignesBilan, margin, y);
  y += lignesBilan.length * 4 + 2;
  const verif = options.verification;
  if (verif) {
    const ok = verif.ok;
    const txt = ok ? "Vérification OK" : `Erreur de calcul (${verif.problemes.length})`;
    doc.setFont("PlexSans", "bold");
    doc.setFillColor(...(ok ? themeRgb("pdf-success") : themeRgb("pdf-error")));
    const w = doc.getTextWidth(txt) + 6;
    doc.roundedRect(margin, y, w, 6, 1.5, 1.5, "F");
    doc.setTextColor(...themeRgb("cut-separator"));
    doc.text(txt, margin + 3, y + 4.2);
    doc.setTextColor(...themeRgb("piece-ink"));
    doc.setFont("PlexSans", "normal");
    y += 9;
    if (!ok) {
      doc.setTextColor(...themeRgb("pdf-error"));
      for (const pb of verif.problemes) {
        const l = doc.splitTextToSize(`• ${pb}`, pageWidth - 2 * margin);
        doc.text(l, margin, y);
        y += l.length * 4;
      }
      doc.setTextColor(...themeRgb("piece-ink"));
      y += 2;
    }
  }
  y += 2;

  if (resultat.profils.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Profilé", "Longueur de barre", "Sous-total barres", "Rendement brut", "Chutes"]],
      body: resultat.profils.map((rp) => [
        libelleProfil(rp.profil),
        `${rp.longueurBarre} mm`,
        `${rp.resultat.nbBarres}`,
        `${rp.resultat.rendement.toFixed(1)} %`,
        `${rp.resultat.longueurChutes} mm`,
      ]),
      foot: [["Total", "", `${resultat.nbBarres}`, `${resultat.rendement.toFixed(1)} %`, `${resultat.longueurChutes} mm`]],
      theme: "grid",
      styles: { fontSize: 9, halign: "center" },
      headStyles: { fillColor: themeRgb("pdf-table-head"), textColor: themeRgb("pdf-heading"), fontStyle: "bold" },
      footStyles: { fillColor: themeRgb("pdf-table-stripe"), textColor: themeRgb("pdf-heading"), fontStyle: "bold" },
      columnStyles: { 0: { halign: "left" } },
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error lastAutoTable
    y = doc.lastAutoTable.finalY + 6;
  }

  // ---- Récapitulatif des pièces demandées ----
  const piecesValides = pieces.filter((p) => p.quantite > 0 && p.longueur > 0);
  if (piecesValides.length > 0) {
    doc.setFontSize(11);
    doc.setFont("PlexSans", "bold");
    doc.setTextColor(...themeRgb("piece-ink"));
    doc.text("Récapitulatif des pièces demandées", margin, y);
    y += 3;
    const totalPieces = piecesValides.reduce((s, p) => s + p.quantite, 0);
    autoTable(doc, {
      startY: y,
      head: [["Repère", "Profilé", "Longueur (mm)", "Quantité requise"]],
      body: piecesValides.map((p) => [p.nom, (p.profil ?? "").trim() || "—", `${p.longueur}`, `${p.quantite}`]),
      foot: [["Total", "", "", `${totalPieces}`]],
      theme: "grid",
      styles: { fontSize: 9, lineColor: themeRgb("hatch"), lineWidth: 0.1 },
      headStyles: {
        fillColor: themeRgb("pdf-table-head"),
        textColor: themeRgb("pdf-heading"),
        fontStyle: "bold",
        lineColor: themeRgb("hatch"),
        lineWidth: 0.1,
        halign: "center",
      },
      footStyles: {
        fillColor: themeRgb("pdf-table-stripe"),
        textColor: themeRgb("pdf-heading"),
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: "auto", halign: "left" },
        1: { cellWidth: 36, halign: "center" },
        2: { cellWidth: 30, halign: "center" },
        3: { cellWidth: 30, halign: "center" },
      },
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error lastAutoTable
    y = doc.lastAutoTable.finalY + 10;
  }


  for (const rp of resultat.profils) {
  if (y + 90 > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }
  doc.setFillColor(...themeRgb("pdf-heading"));
  doc.rect(margin, y - 4.5, pageWidth - 2 * margin, 7, "F");
  doc.setTextColor(...themeRgb("cut-separator"));
  doc.setFont("PlexSans", "bold");
  doc.setFontSize(10);
   doc.text(`PROFILÉ : ${libelleProfil(rp.profil).toUpperCase()}`, margin + 2, y);
  doc.text(`Barre ${rp.longueurBarre} mm  ·  Sous-total : ${rp.resultat.nbBarres} barre(s)`, pageWidth - margin - 2, y, { align: "right" });
  y += 9;
  const groupes = grouperBarresIdentiques(rp.resultat.barres);

  for (const g of groupes) {
    const barre = g.reference;
    const qte = g.barres.length;

    const nbGroupes = grouperCoupesConsecutives(barre.coupes, traitScie).length;
    const dessin = dessinBarrePDF(doc, barre, traitScie, pieceIds, pageWidth - 2 * margin);
    // Long tables must span pages; keep the profile heading with its first drawing.
    const hauteurEstimee = Math.min(70 + nbGroupes * 10 + Math.max(0, dessin.hauteur - 20), pageHeight - 2 * margin - 9);
    if (y + hauteurEstimee > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(12);
    doc.setFont("PlexSans", "bold");
    doc.setTextColor(...themeRgb("pdf-heading"));
    doc.text(libelleGroupe(g), margin, y);

    if (qte > 1) {
      doc.setFontSize(10);
      doc.setTextColor(...themeRgb("pdf-error"));
      doc.text(`x ${qte}`, pageWidth - margin, y, {
        align: "right",
      });
    }
    y += 5;

    doc.setFontSize(9);
    doc.setFont("PlexSans", "normal");
    doc.setTextColor(...themeRgb("pdf-muted"));
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

    const margeDebut = barre.margeDebut ?? 0;
    const margeFin = barre.margeFin ?? 0;
    const coupesGroupes = grouperCoupesConsecutives(barre.coupes, traitScie, margeDebut);
    const svg = new DOMParser().parseFromString(dessin.source, "image/svg+xml").documentElement;
    await svg2pdf(svg, doc, { x: margin, y, width: pageWidth - 2 * margin, height: dessin.hauteur });
    y += dessin.hauteur + 6;

    doc.setTextColor(...themeRgb("piece-ink"));
    doc.setFont("PlexSans", "bold");
    doc.setFontSize(9);
    doc.text(`Chute finale : ${barre.chute} mm — ${barre.chuteReutilisable ? "Réutilisable" : "Déchet"}`, margin, y);
    y += 4;

    doc.setFont("PlexSans", "normal");
    doc.setFontSize(8);
    doc.text(`Marge début : ${margeDebut} mm | Marge fin : ${margeFin} mm`, margin, y);
    y += 4;
    doc.text("Cotes mesurées depuis l’extrémité brute de la barre", margin, y);
    y += 5;

    doc.setFont("PlexSans", "normal");
    const body: string[][] = coupesGroupes.map((c, i) => [
      `${i + 1}`,
      c.nom,
      `${c.longueur} mm`,
      `${c.quantite}`,
      c.reperes.map(libelleCote).join(" / "),
    ]);
    autoTable(doc, {
      startY: y,
      head: [["#", "Pièce", "Longueur de coupe", "Quantité", "Repère cumulé (mm)"]],
      body,
      theme: "striped",
      pageBreak: "avoid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: themeRgb("pdf-table-head"), textColor: themeRgb("pdf-heading") },
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
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...themeRgb("pdf-muted"));
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
