import { expect, test } from "bun:test";
import { raisonRefus } from "./controle-saisie";

test("valeurs normales acceptees", () => {
  expect(raisonRefus("longueur", 437.5)).toBeNull();
  expect(raisonRefus("quantite", 12)).toBeNull();
  expect(raisonRefus("marge", 0)).toBeNull();
  expect(raisonRefus("trait", 3)).toBeNull();
  expect(raisonRefus("seuil", 500)).toBeNull();
});

test("valeurs absurdes refusees avec une raison", () => {
  expect(raisonRefus("longueur", 0)).toMatch(/supérieure à 0/);
  expect(raisonRefus("longueur", 0.4)).toMatch(/au moins 1 mm/);
  expect(raisonRefus("quantite", 2.5)).toMatch(/entier/);
  expect(raisonRefus("quantite", -3)).toMatch(/au moins 1/);
  expect(raisonRefus("marge", -500)).toMatch(/négative/);
  expect(raisonRefus("trait", -20)).toMatch(/négative/);
  expect(raisonRefus("trait", 45)).toMatch(/dépasse/);
  expect(raisonRefus("longueur", 1200, true)).toBe("est vide");
});
