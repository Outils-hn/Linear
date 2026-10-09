import { expect, test } from "bun:test";
import { optimiserParProfil } from "./multi-profil";
import { bilanMatiere } from "./material-summary";

test("cas atelier : rendement, réutilisables et perte définitive", () => {
  const pieces = [1200, 800, 450].map((longueur, i) => ({ id: String(i), nom: `P${i}`, longueur, quantite: [4, 6, 8][i] }));
  const r = optimiserParProfil(pieces, {}, { longueurBarreDefaut: 6000, margeSecurite: 100, positionMarge: "debut", traitScie: 3, strategie: "min-barres" });
  const b = bilanMatiere(r);
  expect(r.nbBarres).toBe(3);
  expect(r.rendement).toBeCloseTo(73.33333);
  expect(r.longueurChutesReutilisables).toBe(4088);
  expect(b.perte).toBe(712);
  expect(b.parts.map(p => p.affiche)).toEqual([73.3, 22.7, 4]);
  expect(b.repartition).toBe("73,3 % pièces + 22,7 % chutes réutilisables + 4,0 % perte définitive = 100 %");
});

test("arrondis à 100 % et total nul", () => {
  for (const values of [[1, 1, 1], [2, 2, 3], [0, 10, 0]]) {
    const b = bilanMatiere({ longueurTotale: values.reduce((a, b) => a + b), longueurUtile: values[0], longueurChutesReutilisables: values[1], longueurDechets: values[2], longueurTraitsScie: 0, longueurMarges: 0 });
    expect(b.parts.reduce((s, p) => s + p.affiche, 0)).toBeCloseTo(100);
  }
  expect(bilanMatiere({ longueurTotale: 0, longueurUtile: 0, longueurChutesReutilisables: 0, longueurDechets: 0, longueurTraitsScie: 0, longueurMarges: 0 }).parts.every(p => p.pourcentage === 0)).toBe(true);
});