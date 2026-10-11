import { expect, test } from "bun:test";
import { optimiserParProfil } from "./multi-profil.ts";
import { verifierResultat } from "./verification.ts";

// Avant : au-dela de 8 longueurs distinctes, SmartCut retombait sur le BFD simple (13 barres).
test("SmartCut atteint l'optimum avec plus de 8 longueurs distinctes", () => {
  const donnees = [[3641, 3], [3602, 2], [1218, 3], [3573, 1], [2674, 2], [1783, 2], [1176, 6], [1585, 5], [3137, 6]];
  const pieces = donnees.map(([longueur, quantite], i) => ({ id: `p${i}`, nom: `P${i}`, longueur, quantite }));
  const r = optimiserParProfil(pieces, {}, {
    longueurBarreDefaut: 6000, margeSecurite: 0, positionMarge: "debut", traitScie: 3, strategie: "min-barres", stock: [],
  });
  expect(r.borneMin).toBe(12);
  expect(r.nbBarres).toBe(12);
  expect(r.optimal).toBe(true);
  expect(verifierResultat(r, pieces, { traitScie: 3, positionMarge: "debut" }).ok).toBe(true);
});
