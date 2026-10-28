import { expect, test } from "bun:test";
import { estTableur, lignesEnTexte } from "./lire-fichier-tableur";

test("import Excel : lignes en texte tabule, cellules vides de fin retirees", () => {
  expect(lignesEnTexte([["Repère", "Longueur", "Qté"], ["Montant", 2450, 12], ["", "", ""], ["Renfort", 437.5, 10, "", ""]]))
    .toBe("Repère\tLongueur\tQté\nMontant\t2450\t12\nRenfort\t437,5\t10");
  expect(estTableur(new File([""], "liste.XLSX"))).toBe(true);
  expect(estTableur(new File([""], "plan.dwg"))).toBe(false);
});
