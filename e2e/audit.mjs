// Audit UX de Linear (donnees fictives).
import { lancer, ouvrir, photo, mesures, axe, tabsJusqua, focusVisible, note, ecrire, tenter } from "./audit-lib.mjs";
const b = await lancer();
const P = [["Montant", 2450, 12, "Profil A"], ["Traverse", 1180, 18, "Profil A"], ["Renfort", 437.5, 10, "Profil A"], ["Lisse", 3125, 6, "Profil B"], ["Cale", 260, 20, "Profil B"]];
const projet = (pieces, extra = {}) => ({ id: "demo", chantier: "Chantier démo", numero_tache: "T-01", client: "Client démo", date_projet: "2026-10-27", longueur_barre: 6000, marge_securite: 100, trait_scie: 3, strategie: "min-barres", pieces, stock: [{ id: "s1", longueur: 4200, quantite: 3 }, { id: "s2", longueur: 1500, quantite: 2 }], created_at: "2026-10-27T00:00:00Z", updated_at: "2026-10-27T00:00:00Z", ...extra });
const piecesDemo = P.map(([nom, longueur, quantite, profil], i) => ({ id: "p" + i, nom, longueur, quantite, profil }));
const semer = (pr) => async (p) => p.addInitScript((proj) => {
  if (sessionStorage.getItem("seeded")) return;
  localStorage.setItem("linear:profiles:v1", JSON.stringify({ profiles: [{ id: "Principal", name: "Principal", createdAt: "2026-10-27T00:00:00Z" }] }));
  localStorage.setItem("linear:active-profile:v1", "Principal"); localStorage.setItem("linear:projects:v1:Principal", JSON.stringify([proj])); localStorage.setItem("linear:full-backup-date", new Date().toISOString()); sessionStorage.setItem("seeded", "1");
}, pr);
const txt = async (p, sel = "body") => (await p.locator(sel).first().innerText().catch(() => "")).replace(/\s+/g, " ");
const ouvrirProjet = async (p) => { await p.getByRole("button", { name: /Mes projets/ }).click(); await p.getByText("Chantier démo").first().click(); await p.keyboard.press("Escape"); await p.waitForTimeout(500); };
const lancerCalcul = async (p) => { const t0 = Date.now(); await p.getByRole("button", { name: /Lancer l'optimisation/ }).click(); await p.waitForTimeout(1500); await p.getByText(/barres? (à|a) commander|Barres utilisées|Plans? de coupe/i).first().waitFor({ timeout: 40000 }).catch(() => {}); return Date.now() - t0; };

let p = await ouvrir(b, "vide");
await photo(p, "01-premier-lancement"); await mesures(p, "vide"); await axe(p, "vide"); note("vide:texte", (await txt(p)).slice(0, 700));
await p.getByRole("button", { name: /Lancer l'optimisation/ }).click().catch(() => {}); await p.waitForTimeout(600); await photo(p, "01b-lancer-sans-pieces", false); note("vide:lancer", (await txt(p)).slice(0, 300));

p = await ouvrir(b, "demo", { init: semer(projet(piecesDemo)) }); await ouvrirProjet(p);
await photo(p, "02-avant-calcul"); await mesures(p, "demo"); await axe(p, "demo"); note("focus:demo", await focusVisible(p));
note("tabs-jusqu-a-lancer", await tabsJusqua(p, () => /Lancer l'optimisation/.test(document.activeElement?.textContent || ""), 80));
note("calcul-demo-ms", await lancerCalcul(p)); await photo(p, "03-resultats"); await axe(p, "resultats"); note("resultats:texte", (await txt(p)).slice(0, 900));
const btns = await p.getByRole("button").allInnerTexts(); note("boutons-resultats", btns.map((s) => s.trim()).filter(Boolean).join(" | "));

const limites = {
  "piece-trop-longue": [{ id: "a", nom: "Trop longue", longueur: 7000, quantite: 1, profil: "Profil A" }],
  "zero-negatif": [{ id: "a", nom: "Zéro", longueur: 0, quantite: 3, profil: "" }, { id: "b", nom: "Neg", longueur: -500, quantite: 2, profil: "" }, { id: "c", nom: "", longueur: 800, quantite: 0, profil: "" }],
  "quantite-folle": [{ id: "a", nom: "Q", longueur: 300, quantite: 100000, profil: "" }],
  "cent-cinquante-pieces": Array.from({ length: 150 }, (_, i) => ({ id: "g" + i, nom: "G" + i, longueur: 150 + ((i * 97) % 3200), quantite: 1 + (i % 5), profil: "Profil " + "ABCD"[i % 4] })),
  "quatre-cents-pieces": Array.from({ length: 400 }, (_, i) => ({ id: "g" + i, nom: "G" + i, longueur: 150 + ((i * 97) % 3200), quantite: 1 + (i % 5), profil: "Profil " + "ABCD"[i % 4] })),
  "mille-pieces": Array.from({ length: 1000 }, (_, i) => ({ id: "g" + i, nom: "G" + i, longueur: 150 + ((i * 97) % 3200), quantite: 1 + (i % 5), profil: "Profil " + "ABCD"[i % 4] })),
  "marge-superieure-barre": null,
};
for (const [nom, pieces] of Object.entries(limites)) await tenter("limite-"+nom, async () => {
  const q = await ouvrir(b, `lim-${nom}`, { init: semer(nom === "marge-superieure-barre" ? projet(piecesDemo, { marge_securite: 7000 }) : projet(pieces)) });
  await ouvrirProjet(q); await photo(q, `04-${nom}-avant`, false);
  const ms = await Promise.race([lancerCalcul(q), new Promise((r) => setTimeout(() => r(-1), 70000)).then(() => -1)]);
  note(`limite:${nom}`, { ms, apercu: (await txt(q)).slice(0, 500) }); await photo(q, `04-${nom}-apres`, nom !== "mille-pieces");
  await q.context().close();
});
await tenter("saisie", async () => {
p = await ouvrir(b, "saisie", { init: semer(projet([])) }); await ouvrirProjet(p);
const champs = await p.locator("input").evaluateAll((els) => els.filter((e) => e.offsetParent).map((e) => `${e.type}#${e.id}|${e.getAttribute("aria-label") || ""}|${e.value}`));
note("champs-visibles", champs);
for (const [nom, w, h] of [["mobile", 390, 844], ["tablette", 768, 1024]]) await tenter(nom, async () => { const m = await ouvrir(b, nom, { w, h, init: semer(projet(piecesDemo)) }); await photo(m, `08-${nom}-ouverture`); await mesures(m, nom); await ouvrirProjet(m); await photo(m, `08-${nom}`); await lancerCalcul(m); await photo(m, `08-${nom}-resultats`); });
await tenter("sombre", async () => {
const d = await ouvrir(b, "sombre", { dark: true, init: async (pg) => { await semer(projet(piecesDemo))(pg); await pg.addInitScript(() => localStorage.setItem("linear-theme", "dark")); } }); await ouvrirProjet(d); await lancerCalcul(d); await photo(d, "09-sombre-resultats", false); await axe(d, "sombre");
});
});
ecrire(); await b.close();
