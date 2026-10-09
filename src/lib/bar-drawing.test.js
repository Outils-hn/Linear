import { describe, expect, test } from "bun:test";
import { grouperBarresIdentiques, libelleGroupe, segmentsBarre, placerCotes, nombreLignesPage, libelleCote } from "./bar-drawing";
import { optimiserParProfil } from "./multi-profil";
import { verifierResultat } from "./verification";
import { formatNombre } from "./format-number";

const barre = { index: 1, profil: "Tube", origine: "defaut", longueurBrute: 6000, longueurBarre: 5900, margeDebut: 100, margeFin: 0, longueurTraitsScie: 6, chute: 3494, chuteReutilisable: true, coupes: [{ pieceId: "a", nom: "A", longueur: 1200 }, { pieceId: "a", nom: "A", longueur: 1200 }] };
describe("Dessins atelier sans modification du calcul", () => {
  test("groupes stricts et numéros non contigus", () => {
    const bars = [barre, { ...barre, index: 3 }, { ...barre, index: 4, profil: "Autre" }, { ...barre, index: 5, margeDebut: 0, margeFin: 100 }, { ...barre, index: 6, longueurTraitsScie: 5 }];
    const before = JSON.stringify(bars);
    const groups = grouperBarresIdentiques(bars);
    expect(groups.length).toBe(4);
    expect(groups[0].barres.length).toBe(2);
    expect(libelleGroupe(groups[0])).toBe("Barres 1, 3");
    expect(JSON.stringify(bars)).toBe(before);
  });
  test("positions depuis le bout brut et trait final", () => {
    const segments = segmentsBarre(barre, 3);
    expect(segments.filter(s => s.type === "piece").map(s => [s.debut, s.fin])).toEqual([[100, 1300], [1303, 2503]]);
    expect(segments.at(-1).fin).toBe(6000);
  });
  test("toutes les cotes sont présentes sans chevauchement", () => {
    const cotes = placerCotes([1200, 1203, 1206, 5900, 5997], 6000, 180, txt => txt.length * 1.5);
    expect(cotes.length).toBe(5);
    expect(Math.max(...cotes.map(c => c.niveau))).toBeGreaterThan(0);
    for (let i = 0; i < cotes.length; i++) for (let j = i + 1; j < cotes.length; j++) if (cotes[i].niveau === cotes[j].niveau) expect(cotes[j].labelX - cotes[j].largeur / 2).toBeGreaterThan(cotes[i].labelX + cotes[i].largeur / 2);
  });
  test("pagination sans orphelins", () => {
    expect(nombreLignesPage(Array(8).fill(10), 70)).toBe(5);
    expect(nombreLignesPage(Array(8).fill(10), 20)).toBe(0);
    expect(nombreLignesPage(Array(4).fill(10), 30)).toBe(0);
    expect(nombreLignesPage(Array(2).fill(10), 30)).toBe(2);
  });
  test("les cotes décimales restent compactes sans modifier les valeurs", () => {
    expect(libelleCote(200.20000000000002)).toBe("200,2");
    expect(formatNombre(94.9, 1)).toBe("94,9");
    expect(formatNombre(18000)).toBe("18\u202f000");
    expect(formatNombre(5445.5)).toBe("5\u202f445,5");
    const values = Array.from({ length: 80 }, (_, i) => 100 + i * 43.7);
    const cotes = placerCotes(values, 6000, 180, text => text.length * 1.5);
    expect(cotes.map(c => c.valeur)).toEqual(values);
    for (let i = 0; i < cotes.length; i++) for (let j = i + 1; j < cotes.length; j++) if (cotes[i].niveau === cotes[j].niveau) expect(cotes[j].labelX - cotes[j].largeur / 2).toBeGreaterThan(cotes[i].labelX + cotes[i].largeur / 2);
  });
  test("cas atelier, toutes stratégies et SmartCut", () => {
    const pieces = [1200, 800, 450].map((longueur, i) => ({ id: String(i), nom: String(i), profil: "Tube", longueur, quantite: [4, 6, 8][i] }));
    for (const modeUltra of [false, true]) for (const strategie of ["min-barres", "priorite-stock"]) {
      const resultat = optimiserParProfil(pieces, {}, { longueurBarreDefaut: 6000, margeSecurite: 100, positionMarge: "debut", traitScie: 3, modeUltra, strategie, stock: [] });
      expect(resultat.nbBarres).toBe(3);
      expect(resultat.longueurTraitsScie).toBe(54);
      expect(resultat.longueurChutes).toBe(4446);
      expect(verifierResultat(resultat, pieces, { traitScie: 3, positionMarge: "debut" }).ok).toBe(true);
      expect(grouperBarresIdentiques(resultat.barres).reduce((n, g) => n + g.barres.length, 0)).toBe(3);
    }
  });
});