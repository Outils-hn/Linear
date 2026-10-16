import { beforeEach, describe, expect, test } from "bun:test";
import { getActiveProfile, listProjects, profilDemarrage, upsertProject, ensureProfile, PROFIL_PAR_DEFAUT } from "./local-store";

// Faux localStorage pour tester sans navigateur
const memoire = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => memoire.get(k) ?? null,
    setItem: (k: string, v: string) => { memoire.set(k, v); },
    removeItem: (k: string) => { memoire.delete(k); },
  },
};

const projet = (chantier: string) => ({
  chantier, numero_tache: "", client: "", date_projet: "2026-10-16", longueur_barre: 6000,
  marge_securite: 0, trait_scie: 3, strategie: "min-barres", pieces: [], stock: [],
});

describe("demarrage sans ecran de profil", () => {
  beforeEach(() => memoire.clear());

  test("premiere ouverture : profil Principal cree et actif", () => {
    expect(profilDemarrage()).toBe(PROFIL_PAR_DEFAUT);
    expect(getActiveProfile()).toBe(PROFIL_PAR_DEFAUT);
  });

  test("anciens profils : on garde celui qui a le plus de projets et on rapatrie les autres", () => {
    ensureProfile("Bureau"); ensureProfile("Atelier");
    upsertProject("Bureau", projet("A"));
    upsertProject("Atelier", projet("B"));
    upsertProject("Atelier", projet("C"));
    const id = profilDemarrage();
    expect(id).toBe("Atelier");
    expect(listProjects(id).map((p) => p.chantier).sort()).toEqual(["A", "B", "C"]);
    // Relancer ne cree pas de doublons, et l'ancienne liste n'est pas effacee
    profilDemarrage();
    expect(listProjects(id)).toHaveLength(3);
    expect(listProjects("Bureau")).toHaveLength(1);
  });
});
