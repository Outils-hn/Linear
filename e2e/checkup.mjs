// Check-up automatique de Linear dans un vrai navigateur : memoire des reglages, theme,
// curseur sur le champ en erreur, sauvegarde complete. Resultat : checkup.txt (OK / ECHEC).
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

const BASE = process.env.APP_URL ?? "http://127.0.0.1:8080/";
const OUT = process.argv[2] ?? "captures";
const lignes = [];
const verif = (nom, ok, detail = "") => lignes.push(`${ok ? "OK    " : "ECHEC "} ${nom}${detail ? ` (${detail})` : ""}`);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on("dialog", (d) => d.accept());
try {
  await page.goto(BASE, { waitUntil: "networkidle" });
  // 1. Reglages retenus apres rechargement
  await page.getByRole("button", { name: /Modifier/ }).first().click();
  await page.locator("#ts").fill("4"); await page.waitForTimeout(300);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Modifier/ }).first().click();
  const ts = await page.locator("#ts").inputValue();
  verif("Trait de scie retenu apres rechargement", ts === "4", `lu : ${ts}`);
  await page.getByRole("button", { name: /Replier/ }).first().click();
  // 2. Nouveau projet garde les reglages
  await page.getByRole("button", { name: /^Nouveau$/ }).first().click(); await page.waitForTimeout(400);
  const resume = await page.getByText(/trait de scie/).first().textContent();
  verif("Nouveau projet garde les reglages", /trait de scie 4 mm/.test(resume ?? ""), resume ?? "");
  // 3. Champ vide : curseur dessus au lancement
  const longueur = page.getByLabel(/^Longueur de /).first();
  await longueur.fill(""); await page.waitForTimeout(200);
  await page.getByRole("button", { name: /Lancer l'optimisation/ }).click(); await page.waitForTimeout(600);
  const actif = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
  verif("Champ vide : le curseur va dessus", /^Longueur de /.test(actif), actif);
  await longueur.fill("1000");
  // 4. Theme sombre retenu
  await page.getByRole("button", { name: "Basculer le thème" }).click(); await page.waitForTimeout(200);
  await page.reload({ waitUntil: "networkidle" });
  verif("Mode sombre retenu apres rechargement", await page.evaluate(() => document.documentElement.classList.contains("dark")));
  // 5. Sauvegarde complete : fichier telecharge et lisible
  await page.getByRole("button", { name: /^Sauvegarde$/ }).click();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Télécharger la sauvegarde/ }).click()]);
  const chemin = `${OUT}/sauvegarde-test.json`; await dl.saveAs(chemin);
  const json = JSON.parse(readFileSync(chemin, "utf8"));
  verif("Sauvegarde complete : reglages et theme inclus", json.app === "linear" && "linear:reglages:v1" in json.data && "linear-theme" in json.data, Object.keys(json.data).join(", "));
} catch (e) { verif("Deroulement du check-up", false, e.message.split("\n")[0]); }
await browser.close();
writeFileSync(`${OUT}/checkup.txt`, lignes.join("\n"));
console.log(lignes.join("\n"));
