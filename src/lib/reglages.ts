// Derniers reglages utilises (barre, marge, trait de scie...), retenus dans le navigateur
// pour ne pas les ressaisir a chaque ouverture. Cle « linear: » : comprise dans la sauvegarde complete.
import type { PositionMarge, Strategie } from "./optimizer";
import { lireMethodeCoupe, type MethodeCoupe } from "./cut-method";

export const CLE_REGLAGES = "linear:reglages:v1";

export interface Reglages {
  longueurBarre: number;
  margeSecurite: number;
  positionMarge: PositionMarge;
  traitScie: number;
  seuilChute: number;
  methodeCoupe: MethodeCoupe;
  strategie: Strategie;
}

export const REGLAGES_DEFAUT: Reglages = {
  longueurBarre: 6000, margeSecurite: 100, positionMarge: "debut", traitScie: 3,
  seuilChute: 500, methodeCoupe: "butee", strategie: "min-barres",
};

const positif = (v: unknown, defaut: number, zeroOk = true) =>
  typeof v === "number" && Number.isFinite(v) && (zeroOk ? v >= 0 : v > 0) ? v : defaut;

/** Relit et controle les reglages (valeur abimee -> valeur par defaut). */
export function normaliserReglages(brut: unknown): Reglages {
  const r = (brut && typeof brut === "object" ? brut : {}) as Partial<Record<keyof Reglages, unknown>>;
  return {
    longueurBarre: positif(r.longueurBarre, REGLAGES_DEFAUT.longueurBarre, false),
    margeSecurite: positif(r.margeSecurite, REGLAGES_DEFAUT.margeSecurite),
    positionMarge: r.positionMarge === "fin" || r.positionMarge === "deux-bouts" ? r.positionMarge : "debut",
    traitScie: positif(r.traitScie, REGLAGES_DEFAUT.traitScie),
    seuilChute: positif(r.seuilChute, REGLAGES_DEFAUT.seuilChute),
    methodeCoupe: lireMethodeCoupe(r.methodeCoupe),
    strategie: r.strategie === "priorite-stock" ? "priorite-stock" : "min-barres",
  };
}

export function lireReglages(): Reglages {
  try {
    const t = typeof window !== "undefined" ? window.localStorage.getItem(CLE_REGLAGES) : null;
    return normaliserReglages(t ? JSON.parse(t) : null);
  } catch {
    return { ...REGLAGES_DEFAUT };
  }
}

export function ecrireReglages(r: Reglages) {
  try { window.localStorage.setItem(CLE_REGLAGES, JSON.stringify(r)); } catch { /* stockage bloque : tant pis */ }
}
