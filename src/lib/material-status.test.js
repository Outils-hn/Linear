import { expect, test } from "bun:test";
import { lireStatutMatiere, libelleStatutMatiere, detailsCommande } from "./material-status";
import { lireJson, FORMAT_VERSION } from "./backup";
import { upsertProject, listProjects } from "./local-store";

test("statut matière : défaut sûr et détails facultatifs", () => {
  expect(libelleStatutMatiere(lireStatutMatiere())).toBe("Barres à commander");
  expect(lireStatutMatiere({ statut: "invalide", fournisseur: 42 }).statut).toBe("a-commander");
  const commande = lireStatutMatiere({ statut: "commandee", dateCommande: "2026-10-10", fournisseur: " Acier Nord ", numeroCommande: " C123 " });
  expect(libelleStatutMatiere(commande)).toBe("Barres commandées");
  expect(detailsCommande(commande)).toBe("commande du 10/10/2026, Acier Nord, n° C123");
  expect(detailsCommande({ ...commande, statut: "disponible" })).toBe("");
  expect(libelleStatutMatiere({ ...commande, statut: "disponible" })).toBe("Barres à prendre en stock");
  expect(detailsCommande(lireStatutMatiere({ statut: "commandee", numeroCommande: "C123" }))).toBe("n° C123");
  expect(detailsCommande(lireStatutMatiere({ statut: "commandee" }))).toBe("");
});

test("trois statuts conservés dans le stockage existant et les deux formats JSON", () => {
  const original = globalThis.window;
  const storage = new Map();
  globalThis.window = { localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) } };
  try {
    for (const statut of ["a-commander", "commandee", "disponible"]) {
      const statut_matiere = lireStatutMatiere({ statut, dateCommande: "2026-10-10", fournisseur: "Acier Nord", numeroCommande: "C123" });
      const projet = upsertProject("QA", { chantier: statut, longueur_barre: 6000, pieces: [], stock: [], statut_matiere });
      expect(listProjects("QA").find(p => p.id === projet.id).statut_matiere).toEqual(statut_matiere);
      expect(storage.has("linear:projects:v1:QA")).toBe(true);
      for (const data of [{ format: "linear-projet", projet }, { format: "linear-sauvegarde", projets: [projet] }]) {
        expect(lireJson(JSON.stringify({ ...data, version: FORMAT_VERSION }))[0].statut_matiere).toEqual(statut_matiere);
      }
    }
    expect(lireJson(JSON.stringify({ format: "linear-projet", version: 1, projet: { longueur_barre: 6000, pieces: [] } }))[0].statut_matiere).toEqual(lireStatutMatiere());
  } finally {
    if (original === undefined) delete globalThis.window;
    else globalThis.window = original;
  }
});