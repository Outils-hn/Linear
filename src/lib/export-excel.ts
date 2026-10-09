import type { Piece, ResultatOptimisation } from "@/lib/optimizer";

// Nombre au format Excel français : virgule décimale, sans unité
function numFR(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n).replace(".", ",");
}

export function lignesPieces(pieces: Piece[]): string[][] {
  return [
    ["Repère", "Longueur (mm)", "Quantité"],
    ...pieces.map((p) => [p.nom, numFR(p.longueur), String(p.quantite)]),
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

export async function telechargerExcel(pieces: Piece[], resultat: ResultatOptimisation | null): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const wsPieces = XLSX.utils.aoa_to_sheet(lignesPieces(pieces));
  wsPieces["!cols"] = [{ wch: 24 }, { wch: 14 }, { wch: 10 }];
  for (const ref of ["A1", "B1", "C1"]) {
    if (wsPieces[ref]) wsPieces[ref].s = { font: { bold: true } };
  }
  XLSX.utils.book_append_sheet(wb, wsPieces, "Pieces");

  if (resultat && resultat.nbBarres > 0) {
    const rows: (string | number)[][] = [
      ["Barre n°", "Longueur de barre (mm)", "Pièces coupées", "Chute (mm)", "Utilisation (%)"],
    ];
    for (const b of resultat.barres) {
      const coupes = b.coupes.map((c) => `${c.nom ? c.nom + " " : ""}${c.longueur}`).join(" + ");
      const utilisation = b.longueurBarre > 0 ? (b.longueurUtilisee / b.longueurBarre) * 100 : 0;
      rows.push([b.index, b.longueurBrute, coupes, b.chute, Math.round(utilisation * 10) / 10]);
    }
    const wsRes = XLSX.utils.aoa_to_sheet(rows);
    wsRes["!cols"] = [{ wch: 9 }, { wch: 22 }, { wch: 60 }, { wch: 11 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsRes, "Resultats");
  }

  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  XLSX.writeFile(wb, `Linear_${stamp}.xlsx`);
}
