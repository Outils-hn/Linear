import { test, expect } from "bun:test";
import { chercherFiches, lienFiche } from "./index-fiches";

const F = [
  { id: "1", name: "Sikaflex-11 FC+", supplier: "Sika", category: "Colles & Mastics" },
  { id: "2", name: "Profilé alu 50x50", supplier: "Alu Menziken", category: "Profilés & Accessoires" },
  { id: "3", name: "Membrane EPDM", supplier: "Würth", category: "Membranes & Étanchéité" },
];

test("liens vers Index : recherche mot par mot, sans accents", () => {
  expect(chercherFiches(F, "profile 50").map((f) => f.id)).toEqual(["2"]);
  expect(chercherFiches(F, "etancheite").map((f) => f.id)).toEqual(["3"]);
});
test("liens vers Index : lien direct", () => expect(lienFiche("x")).toBe("https://index-hn.lovable.app/?fiche=x"));
