import { expect, test } from "bun:test";
import { chantierAccueil } from "./chantier-accueil";

const lire = (v) => () => v;
test("chantier de l'Accueil : numero et nom, ou l'un des deux, ou rien", () => {
  expect(chantierAccueil(lire('{"numero":"24-118","nom":"Résidence Les Tilleuls"}'))).toBe("24-118 · Résidence Les Tilleuls");
  expect(chantierAccueil(lire('{"numero":"24-118"}'))).toBe("24-118");
  expect(chantierAccueil(lire(null))).toBe("");
  expect(chantierAccueil(lire("pas du json"))).toBe("");
});
