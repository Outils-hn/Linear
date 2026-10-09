import { describe, expect, test } from "bun:test";
import { optimiser } from "./optimizer";
import { calculerReperes } from "./export-pdf";

const options = {
  longueurBarreBruteDefaut: 1000,
  longueurBarreUtileDefaut: 1000,
  margeSecurite: 0,
  traitScie: 5,
  strategie: "min-barres",
};
const pieces = (lengths) => lengths.map((longueur, i) => ({ id: String(i), nom: `P${i}`, longueur, quantite: 1 }));

describe("Comptabilité atelier sans changer les placements", () => {
  for (const modeUltra of [false, true]) {
    for (const strategie of ["min-barres", "priorite-stock"]) {
      test(`${strategie}, ultra=${modeUltra} : trait final et fermeture du bilan`, () => {
        for (const [lengths, traits, chute] of [
          [[500, 495], 5, 0],
          [[400], 5, 595],
          [[997], 3, 0],
          [[500, 490], 10, 0],
          [[1000], 0, 0],
        ]) {
          const r = optimiser(pieces(lengths), { ...options, modeUltra, strategie });
          expect(r.nbBarres).toBe(1);
          expect(r.barres[0].coupes.length).toBe(lengths.length);
          expect(r.longueurTraitsScie).toBe(traits);
          expect(r.longueurChutes).toBe(chute);
          expect(r.longueurTotale).toBeCloseTo(r.longueurUtile + r.longueurTraitsScie + r.longueurMarges + r.longueurChutes);
        }
      });
    }
  }
  test("marges aux trois positions et cotes brutes", () => {
    for (const [positionMarge, debut, fin] of [["debut", 100, 0], ["fin", 0, 100], ["deux-bouts", 50, 50]]) {
      const r = optimiser(pieces([400]), { ...options, longueurBarreUtileDefaut: 900, margeSecurite: 100, positionMarge });
      expect(r.barres[0].margeDebut).toBe(debut);
      expect(r.barres[0].margeFin).toBe(fin);
      expect(calculerReperes(r.barres[0].coupes, 5, debut)).toEqual([400 + debut]);
      expect(r.longueurTotale).toBe(r.longueurUtile + r.longueurTraitsScie + r.longueurMarges + r.longueurChutes);
    }
  });
  test("stock sans marge, seuil après trait final et rendement net", () => {
    const r = optimiser(pieces([400]), { ...options, strategie: "priorite-stock", margeSecurite: 100, stock: [{ id: "s", longueur: 1000, quantite: 1, appliquerMarge: false }] });
    expect(r.longueurMarges).toBe(0);
    expect(r.longueurChutesReutilisables).toBe(595);
    expect(r.rendement).toBe(40);
    expect(r.rendementHorsChutesReutilisables).toBeCloseTo(400 / 405 * 100);
    expect(optimiser(pieces([498]), options).longueurChutesReutilisables).toBe(0);
  });
  test("liste vide", () => {
    const r = optimiser([], options);
    expect(r.nbBarres).toBe(0);
    expect(r.longueurMarges).toBe(0);
    expect(r.longueurTraitsScie).toBe(0);
    expect(r.rendementHorsChutesReutilisables).toBe(0);
  });
});