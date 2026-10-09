import { test, expect } from "bun:test";
import { optimiserParProfil } from "./multi-profil.ts";
test("cas", () => {
  const pieces=[{id:"a",nom:"A",longueur:2647,quantite:1},{id:"b",nom:"B",longueur:2117,quantite:2},{id:"c",nom:"C",longueur:1587,quantite:3}];
  const r=optimiserParProfil(pieces,{},{longueurBarreDefaut:6000,margeSecurite:100,positionMarge:"debut",traitScie:3,strategie:"min-barres",stock:[]});
  expect(r.nbBarres).toBe(2); expect(r.optimal).toBe(true); expect(r.borneMin).toBe(2);
});
