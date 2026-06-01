export type Strategie = "min-barres" | "priorite-stock";

export interface Piece {
  id: string;
  nom: string;
  longueur: number;
  quantite: number;
}

export interface StockBarre {
  id: string;
  longueur: number;
  quantite: number;
  appliquerMarge?: boolean;
}

export interface CoupePlacee {
  nom: string;
  longueur: number;
  pieceId: string;
}

export interface BarreOptimisee {
  index: number;
  longueurBarre: number; // longueur utile (après marge)
  longueurBrute: number; // longueur réelle de la barre approvisionnée
  origine: "stock" | "defaut";
  coupes: CoupePlacee[];
  longueurUtilisee: number;
  longueurTraitsScie: number;
  chute: number;
  chuteReutilisable: boolean;
}

export interface ResultatOptimisation {
  barres: BarreOptimisee[];
  nbBarres: number;
  nbBarresStock: number;
  nbBarresDefaut: number;
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

interface PoolBarre {
  longueurUtile: number;
  longueurBrute: number;
  origine: "stock" | "defaut";
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

function newBarre(index: number, pool: PoolBarre): BarreOptimisee {
  return {
    index,
    longueurBarre: pool.longueurUtile,
    longueurBrute: pool.longueurBrute,
    origine: pool.origine,
    coupes: [],
    longueurUtilisee: 0,
    longueurTraitsScie: 0,
    chute: pool.longueurUtile,
    chuteReutilisable: false,
  };
}

function placerSurBarre(barre: BarreOptimisee, item: Item, traitScie: number): boolean {
  const coutTrait = barre.coupes.length > 0 ? traitScie : 0;
  const espaceRestant = barre.longueurBarre - barre.longueurUtilisee - barre.longueurTraitsScie;
  if (item.longueur + coutTrait > espaceRestant) return false;
  barre.coupes.push({ nom: item.nom, longueur: item.longueur, pieceId: item.pieceId });
  barre.longueurUtilisee += item.longueur;
  barre.longueurTraitsScie += coutTrait;
  barre.chute = barre.longueurBarre - barre.longueurUtilisee - barre.longueurTraitsScie;
  return true;
}

// FFD classique sur une longueur unique
function optimiserMinBarres(
  items: Item[],
  poolDefaut: PoolBarre,
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
      const nb = newBarre(barres.length + 1, poolDefaut);
      placerSurBarre(nb, item, traitScie);
      barres.push(nb);
    }
  }
  return barres;
}

// Priorité stock : on ouvre les barres dans l'ordre du stock disponible
// (de la plus grande à la plus petite), puis on complète avec la barre par défaut.
function optimiserPrioriteStock(
  items: Item[],
  poolDefaut: PoolBarre,
  poolsStock: PoolBarre[],
  traitScie: number,
): BarreOptimisee[] {
  const tri = [...items].sort((a, b) => b.longueur - a.longueur);
  // File des barres de stock disponibles (grande -> petite)
  const fileStock = [...poolsStock].sort((a, b) => b.longueurUtile - a.longueurUtile);
  const barres: BarreOptimisee[] = [];

  for (const item of tri) {
    let place = false;
    for (const b of barres) {
      if (placerSurBarre(b, item, traitScie)) {
        place = true;
        break;
      }
    }
    if (place) continue;

    // Choisir la prochaine barre à ouvrir : priorité au stock
    let pool: PoolBarre | null = null;
    while (fileStock.length > 0) {
      const candidate = fileStock[0];
      if (item.longueur <= candidate.longueurUtile) {
        pool = candidate;
        fileStock.shift();
        break;
      }
      // La pièce ne rentre pas dans cette barre stock : on la garde pour
      // de plus petites pièces et on essaie la suivante.
      // Stratégie simple : si la plus grande barre stock ne peut pas la
      // recevoir, aucune autre ne le pourra non plus (file triée desc).
      pool = null;
      break;
    }
    if (!pool) {
      if (item.longueur > poolDefaut.longueurUtile) {
        // Pièce impossible à placer : on l'ignore (déjà filtrée en amont).
        continue;
      }
      pool = poolDefaut;
    }
    const nb = newBarre(barres.length + 1, pool);
    placerSurBarre(nb, item, traitScie);
    barres.push(nb);
  }
  return barres;
}

export interface OptionsOptimisation {
  longueurBarreUtileDefaut: number;
  longueurBarreBruteDefaut: number;
  margeSecurite: number;
  traitScie: number;
  strategie: Strategie;
  stock?: StockBarre[];
}

export function optimiser(
  pieces: Piece[],
  options: OptionsOptimisation,
): ResultatOptimisation {
  const {
    longueurBarreUtileDefaut,
    longueurBarreBruteDefaut,
    margeSecurite,
    traitScie,
    strategie,
    stock = [],
  } = options;

  const poolDefaut: PoolBarre = {
    longueurUtile: longueurBarreUtileDefaut,
    longueurBrute: longueurBarreBruteDefaut,
    origine: "defaut",
  };

  const poolsStock: PoolBarre[] = [];
  for (const s of stock) {
    if (s.longueur <= 0 || s.quantite <= 0) continue;
    const marge = s.appliquerMarge === false ? 0 : margeSecurite;
    const utile = Math.max(0, s.longueur - marge);
    for (let i = 0; i < s.quantite; i++) {
      poolsStock.push({
        longueurUtile: utile,
        longueurBrute: s.longueur,
        origine: "stock",
      });
    }
  }

  const maxBarreUtile = Math.max(
    longueurBarreUtileDefaut,
    ...poolsStock.map((p) => p.longueurUtile),
    0,
  );

  const items = expandPieces(pieces).filter(
    (i) => i.longueur > 0 && i.longueur <= maxBarreUtile,
  );

  let barres: BarreOptimisee[] = [];
  if (items.length === 0) {
    return {
      barres: [],
      nbBarres: 0,
      nbBarresStock: 0,
      nbBarresDefaut: 0,
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
      barres = optimiserMinBarres(items, poolDefaut, traitScie);
      break;
    case "priorite-stock":
      barres = optimiserPrioriteStock(items, poolDefaut, poolsStock, traitScie);
      break;
  }

  for (const b of barres) {
    b.chuteReutilisable = b.chute >= SEUIL_CHUTE_REUTILISABLE;
  }

  const nbBarres = barres.length;
  const nbBarresStock = barres.filter((b) => b.origine === "stock").length;
  const nbBarresDefaut = nbBarres - nbBarresStock;
  const longueurTotale = barres.reduce((s, b) => s + b.longueurBrute, 0);
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
    nbBarresStock,
    nbBarresDefaut,
    longueurTotale,
    longueurUtile,
    longueurChutes,
    longueurDechets,
    longueurChutesReutilisables,
    rendement,
    pourcentageChutes,
  };
}
