import { __createTable, __drawTable, type UserOptions } from "jspdf-autotable";
import type { jsPDF } from "jspdf";
import { nombreLignesPage } from "./bar-drawing";
import { themeRgb } from "./visual-theme";

export function tableauAtelier(doc: jsPDF, options: UserOptions) {
  const margin = 15;
  const bottom = doc.internal.pageSize.getHeight() - margin;
  const table = __createTable(doc, {
    ...options,
    styles: { cellPadding: { top: 2.4, bottom: 2.4, left: 2, right: 2 }, minCellHeight: 8, ...options.styles, font: "PlexSans", textColor: themeRgb("piece-ink") },
    headStyles: { ...options.headStyles, font: "PlexSans", fontStyle: "bold", textColor: themeRgb("piece-ink") },
    footStyles: { ...options.footStyles, font: "PlexSans" },
    alternateRowStyles: { fillColor: themeRgb("pdf-table-stripe") },
    didParseCell: data => {
      options.didParseCell?.(data);
      data.cell.styles.font = "PlexSans";
      data.cell.styles.halign = options.columnStyles?.[data.column.dataKey]?.halign ?? options.styles?.halign ?? "left";
      if (data.section === "head") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = themeRgb("piece-ink");
      }
    },
    rowPageBreak: "avoid", showFoot: "lastPage",
  });
  const headHeight = table.getHeadHeight(table.columns);
  const footHeight = table.getFootHeight(table.columns);
  const rows = [...table.body];
  let startY = typeof options.startY === "number" ? options.startY : margin;
  if (!rows.length) { __drawTable(doc, table); return; }
  while (rows.length) {
    const heights = rows.map(row => row.height);
    // Reserve footer space conservatively, so no automatic table split can occur.
    let count = nombreLignesPage(heights, bottom - startY - headHeight - footHeight - 0.5);
    if (!count) {
      doc.addPage();
      startY = margin;
      count = nombreLignesPage(heights, bottom - startY - headHeight - footHeight - 0.5);
    }
    if (!count) {
      // Exceptionally tall cells: shrink only this table until a legal group fits.
      const size = options.styles?.fontSize ?? 9;
      if (size > 4) {
        tableauAtelier(doc, { ...options, body: rows.map(row => table.columns.map(column => row.cells[column.index]?.text.join("\n") ?? "")), startY, styles: { ...options.styles, fontSize: size - 1 } });
        return;
      }
      throw new Error("Le tableau contient des lignes trop hautes pour une page A4.");
    }
    const chunk = Object.assign(Object.create(Object.getPrototypeOf(table)), table);
    chunk.body = rows.splice(0, count);
    chunk.foot = rows.length ? [] : table.foot;
    chunk.settings = { ...table.settings, startY, pageBreak: "auto", rowPageBreak: "avoid" };
    __drawTable(doc, chunk);
    if (rows.length) { doc.addPage(); startY = margin; }
  }
}