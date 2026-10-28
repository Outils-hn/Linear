// Projet en cours, enregistre dans le navigateur a chaque modification (comme Format) :
// un rechargement de la page ou une fermeture d'onglet ne perd plus la saisie.
// Cle « linear: » : comprise dans la sauvegarde complete. Teste dans projet-courant.test.js.
import type { Piece, StockBarre } from "./optimizer";

export const CLE_PROJET_COURANT = (profileId: string) => `linear:courant:v1:${profileId}`;

export interface ProjetCourant {
  projetId: string | null;
  chantier: string;
  numeroTache: string;
  client: string;
  dateProjet: string;
  pieces: Piece[];
  stock: StockBarre[];
  longueursProfils: Record<string, number>;
  seuilsProfils: Record<string, number>;
  chutesPDF?: unknown;
  statutMatiere?: unknown;
}

const texte = (v: unknown) => (typeof v === "string" ? v : "");
const nombres = (v: unknown): Record<string, number> =>
  v && typeof v === "object"
    ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, n]) => typeof n === "number" && Number.isFinite(n))) as Record<string, number>
    : {};

/** Relit un projet en cours enregistre ; null s'il est absent ou abime. */
export function lireProjetCourant(brut: string | null): ProjetCourant | null {
  if (!brut) return null;
  try {
    const p = JSON.parse(brut) as Partial<ProjetCourant>;
    if (!p || typeof p !== "object" || !Array.isArray(p.pieces)) return null;
    return {
      projetId: typeof p.projetId === "string" ? p.projetId : null,
      chantier: texte(p.chantier),
      numeroTache: texte(p.numeroTache),
      client: texte(p.client),
      dateProjet: texte(p.dateProjet),
      pieces: p.pieces.filter((x) => x && typeof x === "object" && typeof x.id === "string"),
      stock: Array.isArray(p.stock) ? p.stock.filter((x) => x && typeof x === "object" && typeof x.id === "string") : [],
      longueursProfils: nombres(p.longueursProfils),
      seuilsProfils: nombres(p.seuilsProfils),
      chutesPDF: p.chutesPDF,
      statutMatiere: p.statutMatiere,
    };
  } catch {
    return null;
  }
}

/** Empreinte des donnees qui changent le calcul : sert a savoir si le resultat affiche est perime. */
export function empreinteCalcul(d: {
  pieces: Piece[];
  stock: StockBarre[];
  longueurBarre: number;
  margeSecurite: number;
  traitScie: number;
  strategie: string;
  longueursProfils: Record<string, number>;
  seuilsProfils: Record<string, number>;
  seuilChute: number;
}): string {
  return JSON.stringify([
    d.pieces.map((p) => [p.id, p.nom, p.profil ?? "", p.longueur, p.quantite]),
    d.strategie === "priorite-stock" ? d.stock.map((s) => [s.longueur, s.quantite]) : [],
    d.longueurBarre, d.margeSecurite, d.traitScie, d.strategie,
    Object.entries(d.longueursProfils).sort(), Object.entries(d.seuilsProfils).sort(), d.seuilChute,
  ]);
}
