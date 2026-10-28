// Check-up automatique de Linear dans un vrai navigateur : enregistrement du projet en cours,
// saisies refusees, resultat perime, annulation de « Nouveau », memoire des reglages, theme,
// curseur sur le champ en erreur, sauvegarde complete.
// Resultat : checkup.txt (OK / ECHEC) + quelques captures. Donnees fictives uniquement.
import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const BASE = process.env.APP_URL ?? "http://127.0.0.1:8080/";
const OUT = process.argv[2] ?? "captures";
mkdirSync(OUT, { recursive: true });
const lignes = [];
const verif = (nom, ok, detail = "") => lignes.push(`${ok ? "OK    " : "ECHEC "} ${nom}${detail ? ` (${detail})` : ""}`);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => verif("Aucune erreur JavaScript", false, e.message));
const toasts = async () => (await page.locator("[data-sonner-toast]").allInnerTexts()).join(" | ").replace(/\s+/g, " ");
const coller = async (tsv) => {
  await page.getByRole("button", { name: "Coller depuis Excel" }).click();
  await page.locator("textarea").fill(tsv);
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Remplacer la liste" }).click();
  await page.waitForTimeout(400);
};
const lancer = async () => { await page.keyboard.press("Control+Enter"); await page.waitForTimeout(1500); };

try {
  await page.goto(BASE, { waitUntil: "networkidle" });
  verif("Premier lancement : aucune piece d'exemple", (await page.locator("tbody input[data-col='nom']").count()) === 0);
  await page.screenshot({ path: `${OUT}/check-01-premier-lancement.png` });

  // 1. Projet en cours garde apres rechargement
  await page.locator("#chantier").fill("Chantier démo");
  await coller("Montant\t2450\t12\nTraverse\t1180\t18");
  await page.waitForTimeout(400);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  verif("Rechargement : chantier garde", (await page.locator("#chantier").inputValue()) === "Chantier démo");
  verif("Rechargement : pieces gardees", (await page.locator("tbody input[data-col='nom']").count()) === 2);
  await page.getByRole("button", { name: /Ajouter/ }).click();
  const ids = await page.locator("tbody input[data-col='nom']").evaluateAll((els) => els.map((e) => e.value));
  verif("Piece ajoutee apres rechargement : ligne distincte", ids.length === 3, ids.join(", "));
  await page.getByLabel(/^Supprimer Pièce/).click();

  // 2. Saisies refusees
  await page.getByRole("button", { name: /Modifier/ }).first().click();
  await page.locator("#ms").fill("-500");
  await lancer();
  verif("Marge negative refusee", /négative/.test(await toasts()) && (await page.locator("#resultats").count()) === 0, await toasts());
  await page.locator("#ms").fill("100");
  await page.getByLabel("Quantité de Montant").fill("2.5");
  await lancer();
  verif("Quantite decimale refusee", /entier/.test(await toasts()), await toasts());
  await page.screenshot({ path: `${OUT}/check-02-saisie-refusee.png` });
  await page.getByLabel("Quantité de Montant").fill("12");

  // 3. Resultat perime
  await lancer();
  verif("Calcul affiche", await page.locator("#resultats").isVisible());
  verif("Bouton PDF actif apres calcul", await page.getByRole("button", { name: /PDF atelier/ }).isEnabled());
  await page.getByLabel("Quantité de Montant").fill("40");
  await page.waitForTimeout(400);
  verif("Bandeau resultat perime", await page.getByText("Saisie modifiée depuis le calcul").isVisible());
  verif("PDF bloque si perime", await page.getByRole("button", { name: /PDF atelier/ }).isDisabled());
  await page.getByText("Saisie modifiée depuis le calcul").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/check-03-resultat-perime.png` });
  await page.getByRole("button", { name: /^Relancer/ }).click();
  await page.waitForTimeout(1500);
  verif("Relancer efface le bandeau", !(await page.getByText("Saisie modifiée depuis le calcul").isVisible()));

  // Suppression d'une piece puis Annuler
  const nAvant = await page.locator("tbody input[data-col='nom']").count();
  await page.getByLabel("Supprimer Traverse").click(); await page.waitForTimeout(300);
  await page.locator("[data-sonner-toast]", { hasText: "Traverse" }).getByRole("button", { name: "Annuler" }).click(); await page.waitForTimeout(300);
  const noms = await page.locator("tbody input[data-col='nom']").evaluateAll((els) => els.map((e) => e.value));
  verif("Suppression d'une piece : Annuler la remet a sa place", noms.length === nAvant && noms[1] === "Traverse", noms.join(", "));
  // Import d'un fichier Excel (genere a la volee)
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Repère", "Longueur", "Qté"], ["X1", 1200, 3], ["X2", 437.5, 2]]), "Pièces");
  XLSX.writeFile(wb, `${OUT}/import-test.xlsx`);
  await page.locator('input[type="file"][aria-label="Fichier Excel à importer"]').setInputFiles(`${OUT}/import-test.xlsx`); await page.waitForTimeout(800);
  verif("Import .xlsx : fenetre de collage ouverte", await page.getByRole("dialog").getByText("Coller depuis Excel").isVisible());
  await page.screenshot({ path: `${OUT}/check-import-xlsx.png` });
  await page.getByRole("button", { name: "Ajouter à la liste" }).click(); await page.waitForTimeout(400);
  verif("Import .xlsx : pieces ajoutees (437,5 mm)", (await page.getByLabel("Longueur de X2").inputValue()) === "437,5", await page.getByLabel("Longueur de X2").inputValue().catch(() => "absent"));
  for (const n of ["X1", "X2"]) { await page.getByLabel(`Supprimer ${n}`).click(); await page.waitForTimeout(150); }

  // 4. Nouveau + Annuler
  await page.getByRole("button", { name: /^Nouveau$/ }).click();
  await page.waitForTimeout(300);
  verif("Nouveau : liste vide", (await page.locator("tbody input[data-col='nom']").count()) === 0);
  await page.locator("[data-sonner-toast]", { hasText: "Nouveau projet" }).getByRole("button", { name: "Annuler" }).click();
  await page.waitForTimeout(400);
  verif("Annuler apres Nouveau : saisie retablie", (await page.locator("#chantier").inputValue()) === "Chantier démo");
} catch (e) {
  verif("Parcours complet", false, e.message.split("\n")[0]);
}

// Performance : 300 lignes (6 000 pieces), calcul en arriere-plan et saisie fluide
try {
  const c3 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p3 = await c3.newPage();
  // Diagnostic : le calcul passe-t-il bien par un Web Worker ? quelles taches longues bloquent la page ?
  await p3.addInitScript(() => {
    window.__workers = 0; window.__workerErr = "";
    const W = window.Worker;
    window.Worker = function (...a) { window.__workers++; const w = new W(...a); w.addEventListener("error", (e) => { window.__workerErr = String(e.message || "erreur"); }); return w; };
    window.__longues = [];
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__longues.push(Math.round(e.duration)); }).observe({ type: "longtask", buffered: true }); } catch {}
  });
  await p3.goto(BASE, { waitUntil: "networkidle" });
  const lignes300 = Array.from({ length: 300 }, (_, i) => `R${i + 1}\tProfil ${(i % 6) + 1}\t${200 + ((i * 137) % 2800)}\t20`).join("\n");
  await p3.getByRole("button", { name: "Coller depuis Excel" }).click();
  await p3.locator("textarea").fill("Repère\tProfilé\tLongueur\tQté\n" + lignes300);
  await p3.waitForTimeout(500);
  await p3.getByRole("button", { name: "Remplacer la liste" }).click();
  await p3.waitForTimeout(800);
  // Pendant le calcul, la page doit continuer a repondre : on mesure le plus long blocage
  await p3.evaluate(() => { window.__bloc = 0; let t = performance.now(); window.__tic = setInterval(() => { const n = performance.now(); window.__bloc = Math.max(window.__bloc, n - t - 50); t = n; }, 50); });
  const cdpCalc = await c3.newCDPSession(p3);
  await cdpCalc.send("Profiler.enable"); await cdpCalc.send("Profiler.setSamplingInterval", { interval: 1000 }); await cdpCalc.send("Profiler.start");
  const t0 = Date.now();
  await p3.getByRole("button", { name: /Lancer l'optimisation/ }).click();
  await p3.waitForFunction(() => document.getElementById("resultats") && !document.body.innerText.includes("Optimisation en cours"), null, { timeout: 120000 });
  await p3.waitForTimeout(500);
  {
    const { profile } = await cdpCalc.send("Profiler.stop");
    const dt = new Map(); profile.samples.forEach((id, i) => dt.set(id, (dt.get(id) ?? 0) + (profile.timeDeltas[i] ?? 0)));
    // Temps cumule par fonction de l'appli (fichiers src), enfants compris
    const parent = new Map(); for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
    const byId = new Map(profile.nodes.map((n) => [n.id, n]));
    const total = new Map();
    for (const [id, t] of dt) {
      const vus = new Set(); let cur = id;
      while (cur != null) { const n = byId.get(cur); const u = n.callFrame.url; if (/\/src\//.test(u)) { const k = `${n.callFrame.functionName || "(anonyme)"} ${u.split("/src/").pop().split("?")[0]}:${n.callFrame.lineNumber}`; if (!vus.has(k)) { vus.add(k); total.set(k, (total.get(k) ?? 0) + t / 1000); } } cur = parent.get(cur); }
    }
    const top = [...total.entries()].sort((x, y) => y[1] - x[1]).slice(0, 10).map(([k, v]) => `${k} ${Math.round(v)}ms`);
    verif("Diagnostic : profil du calcul et de l'affichage", true, top.join(" | "));
  }
  const dureeCalcul = Date.now() - t0;
  const bloc = await p3.evaluate(() => { clearInterval(window.__tic); return Math.round(window.__bloc); });
  verif("6 000 pieces : calcul termine", dureeCalcul < 60000, `${dureeCalcul} ms`);
  const diag = await p3.evaluate(() => ({ w: window.__workers, err: window.__workerErr, longues: window.__longues.slice().sort((x, y) => y - x).slice(0, 5) }));
  verif("Diagnostic : calcul dans un Web Worker", diag.w > 0 && !diag.err, `workers ${diag.w}, erreur « ${diag.err} », taches longues ${diag.longues.join(" / ")} ms`);
  verif("6 000 pieces : ecran jamais fige plus de 3 s pendant le calcul et l'affichage", bloc < 3000, `blocage max ${bloc} ms`);
  // Saisie : temps entre la frappe et l'affichage suivant
  const champ = p3.getByLabel(/^Quantité de R1$/);
  await champ.click();
  // Profil CPU d'une frappe : fonctions qui prennent le plus de temps (diagnostic)
  try {
    const cdp = await c3.newCDPSession(p3);
    await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 500 }); await cdp.send("Profiler.start");
    await p3.keyboard.type("9"); await p3.waitForTimeout(200);
    const { profile } = await cdp.send("Profiler.stop");
    const self = new Map(); const dt = new Map();
    profile.samples.forEach((id, i) => dt.set(id, (dt.get(id) ?? 0) + (profile.timeDeltas[i] ?? 0)));
    for (const n of profile.nodes) { const k = `${n.callFrame.functionName || "(anonyme)"} ${n.callFrame.url.split("/").pop()}:${n.callFrame.lineNumber}`; self.set(k, (self.get(k) ?? 0) + (dt.get(n.id) ?? 0) / 1000); }
    const top = [...self.entries()].filter(([k]) => !/^\(idle|program|garbage/.test(k)).sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k, v]) => `${k} ${Math.round(v)}ms`);
    verif("Diagnostic : profil d'une frappe", true, top.join(" | "));
    await p3.keyboard.press("Backspace"); await p3.waitForTimeout(300);
  } catch (e) { verif("Diagnostic : profil d'une frappe", true, "indisponible " + e.message); }
  const lat = [];
  for (const ch of ["2", "1"]) {
    const t = await p3.evaluate(() => performance.now());
    await p3.keyboard.type(ch);
    lat.push(await p3.evaluate((t) => new Promise((r) => requestAnimationFrame(() => r(performance.now() - t))), t));
  }
  const pire = Math.round(Math.max(...lat));
  verif("300 lignes : saisie fluide (< 300 ms par frappe)", pire < 300, `${pire} ms`);
  verif("Champ nombre : format « 1 200 » a la sortie", await (async () => { await p3.getByLabel(/^Longueur de R2$/).fill("1200"); await p3.keyboard.press("Tab"); return (await p3.getByLabel(/^Longueur de R2$/).inputValue()).replace(/[\u00a0\u202f]/g, " ") === "1 200"; })());
  await c3.close();
} catch (e) { verif("Deroulement du check-up performance", false, e.message.split("\n")[0]); }

// Reglages, theme, champ vide et sauvegarde complete (navigateur neuf)
try {
  const c2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const p2 = await c2.newPage();
  p2.on("dialog", (d) => d.accept());
  await p2.goto(BASE, { waitUntil: "networkidle" });
  await p2.getByRole("button", { name: /Modifier/ }).first().click();
  await p2.locator("#ts").fill("4"); await p2.waitForTimeout(300);
  await p2.reload({ waitUntil: "networkidle" });
  await p2.getByRole("button", { name: /Modifier/ }).first().click();
  const ts = await p2.locator("#ts").inputValue();
  verif("Trait de scie retenu apres rechargement", ts === "4", `lu : ${ts}`);
  await p2.getByRole("button", { name: /Replier/ }).first().click();
  await p2.getByRole("button", { name: /^Nouveau$/ }).first().click(); await p2.waitForTimeout(400);
  const resume = await p2.getByText(/trait de scie/).first().textContent();
  verif("Nouveau projet garde les reglages", /trait de scie 4 mm/.test(resume ?? ""), resume ?? "");
  // Champ vide : curseur dessus au lancement (le nouveau projet est vide : on ajoute une piece)
  await p2.getByRole("button", { name: /Ajouter/ }).click(); await p2.waitForTimeout(200);
  const longueur = p2.getByLabel(/^Longueur de /).first();
  await longueur.fill(""); await p2.waitForTimeout(200);
  await p2.getByRole("button", { name: /Lancer l'optimisation/ }).click(); await p2.waitForTimeout(600);
  const actif = await p2.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
  verif("Champ vide : le curseur va dessus", /^Longueur de /.test(actif), actif);
  await longueur.fill("1000");
  await p2.getByRole("button", { name: "Basculer le thème" }).click(); await p2.waitForTimeout(200);
  await p2.reload({ waitUntil: "networkidle" });
  verif("Mode sombre retenu apres rechargement", await p2.evaluate(() => document.documentElement.classList.contains("dark")));
  await p2.getByRole("button", { name: /^Sauvegarde$/ }).click();
  const [dl] = await Promise.all([p2.waitForEvent("download"), p2.getByRole("button", { name: /Télécharger la sauvegarde/ }).click()]);
  const chemin = `${OUT}/sauvegarde-test.json`; await dl.saveAs(chemin);
  const json = JSON.parse(readFileSync(chemin, "utf8"));
  verif("Sauvegarde complete : reglages, theme et projet en cours inclus", json.app === "linear" && "linear:reglages:v1" in json.data && "linear-theme" in json.data && Object.keys(json.data).some((k) => k.startsWith("linear:courant:v1:")), Object.keys(json.data).join(", "));
  await c2.close();
} catch (e) { verif("Deroulement du check-up reglages", false, e.message.split("\n")[0]); }
await browser.close();
writeFileSync(`${OUT}/checkup.txt`, lignes.join("\n"));
console.log(lignes.join("\n"));
