// Verifie la navigation au clavier (Tab / Entree) dans le tableau des pieces, sous Chromium et WebKit (Safari).
import { chromium, webkit } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env.APP_URL ?? "http://127.0.0.1:8080/";
const OUT = process.argv[2] ?? "captures";
const lines = [];
for (const [name, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await engine.launch();
  const page = await browser.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  const label = () => page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.tagName);
  await page.getByLabel(/^Repère de /).first().click();
  const seq = [];
  for (let i = 0; i < 6; i++) { seq.push(await label()); await page.keyboard.press("Tab"); await page.waitForTimeout(150); }
  await page.getByLabel("Longueur de Montant A").click();
  await page.keyboard.press("Enter");
  seq.push("[Entree] " + await label());
  // Fleches : droite, bas, gauche, haut depuis Longueur de Montant A
  await page.getByLabel("Longueur de Montant A").click();
  for (const k of ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"]) {
    await page.keyboard.press(k); await page.waitForTimeout(100);
    seq.push(`[${k}] ` + await page.evaluate(() => document.activeElement?.getAttribute("aria-label")));
  }
  lines.push(`${name}: ${seq.join(" -> ")}`);
  await browser.close();
}
writeFileSync(`${OUT}/tab.txt`, lines.join("\n"));
console.log(lines.join("\n"));
