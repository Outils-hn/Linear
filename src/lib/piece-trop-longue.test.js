import { expect, test } from "bun:test";
import { piecesTropLongues } from "./multi-profil.ts";

const opts = { longueurBarreDefaut: 6000, margeSecurite: 100, stock: [] };

test("signale une piece plus longue que la barre utile", () => {
  const pieces = [
    { id: "a", nom: "Montant X", longueur: 6500, quantite: 1 },
    { id: "b", nom: "OK", longueur: 5900, quantite: 2 },
  ];
  expect(piecesTropLongues(pieces, {}, opts)).toEqual([
    { id: "a", nom: "Montant X", longueur: 6500, profil: "", longueurUtile: 5900 },
  ]);
});

test("utilise la longueur de barre propre a chaque profile", () => {
  const pieces = [
    { id: "a", nom: "A", longueur: 6500, quantite: 1, profil: "Equerre" },
    { id: "b", nom: "B", longueur: 6500, quantite: 1, profil: "CREA" },
  ];
  const r = piecesTropLongues(pieces, { Equerre: 7000 }, opts);
  expect(r.map((p) => p.id)).toEqual(["b"]);
});

test("une barre de stock plus longue rend la piece placable", () => {
  const pieces = [{ id: "a", nom: "A", longueur: 6500, quantite: 1 }];
  const stock = [{ id: "s", longueur: 7000, quantite: 1 }];
  expect(piecesTropLongues(pieces, {}, { ...opts, stock })).toEqual([]);
});

test("ignore les champs vides ou a 0 (deja bloques ailleurs)", () => {
  const pieces = [{ id: "a", nom: "A", longueur: 0, quantite: 1 }, { id: "b", nom: "B", longueur: 9000, quantite: 0 }];
  expect(piecesTropLongues(pieces, {}, opts)).toEqual([]);
});
