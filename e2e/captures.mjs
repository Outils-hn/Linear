// Captures d'ecran et PDF de Linear avec des donnees fictives, pour une revue visuelle.
// Lance par .github/workflows/captures.yml ; resultat dans le dossier passe en argument.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.APP_URL ?? "http://127.0.0.1:8080/";
const OUT = process.argv[2] ?? "captures";
mkdirSync(OUT, { recursive: true });
const P = [
  ["Montant", 2450, 12, "Profil A"], ["Traverse", 1180, 18, "Profil A"], ["Renfort", 437.5, 10, "Profil A"],
  ["Lisse", 3125, 6, "Profil B"], ["Cale", 260, 20, "Profil B"],
];
const projet = (strategie) => ({
  id: "demo-" + strategie, chantier: "Chantier démo", numero_tache: "T-01", client: "Client démo", date_projet: "2026-10-27",
  longueur_barre: 6000, marge_securite: 100, trait_scie: 3, strategie,
  pieces: P.map(([nom, longueur, quantite, profil], i) => ({ id: "p" + i, nom, longueur, quantite, profil })),
  stock: [{ id: "s1", longueur: 4200, quantite: 3 }, { id: "s2", longueur: 1500, quantite: 2 }],
  created_at: "2026-10-27T00:00:00Z", updated_at: "2026-10-27T00:00:00Z",
});
const errors = [];
const browser = await chromium.launch();

async function session(name, { strategie = "min-barres", dark = false, mobile = false }, fn) {
  const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`[${name}] ${e.message}`));
  page.on("dialog", (d) => d.accept());
  await page.addInitScript(([p, dark]) => {
    if (sessionStorage.getItem("seeded")) return;
    localStorage.setItem("linear:profiles:v1", JSON.stringify({ profiles: [{ id: "Principal", name: "Principal", createdAt: "2026-10-27T00:00:00Z" }] }));
    localStorage.setItem("linear:active-profile:v1", "Principal");
    localStorage.setItem("linear:projects:v1:Principal", JSON.stringify([p]));
    localStorage.setItem("linear:full-backup-date", new Date().toISOString());
    if (dark) localStorage.setItem("linear-theme", "dark");
    sessionStorage.setItem("seeded", "1");
  }, [projet(strategie), dark]);
  await page.goto(BASE, { waitUntil: "networkidle" });
  try { await fn(page); } catch (e) { errors.push(`[${name}] ${e.message.split("\n")[0]}`); }
  await ctx.close();
}
const shot = (page, file, full = true) => page.screenshot({ path: `${OUT}/${file}.png`, fullPage: full });
const ouvrir = async (page) => {
  await page.getByRole("button", { name: /Mes projets/ }).click();
  await page.getByText("Chantier démo").first().click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
};
const run = async (page) => {
  await page.getByRole("button", { name: /Lancer l'optimisation/ }).click();
  await page.waitForTimeout(2500);
};

await session("principal", {}, async (page) => {
  await shot(page, "01-ouverture-vide");
  await page.getByRole("button", { name: /Mes projets/ }).click(); await page.waitForTimeout(500);
  await shot(page, "02-mes-projets", false);
  await page.getByText("Chantier démo").first().click(); await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  await shot(page, "03-projet-avant-calcul");
  await page.getByRole("button", { name: /Modifier/ }).first().click(); await page.waitForTimeout(400);
  await shot(page, "03b-parametres-ouverts", false);
  await page.getByRole("button", { name: /Replier/ }).first().click(); await page.waitForTimeout(300);
  await run(page);
  await shot(page, "04-resultats");
  const [dl] = await Promise.all([
    page.waitForEvent("download", { timeout: 60000 }),
    (async () => {
      await page.getByRole("button", { name: /PDF atelier/ }).first().click();
      const q = page.getByRole("button", { name: /Exporter quand même/ });
      if (await q.isVisible({ timeout: 2000 }).catch(() => false)) { await shot(page, "05-avertissement-pdf", false); await q.click(); }
    })(),
  ]);
  await dl.saveAs(`${OUT}/10-pdf-atelier.pdf`);
});
await session("stock", { strategie: "priorite-stock" }, async (page) => {
  await ouvrir(page); await run(page);
  await shot(page, "06-strategie-stock-resultats");
});
await session("mobile", { mobile: true }, async (page) => {
  await ouvrir(page); await run(page);
  await shot(page, "07-mobile");
});
await session("sombre", { dark: true }, async (page) => {
  await ouvrir(page); await run(page);
  await shot(page, "08-mode-sombre");
});
await browser.close();
writeFileSync(`${OUT}/erreurs.txt`, errors.length ? errors.join("\n") : "aucune");
console.log(errors.length ? errors.join("\n") : "Captures OK, aucune erreur");
