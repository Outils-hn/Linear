// Controle des saisies avant le calcul : une regle par type de champ (vide, minimum,
// maximum, entier). Sans interface : teste dans controle-saisie.test.js.

export type TypeChamp = "longueur" | "quantite" | "marge" | "trait" | "seuil";

/** Trait de scie au-dela duquel la saisie est certainement une erreur de frappe. */
export const TRAIT_MAX = 20;
/** Longueur sous laquelle une piece ou une barre est jugee impossible (mm). */
export const LONGUEUR_MIN = 1;

/**
 * Raison du refus, ou null si la valeur est acceptable.
 * `vide` : le champ est vide ou illisible pendant la saisie.
 */
export function raisonRefus(type: TypeChamp, valeur: number, vide = false): string | null {
  if (vide || !Number.isFinite(valeur)) return "est vide";
  switch (type) {
    case "longueur":
      if (valeur <= 0) return "doit être supérieure à 0";
      if (valeur < LONGUEUR_MIN) return `doit faire au moins ${LONGUEUR_MIN} mm`;
      return null;
    case "quantite":
      if (valeur < 1) return "doit être d'au moins 1";
      if (!Number.isInteger(valeur)) return "doit être un nombre entier";
      return null;
    case "marge":
    case "seuil":
      return valeur < 0 ? "ne peut pas être négative" : null;
    case "trait":
      if (valeur < 0) return "ne peut pas être négative";
      if (valeur > TRAIT_MAX) return `dépasse ${TRAIT_MAX} mm, vérifiez la saisie`;
      return null;
  }
}
