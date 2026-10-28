import { test, expect } from "bun:test";
import { cotesFinSeries } from "./bar-drawing";
import { seriesPieces, lignesReperes } from "./cut-method";

test("fins de séries uniquement, sans mutation des pièces ni du tableau", () => {
  const pieces = [
    { pieceId: "A", longueur: 1200, debut: 100, fin: 1300 },
    { pieceId: "A", longueur: 1200, debut: 1303, fin: 2503 },
    { pieceId: "B", longueur: 800, debut: 2506, fin: 3306 },
    { pieceId: "A", longueur: 1200, debut: 3309, fin: 4509 },
  ];
  const before = JSON.stringify(pieces);
  expect(cotesFinSeries(seriesPieces(pieces), n => n / 10, 600, t => t.length * 5).map(c => c.valeur)).toEqual([2503, 3306, 4509]);
  expect(JSON.stringify(pieces)).toBe(before);
  expect(lignesReperes([1300, 2503], "ruban")).toEqual(["1'300 / 2'503"]);
});

test("collision : priorité à la cote la plus à droite sur une seule rangée", () => {
  const result = cotesFinSeries([100, 105, 110, 500, 501].map(fin => ({ fin })), n => n, 510, () => 30);
  expect(result.map(c => c.valeur)).toEqual([110, 501]);
  expect(result.every(c => c.niveau === 0)).toBe(true);
  expect(cotesFinSeries([{fin:10}], n => n, 5, () => 30)).toEqual([]);
});