import { expect, test } from "bun:test";
import { normaliserReglages, REGLAGES_DEFAUT } from "./reglages";

test("reglages absents ou abimes : valeurs par defaut", () => {
  expect(normaliserReglages(null)).toEqual(REGLAGES_DEFAUT);
  expect(normaliserReglages({ longueurBarre: 0, traitScie: -2, strategie: "n'importe" })).toEqual(REGLAGES_DEFAUT);
});

test("reglages valides : gardes tels quels", () => {
  const r = { longueurBarre: 6500, margeSecurite: 0, positionMarge: "deux-bouts", traitScie: 4, seuilChute: 300, methodeCoupe: "ruban", strategie: "priorite-stock" };
  expect(normaliserReglages(r)).toEqual(r);
});
