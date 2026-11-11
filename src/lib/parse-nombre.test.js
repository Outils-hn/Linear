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
  test("nombres collés d'Excel ambigus : lus correctement ou refusés, jamais devinés", () => {
    expect(parseLongueur("1.250,5")).toBe(1250.5);
    expect(parseLongueur("1,250.5")).toBe(1250.5);
    expect(parseLongueur("1'250,5")).toBe(1250.5);
    expect(parseLongueur("12..5")).toBeNaN();
    expect(parseLongueur("1,2,3")).toBeNaN();
    expect(parseLongueur("1.250,5,2")).toBeNaN();
    expect(parseNombre("1.250,5")).toBe(1250.5);
    expect(parseNombre("1,2,3")).toBeNaN();
    expect(parseQuantite("1,2,3")).toBeNaN();
  });
});

describe("collage Excel : codes et unites de quantite", () => {
  test("un code comme « E04 » n'est pas un nombre", () => {
    expect(parseLongueur("E04")).toBeNaN();
    expect(parseQuantite("E04")).toBeNaN();
  });
  test("« 103 Pces » est une quantite, pas une longueur", () => {
    expect(parseQuantite("103 Pces")).toBe(103);
    expect(parseQuantite("8 Pces")).toBe(8);
    expect(parseLongueur("103 Pces")).toBeNaN();
  });
});
