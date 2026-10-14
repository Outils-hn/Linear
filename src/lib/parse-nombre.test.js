import { describe, expect, test } from "bun:test";
import { LONGUEUR_SUSPECTE, parseLongueur, parseNombre, parseQuantite } from "./parse-nombre";

describe("collage Excel : separateurs de milliers", () => {
  test("apostrophes suisses et espaces", () => {
    for (const s of ["1'250", "1’250", "1‘250", "1 250", "1 250", "1 250"]) expect(parseLongueur(s)).toBe(1250);
  });
  test("virgule decimale et unites conservees", () => {
    expect(parseLongueur("1250,5")).toBe(1250.5);
    expect(parseLongueur("2.450 m")).toBe(2450);
    expect(parseLongueur("12'500 mm")).toBe(12500);
    expect(parseNombre("3'000")).toBe(3000);
  });
  test("quantites avec separateur", () => {
    expect(parseQuantite("1'200 pces")).toBe(1200);
  });
  test("seuil de longueur suspecte", () => {
    expect(LONGUEUR_SUSPECTE).toBe(10);
  });
});
