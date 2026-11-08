import { expect, test } from "bun:test";
import { optimiserParProfil, MAX_LONGUEURS_ULTRA } from "./multi-profil";

const opts = { longueurBarreDefaut: 6000, margeSecurite: 0, traitScie: 3, strategie: "min-barres", seuilChuteReutilisable: 500, stock: [] };
const pieces = (n) => Array.from({ length: n }, (_, k) => ({ id: "p" + k, nom: "p" + k, longueur: 200 + ((k * 137) % 3000), quantite: 3 }));

test("150 longueurs différentes : le calcul aboutit sans mode Ultra", () => {
  const r = optimiserParProfil(pieces(150), {}, opts);
  expect(r.nbBarres).toBeGreaterThan(0);
  expect(r.profils.every((p) => !p.smartCut)).toBe(true);
});

test("le plafond d'Ultra est bien en dessous de la zone dangereuse", () => {
  expect(MAX_LONGUEURS_ULTRA).toBeLessThanOrEqual(60);
});
