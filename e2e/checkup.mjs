// Check-up automatique de Linear dans un vrai navigateur : enregistrement du projet en cours,
// saisies refusees, resultat perime, annulation de « Nouveau ».
// Resultat : checkup.txt (OK / ECHEC) + quelques captures. Donnees fictives uniquement.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

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

  // 4. Nouveau + Annuler
  await page.getByRole("button", { name: /^Nouveau$/ }).click();
  await page.waitForTimeout(300);
  verif("Nouveau : liste vide", (await page.locator("tbody input[data-col='nom']").count()) === 0);
  await page.getByRole("button", { name: "Annuler" }).click();
  await page.waitForTimeout(400);
  verif("Annuler apres Nouveau : saisie retablie", (await page.locator("#chantier").inputValue()) === "Chantier démo");
} catch (e) {
  verif("Parcours complet", false, e.message.split("\n")[0]);
}
await browser.close();
writeFileSync(`${OUT}/checkup.txt`, lignes.join("\n"));
console.log(lignes.join("\n"));
