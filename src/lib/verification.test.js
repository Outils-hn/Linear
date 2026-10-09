import { describe, expect, test } from "bun:test";
import { optimiserParProfil } from "./multi-profil";
import { verifierResultat } from "./verification";

const pieces = [
  { id: "a", nom: "A", longueur: 1200, quantite: 4 },
  { id: "b", nom: "B", longueur: 800, quantite: 6 },
  { id: "c", nom: "C", longueur: 450, quantite: 8 },
];
describe("verification", () => {
  for (const modeUltra of [false, true]) for (const strategie of ["min-barres", "priorite-stock"])
  test(`cas atelier ${strategie} ultra=${modeUltra}`, () => {
    const r = optimiserParProfil(pieces, {}, { longueurBarreDefaut: 6000, margeSecurite: 100, positionMarge: "debut", traitScie: 3, strategie, stock: [], modeUltra });
    expect(r.nbBarres).toBe(3);
    expect([r.longueurTotale, r.longueurUtile, r.longueurTraitsScie, r.longueurMarges, r.longueurChutes]).toEqual([18000, 13200, 54, 300, 4446]);
    const v = verifierResultat(r, pieces, { traitScie: 3, positionMarge: "debut" });
    expect(v.problemes).toEqual([]);
    r.barres[0].chute += 1;
    r.barres[0].coupes.pop();
    expect(verifierResultat(r, pieces, { traitScie: 3, positionMarge: "debut" }).ok).toBe(false);
  });
});
