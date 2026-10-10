import { expect, test } from "bun:test";
import { cotesPiecesSeulesPDF } from "./bar-svg-pdf";

test("PDF : une pièce finale trop proche ne remplace pas la cote de l’accolade", () => {
  const series = [{ fin: 4909, quantite: 4 }, { fin: 5712, quantite: 1 }, { fin: 5924, quantite: 4 }, { fin: 5977, quantite: 1 }];
  const avant = JSON.stringify(series);
  const cotes = cotesPiecesSeulesPDF(series, n => n / 6000 * 180, 180, () => 7, [{ labelX: 176, largeur: 12 }]);
  expect(cotes.map(c => c.valeur)).toEqual([]);
  expect(JSON.stringify(series)).toBe(avant);
});

test("PDF : cote de pièce seule à sa position exacte uniquement si elle tient", () => {
  const cotes = cotesPiecesSeulesPDF([{ fin: 800, quantite: 1 }, { fin: 1000, quantite: 1 }], n => n / 10, 100, () => 10, []);
  expect(cotes.map(c => [c.valeur, c.x, c.labelX])).toEqual([[800, 80, 80]]);
});