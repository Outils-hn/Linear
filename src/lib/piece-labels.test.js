import { describe, expect, test } from "bun:test";
import { etiquettesPieces } from "./piece-labels";

const piece = (nom, debut, longueur, pieceId = nom) => ({ type: "piece", nom, debut, fin: debut + longueur, longueur, pieceId });
const measure = (text, size) => text.length * size * 0.5;
const layout = (segments, width = 100, height = 36) => etiquettesPieces(segments, n => n, width, height, measure);

describe("Étiquettes adaptatives sans changement des coupes", () => {
  test("cascade complète, deux lignes, longueur, réduction, référence", () => {
    expect(layout([piece("A", 0, 100)])[0].lignes).toEqual(["A · 100 mm"]);
    expect(layout([piece("Montant", 0, 60)])[0].lignes).toEqual(["Montant", "60"]);
    expect(layout([piece("Montant trop long", 0, 30)])[0].lignes).toEqual(["30"]);
    const reduced = layout([piece("Montant", 0, 18)])[0];
    expect(reduced.lignes).toEqual(["18"]);
    expect(reduced.taille).toBeLessThan(12);
    expect(reduced.taille).toBeGreaterThanOrEqual(8);
    expect(layout([piece("A", 0, 9)])[0].lignes).toEqual([]);
  });
  test("groupes consécutifs et numéro de ligne du tableau", () => {
    const cuts = [piece("Renfort C", 0, 45), piece("Renfort C", 48, 45), piece("Renfort C", 96, 45), piece("Renfort C", 144, 45), piece("B", 192, 9)];
    const before = JSON.stringify(cuts);
    const labels = layout(cuts, 220);
    expect(labels[0].lignes).toEqual(["Renfort C · 4 x 45"]);
    expect(labels[1].ligneTableau).toBe(2);
    expect(JSON.stringify(cuts)).toBe(before);
  });
  test("chaque texte tient dans les marges, même à travers une zone de zoom", () => {
    for (let width = 1; width < 200; width++) {
      const labels = etiquettesPieces([piece("Très long repère", 0, 1200)], n => n / 1200 * width - 3, width, 36, measure);
      for (const label of labels) for (const line of label.lignes) expect(measure(line, label.taille)).toBeLessThanOrEqual(label.droite - label.gauche - 8);
    }
    expect(layout([piece("Montant", 0, 60)], 100, 20)[0].lignes).toEqual(["60"]);
  });
  test("un seul renvoi centré par série de petites pièces", () => {
    const cuts = [piece("A", 0, 9), piece("A", 12, 9), piece("A", 24, 9), piece("B", 36, 9), piece("A", 48, 9)];
    const labels = layout(cuts);
    const refs = labels.filter(l => !l.lignes.length);
    expect(refs.map(l => l.ligneTableau)).toEqual([1, 2, 3]);
    expect([refs[0].gauche, refs[0].droite]).toEqual([0, 33]);
  });
});