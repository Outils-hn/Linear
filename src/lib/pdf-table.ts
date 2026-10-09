import { __createTable, __drawTable, type UserOptions } from "jspdf-autotable";
import type { jsPDF } from "jspdf";
import { nombreLignesPage } from "./bar-drawing";

export function tableauAtelier(doc: jsPDF, options: UserOptions) {
  const margin = 15;
  const bottom = doc.internal.pageSize.getHeight() - margin;
  const table = __createTable(doc, { ...options, rowPageBreak: "avoid", showFoot: "lastPage" });
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
        tableauAtelier(doc, { ...options, body: rows.map(row => row.raw), startY, styles: { ...options.styles, fontSize: size - 1 } });
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