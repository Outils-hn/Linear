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

// Maximiser grandes chutes :
// 1) FFD pour atteindre le nombre minimal de barres,
// 2) Post-traitement : on tente de vider la barre la moins remplie en
//    redistribuant ses pièces dans les autres (best-fit), de manière à
//    concentrer toute la chute restante sur UNE seule barre.
function optimiserMaxChutes(
  items: Item[],
  longueurBarre: number,
  traitScie: number,
): BarreOptimisee[] {
  const barres = optimiserMinBarres(items, longueurBarre, traitScie);

  const espaceRestant = (b: BarreOptimisee) =>
    b.longueurBarre - b.longueurUtilisee - b.longueurTraitsScie;

  let progres = true;
  while (progres && barres.length > 1) {
    progres = false;
    // Barre avec la chute la plus grande = candidate à vider/consolider
    const triParChute = [...barres].sort((a, b) => espaceRestant(b) - espaceRestant(a));
    const source = triParChute[0];
    // On veut déplacer les pièces de "source" vers les autres barres
    const autres = barres.filter((b) => b !== source);
    // Tentative : simuler le placement de chaque coupe de source dans les autres
    const simul = autres.map((b) => ({
      ref: b,
      coupes: [...b.coupes],
      used: b.longueurUtilisee,
      kerf: b.longueurTraitsScie,
    }));
    // Pièces les plus petites d'abord : on les case facilement ailleurs,
    // ce qui agrandit la chute de la barre source.
    const aPlacer = [...source.coupes].sort((a, b) => a.longueur - b.longueur);
    const restant: typeof aPlacer = [];
    let bouge = false;
    for (const c of aPlacer) {
      // best-fit dans les autres barres
      let meilleur: (typeof simul)[number] | null = null;
      let meilleurReste = Infinity;
      for (const s of simul) {
        const cout = s.coupes.length > 0 ? traitScie : 0;
        const espace = longueurBarre - s.used - s.kerf;
        const reste = espace - c.longueur - cout;
        if (reste >= 0 && reste < meilleurReste) {
          meilleur = s;
          meilleurReste = reste;
        }
      }
      if (!meilleur) {
        restant.push(c);
        continue;
      }
      const cout = meilleur.coupes.length > 0 ? traitScie : 0;
      meilleur.coupes.push(c);
      meilleur.used += c.longueur;
      meilleur.kerf += cout;
      bouge = true;
    }
    if (bouge) {
      // Appliquer aux barres destinataires
      for (const s of simul) {
        s.ref.coupes = s.coupes;
        s.ref.longueurUtilisee = s.used;
        s.ref.longueurTraitsScie = s.kerf;
        s.ref.chute = s.ref.longueurBarre - s.used - s.kerf;
      }
      if (restant.length === 0) {
        // Barre source entièrement vidée → on l'enlève
        const idx = barres.indexOf(source);
        barres.splice(idx, 1);
      } else {
        // Mise à jour partielle de la barre source
        source.coupes = restant;
        source.longueurUtilisee = restant.reduce((s, c) => s + c.longueur, 0);
        source.longueurTraitsScie = Math.max(0, restant.length - 1) * traitScie;
        source.chute =
          source.longueurBarre - source.longueurUtilisee - source.longueurTraitsScie;
      }
      progres = true;
    }
  }


  // Ré-indexer
  barres.forEach((b, i) => (b.index = i + 1));
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
