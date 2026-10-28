import { expect, test } from "bun:test";
import { empreinteCalcul, lireProjetCourant } from "./projet-courant";

const base = {
  pieces: [{ id: "p1", nom: "Montant", longueur: 2450, quantite: 12 }],
  stock: [{ id: "s1", longueur: 4200, quantite: 2 }],
  longueurBarre: 6000, margeSecurite: 100, traitScie: 3, strategie: "min-barres",
  longueursProfils: {}, seuilsProfils: {}, seuilChute: 500,
};

test("projet en cours : relu tel quel, ou ignore s'il est abime", () => {
  const p = { projetId: "x", chantier: "Démo", numeroTache: "T-01", client: "", dateProjet: "2026-10-28", pieces: base.pieces, stock: base.stock, longueursProfils: { A: 6500 }, seuilsProfils: {} };
  expect(lireProjetCourant(JSON.stringify(p))).toMatchObject(p);
  expect(lireProjetCourant(null)).toBeNull();
  expect(lireProjetCourant("{abime")).toBeNull();
  expect(lireProjetCourant(JSON.stringify({ chantier: "sans pieces" }))).toBeNull();
});

test("empreinte : change avec une quantite, pas avec le stock en strategie minimum de barres", () => {
  const e = empreinteCalcul(base);
  expect(empreinteCalcul({ ...base, pieces: [{ ...base.pieces[0], quantite: 40 }] })).not.toBe(e);
  expect(empreinteCalcul({ ...base, stock: [] })).toBe(e);
  expect(empreinteCalcul({ ...base, strategie: "priorite-stock", stock: [] })).not.toBe(empreinteCalcul({ ...base, strategie: "priorite-stock" }));
});
