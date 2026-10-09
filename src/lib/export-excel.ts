import type { Piece, ResultatOptimisation } from "@/lib/optimizer";
import type { ResultatMulti } from "@/lib/multi-profil";
import { chutesAConserver } from "@/lib/chutes";

// Nombre au format Excel français : virgule décimale, sans unité
function numFR(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n).replace(".", ",");
}

export function lignesPieces(pieces: Piece[]): string[][] {
  return [
    ["Repère", "Longueur (mm)", "Quantité", "Profilé"],
    ...pieces.map((p) => [p.nom, numFR(p.longueur), String(p.quantite), (p.profil ?? "").trim()]),
  ];
}

export function texteTSV(pieces: Piece[]): string {
  return lignesPieces(pieces)
    .map((l) => l.join("\t"))
    .join("\n");
}

export async function copierPourExcel(pieces: Piece[]): Promise<number> {
  const tsv = texteTSV(pieces);
  await navigator.clipboard.writeText(tsv);
  return pieces.length;
}

export async function telechargerExcel(
  pieces: Piece[],
  resultat: ResultatOptimisation | null,
  infos: { chantier?: string; numeroTache?: string; date?: string } = {},
): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const wsPieces = XLSX.utils.aoa_to_sheet(lignesPieces(pieces));
  wsPieces["!cols"] = [{ wch: 24 }, { wch: 14 }, { wch: 10 }, { wch: 18 }];
  for (const ref of ["A1", "B1", "C1", "D1"]) {
    if (wsPieces[ref]) wsPieces[ref].s = { font: { bold: true } };
  }
  XLSX.utils.book_append_sheet(wb, wsPieces, "Pieces");

  if (resultat && resultat.nbBarres > 0) {
    const rows: (string | number)[][] = [
      ["Profilé", "Barre n°", "Longueur de barre (mm)", "Pièces coupées", "Chute (mm)", "Utilisation (%)"],
    ];
    for (const b of resultat.barres) {
      const coupes = b.coupes.map((c) => `${c.nom ? c.nom + " " : ""}${c.longueur}`).join(" + ");
      const utilisation = b.longueurBarre > 0 ? (b.longueurUtilisee / b.longueurBarre) * 100 : 0;
      rows.push([(b.profil ?? "").trim(), b.index, b.longueurBrute, coupes, b.chute, Math.round(utilisation * 10) / 10]);
    }
    const wsRes = XLSX.utils.aoa_to_sheet(rows);
    wsRes["!cols"] = [{ wch: 18 }, { wch: 9 }, { wch: 22 }, { wch: 60 }, { wch: 11 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsRes, "Resultats");

    if ("profils" in resultat) {
      const chutes: (string | number)[][] = [["Profilé", "Longueur (mm)", "Quantité", "Chantier", "Numéro de tâche", "Date"]];
      for (const g of chutesAConserver(resultat as ResultatMulti)) {
        for (const l of g.lignes) {
          chutes.push([g.profil, l.longueur, l.quantite, infos.chantier?.trim() ?? "", infos.numeroTache?.trim() ?? "", infos.date ?? ""]);
        }
      }
      const wsCh = XLSX.utils.aoa_to_sheet(chutes);
      wsCh["!cols"] = [{ wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 24 }, { wch: 16 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsCh, "Chutes reutilisables");
    }
  }

  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  XLSX.writeFile(wb, `Linear_${stamp}.xlsx`);
}
