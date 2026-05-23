export type Strategie = "min-barres" | "max-chutes" | "tri-simple";

export interface Piece {
  id: string;
  nom: string;
  longueur: number;
  quantite: number;
}

export interface CoupePlacee {
  nom: string;
  longueur: number;
  pieceId: string;
}

export interface BarreOptimisee {
  index: number;
  longueurBarre: number;
  coupes: CoupePlacee[];
  longueurUtilisee: number;
  longueurTraitsScie: number;
  chute: number;
  chuteReutilisable: boolean;
}

export interface ResultatOptimisation {
  barres: BarreOptimisee[];
  nbBarres: number;
  longueurTotale: number;
  longueurUtile: number;
  longueurChutes: number;
  longueurDechets: number;
  longueurChutesReutilisables: number;
  rendement: number;
  pourcentageChutes: number;
}

export const SEUIL_CHUTE_REUTILISABLE = 500;

interface Item {
  pieceId: string;
  nom: string;
  longueur: number;
}

function expandPieces(pieces: Piece[]): Item[] {
  const items: Item[] = [];
  for (const p of pieces) {
    for (let i = 0; i < p.quantite; i++) {
      items.push({ pieceId: p.id, nom: p.nom, longueur: p.longueur });
    }
  }
  return items;
}

function newBarre(index: number, longueurBarre: number): BarreOptimisee {
  return {
    index,
    longueurBarre,
    coupes: [],
    longueurUtilisee: 0,
    longueurTraitsScie: 0,
    chute: longueurBarre,
    chuteReutilisable: false,
  };
}

function placerSurBarre(
  barre: BarreOptimisee,
  item: Item,
  traitScie: number,
): boolean {
  const coutTrait = barre.coupes.length > 0 ? traitScie : 0;
  const espaceRestant = barre.longueurBarre - barre.longueurUtilisee - barre.longueurTraitsScie;
  if (item.longueur + coutTrait > espaceRestant) return false;
  barre.coupes.push({ nom: item.nom, longueur: item.longueur, pieceId: item.pieceId });
  barre.longueurUtilisee += item.longueur;
  barre.longueurTraitsScie += coutTrait;
  barre.chute = barre.longueurBarre - barre.longueurUtilisee - barre.longueurTraitsScie;
  return true;
}

// First-Fit Decreasing — minimise les barres
function optimiserMinBarres(
  items: Item[],
  longueurBarre: number,
  traitScie: number,
): BarreOptimisee[] {
  const tri = [...items].sort((a, b) => b.longueur - a.longueur);
  const barres: BarreOptimisee[] = [];
  for (const item of tri) {
    let place = false;
    for (const b of barres) {
      if (placerSurBarre(b, item, traitScie)) {
        place = true;
        break;
      }
    }
    if (!place) {
      const nb = newBarre(barres.length + 1, longueurBarre);
      placerSurBarre(nb, item, traitScie);
      barres.push(nb);
    }
  }
  return barres;
}

// Best-Fit Decreasing — concentre les pertes pour maximiser grandes chutes
function optimiserMaxChutes(
  items: Item[],
  longueurBarre: number,
  traitScie: number,
): BarreOptimisee[] {
  const tri = [...items].sort((a, b) => b.longueur - a.longueur);
  const barres: BarreOptimisee[] = [];
  for (const item of tri) {
    // best-fit : la barre où il rentre le plus serré
    let meilleur: BarreOptimisee | null = null;
    let meilleurReste = Infinity;
    for (const b of barres) {
      const coutTrait = b.coupes.length > 0 ? traitScie : 0;
      const espace = b.longueurBarre - b.longueurUtilisee - b.longueurTraitsScie;
      const reste = espace - item.longueur - coutTrait;
      if (reste >= 0 && reste < meilleurReste) {
        meilleur = b;
        meilleurReste = reste;
      }
    }
    if (meilleur) {
      placerSurBarre(meilleur, item, traitScie);
    } else {
      const nb = newBarre(barres.length + 1, longueurBarre);
      placerSurBarre(nb, item, traitScie);
      barres.push(nb);
    }
  }
  return barres;
}

// Regroupement par pièce identique
function optimiserTriSimple(
  items: Item[],
  longueurBarre: number,
  traitScie: number,
): BarreOptimisee[] {
  // Groupe par pieceId
  const groupes = new Map<string, Item[]>();
  for (const it of items) {
    if (!groupes.has(it.pieceId)) groupes.set(it.pieceId, []);
    groupes.get(it.pieceId)!.push(it);
  }
  // Trie groupes par longueur décroissante
  const groupesArr = [...groupes.values()].sort(
    (a, b) => b[0].longueur - a[0].longueur,
  );

  const barres: BarreOptimisee[] = [];
  for (const groupe of groupesArr) {
    for (const item of groupe) {
      // Cherche d'abord une barre contenant déjà cette pièce
      let place = false;
      for (const b of barres) {
        if (b.coupes.some((c) => c.pieceId === item.pieceId)) {
          if (placerSurBarre(b, item, traitScie)) {
            place = true;
            break;
          }
        }
      }
      if (place) continue;
      // Sinon n'importe quelle barre
      for (const b of barres) {
        if (placerSurBarre(b, item, traitScie)) {
          place = true;
          break;
        }
      }
      if (!place) {
        const nb = newBarre(barres.length + 1, longueurBarre);
        placerSurBarre(nb, item, traitScie);
        barres.push(nb);
      }
    }
  }
  return barres;
}

export function optimiser(
  pieces: Piece[],
  longueurBarre: number,
  traitScie: number,
  strategie: Strategie,
): ResultatOptimisation {
  const items = expandPieces(pieces).filter((i) => i.longueur > 0 && i.longueur <= longueurBarre);
  let barres: BarreOptimisee[] = [];
  if (items.length === 0) {
    return {
      barres: [],
      nbBarres: 0,
      longueurTotale: 0,
      longueurUtile: 0,
      longueurChutes: 0,
      longueurDechets: 0,
      longueurChutesReutilisables: 0,
      rendement: 0,
      pourcentageChutes: 0,
    };
  }
  switch (strategie) {
    case "min-barres":
      barres = optimiserMinBarres(items, longueurBarre, traitScie);
      break;
    case "max-chutes":
      barres = optimiserMaxChutes(items, longueurBarre, traitScie);
      break;
    case "tri-simple":
      barres = optimiserTriSimple(items, longueurBarre, traitScie);
      break;
  }

  for (const b of barres) {
    b.chuteReutilisable = b.chute >= SEUIL_CHUTE_REUTILISABLE;
  }

  const nbBarres = barres.length;
  const longueurTotale = nbBarres * longueurBarre;
  const longueurUtile = barres.reduce((s, b) => s + b.longueurUtilisee, 0);
  const longueurChutes = barres.reduce((s, b) => s + b.chute, 0);
  const longueurChutesReutilisables = barres
    .filter((b) => b.chuteReutilisable)
    .reduce((s, b) => s + b.chute, 0);
  const longueurDechets = longueurChutes - longueurChutesReutilisables;
  const rendement = longueurTotale > 0 ? (longueurUtile / longueurTotale) * 100 : 0;
  const pourcentageChutes = longueurTotale > 0 ? (longueurChutes / longueurTotale) * 100 : 0;

  return {
    barres,
    nbBarres,
    longueurTotale,
    longueurUtile,
    longueurChutes,
    longueurDechets,
    longueurChutesReutilisables,
    rendement,
    pourcentageChutes,
  };
}
