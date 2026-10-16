import { formatNombre as fmt } from "./format-number";
import { bilanMatiere } from "./material-summary";
import { lireStatutMatiere, libelleStatutMatiere, detailsCommande, type StatutMatiere } from "./material-status";
import { jsPDF } from "jspdf";
import { installerPolicesPDF } from "./pdf-fonts";
import { themeRgb } from "./visual-theme";
import { tableauAtelier as autoTable } from "./pdf-table";
import { dessinBarrePDF } from "./bar-svg-pdf";
import { grouperBarresIdentiques, libelleGroupe } from "./bar-drawing";
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
import { libelleProfil, nomProfil, type ResultatMulti } from "./multi-profil";
import { chutesAConserver } from "./chutes";
import { lignesReperes, seuilsDesProfils, METHODES_COUPE, RAPPEL_RUBAN, type MethodeCoupe } from "./cut-method";
import { optionsChutesDefaut, choixBarre, choixChute, chutesSelectionnees, type OptionsChutesPDF } from "./offcut-settings";
import { ajouterEtiquettes } from "./offcut-labels-pdf";

const STRATEGIE_LABELS: Record<Strategie, string> = {
  "min-barres": "Minimum de barres",
  "priorite-stock": "Chutes disponibles d'abord",
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
  chutesPDF?: OptionsChutesPDF;
  methodeCoupe?: MethodeCoupe;
  statutMatiere?: StatutMatiere;
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
  const matiere = bilanMatiere(resultat);
  const chutesPDF = options.chutesPDF ?? optionsChutesDefaut();
  const sansTypes = chutesPDF.mode === "none";
  const consigne = chutesPDF.mode === "instruction";

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
      ? `Barre de base : ${fmt(longueurBarreBrute)} mm (calculé sur ${fmt(longueurBarreUtile)} mm après marge)`
      : `Barre de base : ${fmt(longueurBarreBrute)} mm`;
  doc.text(ligneLongueur, margin, y);
  y += 4;
  doc.text(`Trait de scie : ${fmt(traitScie)} mm`, margin, y);
  y += 4;
  if (margeSecurite > 0) {
    doc.text(`Marge de rafraîchissement / sécurité : ${fmt(margeSecurite)} mm — ${POSITION_MARGE_LABELS[options.positionMarge ?? "debut"]}`, margin, y);
    y += 4;
  }
  doc.text(`Stratégie : ${STRATEGIE_LABELS[strategie]}`, margin, y);
  y += 4;
  const methodeCoupe: MethodeCoupe = options.methodeCoupe ?? "butee";
  doc.text(`Méthode de coupe à l’atelier : ${METHODES_COUPE[methodeCoupe]}`, margin, y);
  y += 4;
  const seuils = seuilsDesProfils(resultat.profils);
  const seuilTexte = (liste: typeof seuils) => new Set(liste.map(s => s.seuil)).size <= 1
    ? `${fmt(liste[0]?.seuil ?? 0)} mm`
    : liste.map(s => `${libelleProfil(s.profil)} ${fmt(s.seuil)} mm`).join(" · ");
  if (seuils.length) {
    for (const ligne of doc.splitTextToSize(`Chute réutilisable à partir de : ${seuilTexte(seuils)}`, pageWidth - 2 * margin) as string[]) { doc.text(ligne, margin, y); y += 4; }
  }

  if (strategie === "priorite-stock" && stock && stock.length > 0) {
    const stockValide = stock.filter((s) => s.longueur > 0 && s.quantite > 0);
    if (stockValide.length > 0) {
      doc.setFont("PlexSans", "bold");
      doc.text("Chutes et barres disponibles :", margin, y);
      y += 4;
      doc.setFont("PlexSans", "normal");
      for (const s of stockValide) {
        const suffixe = s.appliquerMarge === false ? " (sans marge)" : "";
        doc.text(`• ${fmt(s.quantite)} × ${fmt(s.longueur)} mm${suffixe}`, margin + 4, y);
        y += 4;
      }
      doc.setFont("PlexSans", "bold");
      doc.text(
        `Utilisées : ${fmt(resultat.nbBarresStock)} chute(s) ou barre(s) disponible(s) + ${fmt(resultat.nbBarresDefaut)} barre(s) de base`,
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
  // Bandeau des informations essentielles — mise en valeur par taille et gras (lisible en noir et blanc).
  const statutMatiere = lireStatutMatiere(options.statutMatiere);
  const itemsBandeau: { label: string; valeur: string; sousTitre?: string }[] =
    resultat.profils.length > 1
      ? resultat.profils.map((rp) => ({
          label: `${libelleStatutMatiere(statutMatiere)} · ${libelleProfil(rp.profil)} : `,
          valeur: `${fmt(rp.resultat.nbBarres)} x ${fmt(rp.longueurBarre)} mm`,
        }))
      : [{
          label: `${libelleStatutMatiere(statutMatiere)} : `,
          valeur: `${fmt(resultat.nbBarres)} x ${fmt(resultat.profils[0]?.longueurBarre ?? longueurBarreBrute)} mm`,
        }];
  for (const item of itemsBandeau) item.sousTitre = detailsCommande(statutMatiere);
  const dernier = itemsBandeau.at(-1);
  if (dernier) dernier.sousTitre = [dernier.sousTitre, `${fmt(resultat.longueurTotale)} mm au total`].filter(Boolean).join(" — ");
  itemsBandeau.push({ label: "Rendement : ", valeur: `${fmt(resultat.rendement, 1)} %`, sousTitre: `${fmt(resultat.longueurUtile)} mm de pièces / ${fmt(resultat.longueurTotale)} mm achetés` });
  const largeurBandeau = pageWidth - 2 * margin - 10;
  const lignesBandeau = itemsBandeau.map(item => {
    doc.setFont("PlexSans", "bold"); doc.setFontSize(18);
    const label = doc.splitTextToSize(item.label.trim(), largeurBandeau) as string[];
    const ensemble = doc.getTextWidth(item.label + item.valeur) <= largeurBandeau;
    doc.setFont("PlexSans", "normal"); doc.setFontSize(8);
    const sousTitre = item.sousTitre ? doc.splitTextToSize(item.sousTitre, largeurBandeau) as string[] : [];
    return { item, label, ensemble, sousTitre, hauteur: (ensemble ? 1 : label.length + 1) * 8 + sousTitre.length * 4 + 4 };
  });
  const hauteurBandeau = lignesBandeau.reduce((s, l) => s + l.hauteur, 0) + 7;
  if (y + hauteurBandeau > pageHeight - margin) { doc.addPage(); y = margin; }
  doc.setFontSize(18);
  doc.setFont("PlexSans", "bold");
  doc.setDrawColor(...themeRgb("pdf-heading"));
  doc.setLineWidth(0.5);
  doc.rect(margin, y, pageWidth - 2 * margin, hauteurBandeau);
  let yBandeau = y + 4 + 6.5;
  for (const { item, label, ensemble, sousTitre } of lignesBandeau) {
    doc.setFont("PlexSans", "bold"); doc.setFontSize(18);
    doc.setTextColor(...themeRgb("piece-ink"));
    if (ensemble) doc.text(item.label, margin + 5, yBandeau);
    else { doc.text(label, margin + 5, yBandeau, { lineHeightFactor: 1.26 }); yBandeau += label.length * 8; }
    doc.setTextColor(...themeRgb("pdf-primary"));
    doc.text(item.valeur, margin + 5 + (ensemble ? doc.getTextWidth(item.label) : 0), yBandeau);
    yBandeau += 5;
    doc.setFont("PlexSans", "normal"); doc.setFontSize(8); doc.setTextColor(...themeRgb("pdf-muted"));
    for (const ligne of sousTitre) { doc.text(ligne, margin + 5, yBandeau); yBandeau += 4; }
    yBandeau += 7;
  }
  doc.setTextColor(...themeRgb("piece-ink"));
  y += hauteurBandeau + 7;
  if (!sansTypes) {
  autoTable(doc, {
    startY: y,
    head: [["Chutes réutilisables", "Perte définitive"]],
    body: [
      [
        `${fmt(resultat.longueurChutesReutilisables)} mm (${fmt(matiere.parts[1].affiche, 1)} %)`,
        `${fmt(matiere.perte)} mm (${fmt(matiere.parts[2].affiche, 1)} %)`,
      ],
    ],
    theme: "grid",
    styles: { fontSize: 9, halign: "right" },
    headStyles: { fillColor: themeRgb("pdf-table-head"), textColor: themeRgb("pdf-heading"), fontStyle: "bold" },
    margin: { left: margin, right: margin },
  });
  // @ts-expect-error lastAutoTable
  y = doc.lastAutoTable.finalY + 8;
  }
  doc.setFont("PlexSans", "normal");
  doc.setFontSize(9);
  const bilan = `${fmt(resultat.longueurTotale)} mm = ${fmt(resultat.longueurUtile)} pièces + ${fmt(resultat.longueurTraitsScie)} traits de scie + ${fmt(resultat.longueurMarges)} marges + ${fmt(resultat.longueurChutes)} chutes`;
  const lignesBilan = doc.splitTextToSize(bilan, pageWidth - 2 * margin);
  doc.text(lignesBilan, margin, y);
  y += lignesBilan.length * 4 + 2;
  if (!sansTypes) {
  doc.text("Perte définitive : matière réellement jetée (déchets + traits de scie + marges)", margin, y);
  y += 5;
  const lignesRepartition = doc.splitTextToSize(matiere.repartition, pageWidth - 2 * margin);
  doc.text(lignesRepartition, margin, y);
  y += lignesRepartition.length * 4;
  let xPart = margin;
  for (const [i, part] of matiere.parts.entries()) {
    const largeur = (pageWidth - 2 * margin) * part.pourcentage / 100;
    doc.setFillColor(...themeRgb(["piece-1", "warning", "hatch"][i]));
    doc.rect(xPart, y, largeur, 3, "F");
    xPart += largeur;
  }
  y += 8;
  }
  const verif = options.verification;
  if (verif && !verif.ok) {
    doc.setFont("PlexSans", "normal");
    doc.setTextColor(...themeRgb("pdf-error"));
    for (const pb of verif.problemes) {
      const l = doc.splitTextToSize(`• ${pb}`, pageWidth - 2 * margin);
      doc.text(l, margin, y);
      y += l.length * 4;
    }
    doc.setTextColor(...themeRgb("piece-ink"));
    y += 2;
  }
  y += 2;

  if (resultat.profils.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Profilé", "Longueur de barre", "Sous-total barres", "Rendement", "Chutes"]],
      body: resultat.profils.map((rp) => [
        libelleProfil(rp.profil),
        `${fmt(rp.longueurBarre)} mm`,
        `${fmt(rp.resultat.nbBarres)}`,
        `${fmt(rp.resultat.rendement, 1)} %`,
        `${fmt(rp.resultat.longueurChutes)} mm`,
      ]),
      foot: [["Total", "", `${fmt(resultat.nbBarres)}`, `${fmt(resultat.rendement, 1)} %`, `${fmt(resultat.longueurChutes)} mm`]],
      theme: "grid",
      styles: { fontSize: 9, halign: "right" },
      headStyles: { fillColor: themeRgb("pdf-table-head"), textColor: themeRgb("pdf-heading"), fontStyle: "bold" },
      footStyles: { fillColor: themeRgb("pdf-total-row"), textColor: themeRgb("pdf-heading"), fontStyle: "bold" },
      columnStyles: { 0: { halign: "left" } },
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error lastAutoTable
    y = doc.lastAutoTable.finalY + 6;
  }

  // ---- Chutes à conserver ----
  const toutesChutes = chutesAConserver(resultat);
  const chutesProfils = consigne ? chutesSelectionnees(toutesChutes, chutesPDF) : toutesChutes;
  if (!sansTypes && chutesProfils.length > 0) {
    if (y + 25 > pageHeight - margin) { doc.addPage(); y = margin; }
    doc.setFontSize(11);
    doc.setFont("PlexSans", "bold");
    doc.setTextColor(...themeRgb("piece-ink"));
    doc.text(consigne ? "Chutes à conserver" : "Chutes conservables", margin, y);
    y += 3;
    {
      const concernes = seuils.filter(s => chutesProfils.some(g => g.profil === nomProfil(s.profil)));
      doc.setFont("PlexSans", "normal"); doc.setFontSize(8);
      doc.text(`À titre indicatif : chutes de ${seuilTexte(concernes.length ? concernes : seuils)} et plus`, margin, y + 2);
      y += 7;
    }
    autoTable(doc, {
      startY: y,
      head: [["Profilé", "Longueur (mm)", "Quantité", "Barres d’origine", ...(consigne ? ["Note"] : [])]],
      body: chutesProfils.flatMap((g) => [
        ...g.lignes.map((l) => [libelleProfil(g.profil), fmt(l.longueur), fmt(l.quantite), l.origine, ...(consigne ? [choixChute(chutesPDF, l).note] : [])]),
        [`Total ${libelleProfil(g.profil)}`, `${fmt(g.totalMm / 1000, 2)} m linéaires réutilisables`, "", "", ...(consigne ? [""] : [])],
      ]),
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: themeRgb("pdf-table-head"), textColor: themeRgb("pdf-heading"), fontStyle: "bold" },
      columnStyles: { 0: { halign: "left" }, 1: { halign: "right", cellWidth: consigne ? 30 : 44 }, 2: { halign: "right", cellWidth: 20 }, 3: { halign: "left" }, ...(consigne ? { 4: { halign: "left" as const, cellWidth: 55 } } : {}) },
      didParseCell: (data) => {
        if (data.section === "body" && String(data.row.raw && (data.row.raw as string[])[0]).startsWith("Total ")) {
          data.cell.styles.fontStyle = "bold";
          if (data.column.index === 1) {
            doc.setFont("PlexSans", "bold"); doc.setFontSize(9);
            const disponible = (consigne ? 30 : 44) - 4;
            const complet = String((data.row.raw as string[])[1]);
            const texte = doc.getTextWidth(complet) <= disponible ? complet : complet.replace("m linéaires réutilisables", "m réutilisables");
            data.cell.text = [texte];
            data.cell.styles.fontSize = Math.min(9, 9 * disponible / Math.max(doc.getTextWidth(texte), 1));
          }
        }
      },
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error lastAutoTable
    y = doc.lastAutoTable.finalY + 6;
  }

  // ---- Récapitulatif des pièces demandées ----
  const piecesValides = pieces.filter((p) => p.quantite > 0 && p.longueur > 0);
  if (piecesValides.length > 0) {
    // Keep the section title with the header and at least three table rows.
    if (y + 12 + Math.min(piecesValides.length + 1, 4) * 9 > pageHeight - margin) { doc.addPage(); y = margin; }
    doc.setFontSize(11);
    doc.setFont("PlexSans", "bold");
    doc.setTextColor(...themeRgb("piece-ink"));
    doc.text("Récapitulatif des pièces demandées", margin, y);
    y += 3;
    const totalPieces = piecesValides.reduce((s, p) => s + p.quantite, 0);
    autoTable(doc, {
      startY: y,
      head: [["Repère", "Profilé", "Longueur (mm)", "Quantité requise"]],
      body: piecesValides.map((p) => [p.nom, (p.profil ?? "").trim() || "—", `${fmt(p.longueur)}`, `${fmt(p.quantite)}`]),
      foot: [["Total", "", "", `${fmt(totalPieces)}`]],
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
        1: { cellWidth: 36, halign: "left" },
        2: { cellWidth: 30, halign: "right" },
        3: { cellWidth: 30, halign: "right" },
      },
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error lastAutoTable
    y = doc.lastAutoTable.finalY + 10;
  }


  for (const rp of resultat.profils) {
  const groupes = grouperBarresIdentiques(rp.resultat.barres);
  const premiere = groupes[0]?.reference;
  const hauteurPremierGroupe = premiere
    ? Math.min(70 + grouperCoupesConsecutives(premiere.coupes, traitScie).length * 10 + Math.max(0, dessinBarrePDF(doc, premiere, traitScie, pieceIds, pageWidth - 2 * margin).hauteur - 20), pageHeight - 2 * margin - 9)
    : 0;
  if (y + 9 + hauteurPremierGroupe > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }
  doc.setFillColor(...themeRgb("pdf-heading"));
  doc.rect(margin, y - 4.5, pageWidth - 2 * margin, 7, "F");
  doc.setTextColor(...themeRgb("cut-separator"));
  doc.setFont("PlexSans", "bold");
  doc.setFontSize(10);
   doc.text(`PROFILÉ : ${libelleProfil(rp.profil).toUpperCase()}`, margin + 2, y);
  doc.text(`Barre ${fmt(rp.longueurBarre)} mm  ·  Sous-total : ${fmt(rp.resultat.nbBarres)} barre(s)`, pageWidth - margin - 2, y, { align: "right" });
  y += 9;

  for (const g of groupes) {
    const barre = g.reference;
    const qte = g.barres.length;

    const nbGroupes = grouperCoupesConsecutives(barre.coupes, traitScie).length;
    const choix = choixBarre(chutesPDF, barre);
    const aConserver = consigne && barre.chuteReutilisable && choix.conserver;
    const dessin = dessinBarrePDF(doc, barre, traitScie, pieceIds, pageWidth - 2 * margin, aConserver, sansTypes, methodeCoupe);
    doc.setFont("PlexSans", "bold"); doc.setFontSize(9);
    const consigneLignes: string[] = aConserver ? doc.splitTextToSize(`À CONSERVER - NE PAS JETER${choix.note.trim() ? ` — ${choix.note.trim()}` : ""}`, pageWidth - 2 * margin) : [];
    // Long tables must span pages; keep the profile heading with its first drawing.
    const hauteurEstimee = Math.min(70 + nbGroupes * 10 + Math.max(0, dessin.hauteur - 20) + consigneLignes.length * 4, pageHeight - 2 * margin - 9);
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
      doc.text(`x ${fmt(qte)}`, pageWidth - margin, y, {
        align: "right",
      });
    }
    y += 5;

    doc.setFontSize(9);
    doc.setFont("PlexSans", "normal");
    doc.setTextColor(...themeRgb("pdf-muted"));
    const brutInfo =
      barre.longueurBrute !== barre.longueurBarre
        ? ` (barre ${fmt(barre.longueurBrute)} mm)`
        : "";
    doc.text(
      `Longueur utile : ${fmt(barre.longueurBarre)} mm${brutInfo}  |  ${fmt(barre.coupes.length)} coupe(s) par barre`,
      margin,
      y,
    );
    y += 4;
    if (methodeCoupe === "ruban") {
      doc.setFont("PlexSans", "bold"); doc.setTextColor(...themeRgb("piece-ink"));
      doc.text(RAPPEL_RUBAN, margin, y);
      doc.setFont("PlexSans", "normal");
      y += 4;
    }

    const margeDebut = barre.margeDebut ?? 0;
    const margeFin = barre.margeFin ?? 0;
    const coupesGroupes = grouperCoupesConsecutives(barre.coupes, traitScie, margeDebut);
    const svg = new DOMParser().parseFromString(dessin.source, "image/svg+xml").documentElement;
    await svg2pdf(svg, doc, { x: margin, y, width: pageWidth - 2 * margin, height: dessin.hauteur });
    y += dessin.hauteur + 6;

    doc.setTextColor(...themeRgb("piece-ink"));
    doc.setFont("PlexSans", "bold");
    doc.setFontSize(9);
    doc.text(`Chute finale : ${fmt(barre.chute)} mm${sansTypes ? "" : barre.chuteReutilisable ? aConserver ? ` — À conserver - ${libelleProfil(barre.profil)}` : consigne ? " — Non retenue" : " — Conservable" : " — Déchet"}`, margin, y);
    y += 4;
    if (aConserver) {
      doc.setTextColor(...themeRgb("pdf-print-ink"));
      for (const ligne of consigneLignes) {
        if (y + 4 > pageHeight - margin) { doc.addPage(); y = margin; }
        doc.text(ligne, margin, y); y += 4;
      }
      y += 2;
      doc.setTextColor(...themeRgb("piece-ink"));
    }

    doc.setFont("PlexSans", "normal");
    doc.setFontSize(8);
    doc.text(`Marge début : ${fmt(margeDebut)} mm | Marge fin : ${fmt(margeFin)} mm`, margin, y);
    y += 4;
    doc.text("Cotes mesurées depuis l’extrémité brute de la barre", margin, y);
    y += 5;

    doc.setFont("PlexSans", "normal");
    const body: string[][] = coupesGroupes.map((c, i) => [
      `${fmt(i + 1)}`,
      c.nom,
      `${fmt(c.longueur)} mm`,
      `${fmt(c.quantite)}`,
      lignesReperes(c.reperes, methodeCoupe).join("\n"),
    ]);
    autoTable(doc, {
      startY: y,
      head: [["#", "Pièce", "Longueur de coupe", "Quantité", "Repère cumulé (mm)"]],
      didParseCell: ({ cell, column, section }) => {
        if (column.index !== 4) return;
        doc.setFont("PlexSans", section === "head" ? "bold" : "normal");
        doc.setFontSize(9);
        const lignes = section === "head" ? [cell.text.join(" ")] : cell.text;
        cell.text = lignes;
        const width = Math.max(...lignes.map(t => doc.getTextWidth(t)));
        if (width > 76) cell.styles.fontSize = 9 * 76 / width;
      },
      body,
      theme: "striped",
      pageBreak: "avoid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: themeRgb("pdf-table-head"), textColor: themeRgb("pdf-heading") },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 12, halign: "right" },
        1: { cellWidth: 32 },
        2: { cellWidth: 36, halign: "right" },
        3: { cellWidth: 20, halign: "right" },
        4: { cellWidth: 80, halign: "right", overflow: "visible" },
      },
    });
    // @ts-expect-error
    y = doc.lastAutoTable.finalY + 8;
  }
  }

  if (consigne && chutesPDF.etiquettes && chutesProfils.length > 0) ajouterEtiquettes(doc, chutesProfils, chutesPDF, infos, date);

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("PlexSans", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...themeRgb("pdf-muted"));
    doc.text(`Page ${fmt(i)} / ${fmt(totalPages)}`, pageWidth - margin, pageHeight - 8, {
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
