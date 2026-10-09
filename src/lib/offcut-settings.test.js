import { expect, test } from "bun:test";
import { optionsChutesDefaut, lireOptionsChutes, cleChute, choixChute, choixBarre, chutesSelectionnees } from "./offcut-settings";
import { chutesAConserver } from "./chutes";
import { optimiserParProfil } from "./multi-profil";
import { lireJson, FORMAT_VERSION } from "./backup";

test("options anciennes et invalides : indicatif, sans étiquettes et conservation par défaut", () => {
  expect(lireOptionsChutes(undefined)).toEqual(optionsChutesDefaut());
  expect(lireOptionsChutes({ mode: "invalid", choix: { a: { conserver: false, note: 42 } } })).toEqual({ mode: "indicative", etiquettes: false, choix: { a: { conserver: false, note: "" } } });
  expect(choixChute(optionsChutesDefaut(), { profil: "", longueur: 800 })).toEqual({ conserver: true, note: "" });
  expect(cleChute(" Acier ", 800)).toBe(cleChute("Acier", 800));
  expect(cleChute("Acier", 800)).not.toBe(cleChute("Alu", 800));
});

test("sélections par ligne : filtrage PDF sans mutation du résultat ni des totaux", () => {
  const pieces = [1200, 800, 450].map((longueur, i) => ({ id: String(i), nom: `P${i}`, longueur, quantite: [4, 6, 8][i] }));
  const r = optimiserParProfil(pieces, {}, { longueurBarreDefaut: 6000, margeSecurite: 100, positionMarge: "debut", traitScie: 3, strategie: "min-barres" });
  const avant = JSON.stringify(r);
  const groupes = chutesAConserver(r);
  const ligne = groupes[0].lignes[0];
  const options = { mode: "instruction", etiquettes: true, choix: { [cleChute(ligne.profil, ligne.longueur)]: { conserver: false, note: "Tâche Z3010" } } };
  const selection = chutesSelectionnees(groupes, options);
  expect(selection.flatMap(g => g.lignes).some(l => l.longueur === ligne.longueur && l.profil === ligne.profil)).toBe(false);
  for (const b of r.barres.filter(b => b.chute === ligne.longueur)) expect(choixBarre(options, b).conserver).toBe(false);
  expect(JSON.stringify(r)).toBe(avant);
  expect(r.longueurChutesReutilisables).toBe(4088);
});

test("JSON projet et sauvegarde complète conservent les trois modes, notes et cases", () => {
  for (const mode of ["none", "indicative", "instruction"]) {
    const options = { mode, etiquettes: true, choix: { [cleChute("Alu", 4088)]: { conserver: false, note: "Sera utilisé pour la tâche Z3010" } } };
    const projet = { chantier: "Atelier", longueur_barre: 6000, pieces: [], stock: [], chutes_pdf: options };
    for (const data of [{ format: "linear-projet", projet }, { format: "linear-sauvegarde", projets: [projet] }]) {
      expect(lireJson(JSON.stringify({ ...data, version: FORMAT_VERSION }))[0].chutes_pdf).toEqual(options);
    }
  }
  expect(lireJson(JSON.stringify({ format: "linear-projet", version: 1, projet: { longueur_barre: 6000, pieces: [] } }))[0].chutes_pdf).toEqual(optionsChutesDefaut());
  expect(() => lireJson(JSON.stringify({ format: "linear-projet", version: FORMAT_VERSION + 1 }))).toThrow("plus récente");
});