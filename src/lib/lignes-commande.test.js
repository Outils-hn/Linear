import { expect, test } from "bun:test";
import { optimiserParProfil, lignesCommande, longueurDuStock, texteStock } from "./multi-profil";

const opts = (strategie) => ({ longueurBarreDefaut: 6000, margeSecurite: 100, positionMarge: "debut", traitScie: 3, strategie,
  stock: [{ id: "s1", longueur: 4200, quantite: 3 }, { id: "s2", longueur: 1500, quantite: 2 }] });
const pieces = [["Montant", 2450, 12, "A"], ["Traverse", 1180, 18, "A"], ["Renfort", 437.5, 10, "A"], ["Lisse", 3125, 6, "B"], ["Cale", 260, 20, "B"]]
  .map(([nom, longueur, quantite, profil], i) => ({ id: String(i), nom, longueur, quantite, profil }));

test("priorite stock : les barres du stock ne sont pas a commander", () => {
  const r = optimiserParProfil(pieces, {}, opts("priorite-stock"));
  const lignes = lignesCommande(r, 6000);
  const a = lignes.find((l) => l.profil === "A");
  expect(a.stock).toBeGreaterThan(0);
  // barres neuves + stock = toutes les barres du profile
  expect(a.nb + a.stock).toBe(r.profils.find((p) => p.profil === "A").resultat.nbBarres);
  expect(lignes.reduce((s, l) => s + l.nb, 0)).toBe(r.nbBarresDefaut);
  expect(longueurDuStock(r)).toBe(r.barres.filter((b) => b.origine === "stock").reduce((s, b) => s + b.longueurBrute, 0));
});

test("sans stock : tout est a commander", () => {
  const r = optimiserParProfil(pieces, {}, opts("min-barres"));
  const lignes = lignesCommande(r, 6000);
  expect(lignes.map((l) => [l.profil, l.nb, l.stock])).toEqual([["A", 11, 0], ["B", 6, 0]]);
  expect(longueurDuStock(r)).toBe(0);
});

test("texte du stock", () => {
  expect(texteStock(0)).toBe("");
  expect(texteStock(1)).toBe("+ 1 barre ou chute prise dans le stock");
  expect(texteStock(5)).toBe("+ 5 barres ou chutes prises dans le stock");
});
