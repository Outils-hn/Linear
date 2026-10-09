export type Strategie = "min-barres" | "priorite-stock";
export type PositionMarge = "debut" | "fin" | "deux-bouts";

export const POSITION_MARGE_LABELS: Record<PositionMarge, string> = {
  debut: "Marge en début de barre",
  fin: "Marge en fin de barre",
  "deux-bouts": "Répartie aux deux bouts",
};

export interface Piece {
  id: string;
  nom: string;
  longueur: number;
  quantite: number;
  profil?: string;
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
  margeDebut?: number;
  margeFin?: number;
  profil?: string;
  /** Seuil appliqué pour classer la chute (mm). */
  seuilChute?: number;
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
  rendementHorsChutesReutilisables: number;
  longueurTraitsScie: number;
  longueurMarges: number;
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

// FFD classique sur une longueur unique (sert de borne supérieure / fallback)
function optimiserFFD(
  items: Item[],
  poolDefaut: PoolBarre,
  traitScie: number,
): BarreOptimisee[] {
  const tri = [...items].sort((a, b) => b.longueur - a.longueur);
  const barres: BarreOptimisee[] = [];
  for (const item of tri) {
    let place = false;
    // Best-Fit Decreasing : on choisit la barre qui laissera le moins de chute
    let meilleur: BarreOptimisee | null = null;
    let meilleurReste = Infinity;
    for (const b of barres) {
      const coutTrait = b.coupes.length > 0 ? traitScie : 0;
      const reste = b.longueurBarre - b.longueurUtilisee - b.longueurTraitsScie;
      const apres = reste - item.longueur - coutTrait;
      if (apres >= 0 && apres < meilleurReste) {
        meilleur = b;
        meilleurReste = apres;
      }
    }
    if (meilleur && placerSurBarre(meilleur, item, traitScie)) {
      place = true;
    }
    if (!place) {
      const nb = newBarre(barres.length + 1, poolDefaut);
      placerSurBarre(nb, item, traitScie);
      barres.push(nb);
    }
  }
  return barres;
}

// ------------------------------------------------------------------
// Solveur "cutting-stock" par branch-and-bound sur patrons de coupe.
// Utilisé quand toutes les barres ont la même longueur utile
// (cas standard "min-barres" sans stock multi-longueurs).
// ------------------------------------------------------------------

interface BnBResult {
  bars: number[][]; // séquence de patrons (un par barre), chaque patron = nb pièces par longueur unique
  bestFound: number;
  exhaustive: boolean;
}

function enumPatterns(
  lengths: number[],
  capacity: number,
  kerf: number,
  maxCounts: number[],
  pivot: number,
): number[][] {
  const n = lengths.length;
  const out: number[][] = [];
  const cur = new Array(n).fill(0);
  function rec(idx: number, usedLen: number, count: number) {
    if (idx === n) {
      if (count > 0) out.push([...cur]);
      return;
    }
    const minC = idx === pivot ? 1 : 0;
    const maxC = idx < pivot ? 0 : maxCounts[idx];
    for (let c = minC; c <= maxC; c++) {
      let addLen = 0;
      if (c > 0) addLen = c * lengths[idx] + (count > 0 ? c : c - 1) * kerf;
      if (usedLen + addLen > capacity) break;
      cur[idx] = c;
      rec(idx + 1, usedLen + addLen, count + c);
    }
    cur[idx] = 0;
  }
  rec(0, 0, 0);
  return out;
}

function patternFill(p: number[], lengths: number[], kerf: number): number {
  let total = 0;
  let count = 0;
  for (let i = 0; i < p.length; i++) {
    total += p[i] * lengths[i];
    count += p[i];
  }
  if (count > 1) total += (count - 1) * kerf;
  return total;
}

function solveCuttingStockBnB(
  lengths: number[], // triées desc
  demands: number[],
  capacity: number,
  kerf: number,
  upperBound: number,
  maxNodes = 1_000_000,
  maxMs = 800,
): BnBResult {
  const n = lengths.length;
  let best = upperBound;
  let bestBars: number[][] | null = null;
  const stack: number[][] = [];
  let nodes = 0;
  const deadline = Date.now() + maxMs;
  let exhaustive = true;

  function dfs(remaining: number[], barsSoFar: number) {
    if (nodes > maxNodes || Date.now() > deadline) {
      exhaustive = false;
      return;
    }
    nodes++;
    if (barsSoFar >= best) return;

    // pivot = première longueur restante (la plus grande)
    let pivot = -1;
    for (let i = 0; i < n; i++) {
      if (remaining[i] > 0) {
        pivot = i;
        break;
      }
    }
    if (pivot === -1) {
      best = barsSoFar;
      bestBars = stack.map((p) => [...p]);
      return;
    }

    // Lower bound : longueur totale restante / capacité
    let lenRem = 0;
    for (let i = 0; i < n; i++) lenRem += remaining[i] * lengths[i];
    const lb = Math.ceil(lenRem / capacity);
    if (barsSoFar + lb >= best) return;

    const patterns = enumPatterns(lengths, capacity, kerf, remaining, pivot);
    // Trier : patrons les plus remplis d'abord (resserre la borne supérieure)
    patterns.sort((a, b) => patternFill(b, lengths, kerf) - patternFill(a, lengths, kerf));

    for (const p of patterns) {
      stack.push(p);
      const newRem = remaining.slice();
      for (let i = 0; i < n; i++) newRem[i] -= p[i];
      dfs(newRem, barsSoFar + 1);
      stack.pop();
      if (nodes > maxNodes || Date.now() > deadline) return;
    }
  }

  dfs(demands.slice(), 0);
  return {
    bars: bestBars ?? [],
    bestFound: best,
    exhaustive,
  };
}

// ------------------------------------------------------------------
// Solveur "subset-LP" : énumère TOUS les patrons faisables, puis pour
// chaque sous-ensemble de taille = nb de types de pièces, résout le
// système linéaire et garde la solution entière non-négative qui
// minimise le nombre total de barres. C'est l'approche classique de
// génération de colonnes en cutting-stock 1D — exacte quand il existe
// une solution-vertex correspondant aux demandes exactes.
// ------------------------------------------------------------------

function enumAllPatterns(
  lengths: number[],
  capacity: number,
  kerf: number,
  maxCounts: number[],
): number[][] {
  const n = lengths.length;
  const out: number[][] = [];
  const cur = new Array(n).fill(0);
  function rec(idx: number, usedLen: number, count: number) {
    if (idx === n) {
      if (count > 0) out.push([...cur]);
      return;
    }
    const maxC = maxCounts[idx];
    for (let c = 0; c <= maxC; c++) {
      let addLen = 0;
      if (c > 0) addLen = c * lengths[idx] + (count > 0 ? c : c - 1) * kerf;
      if (usedLen + addLen > capacity) break;
      cur[idx] = c;
      rec(idx + 1, usedLen + addLen, count + c);
    }
    cur[idx] = 0;
  }
  rec(0, 0, 0);
  return out;
}

// Résolution Gauss-Jordan pour petits systèmes n x n. Renvoie null si
// singulier ou si la solution n'est pas entière non-négative (tolérance).
function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  const M: number[][] = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    // pivot
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    }
    if (Math.abs(M[piv][col]) < 1e-9) return null;
    [M[col], M[piv]] = [M[piv], M[col]];
    const pivVal = M[col][col];
    for (let c = col; c <= n; c++) M[col][c] /= pivVal;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }
  const x = new Array(n);
  for (let i = 0; i < n; i++) {
    const v = M[i][n];
    const rounded = Math.round(v);
    if (Math.abs(v - rounded) > 1e-6) return null;
    if (rounded < 0) return null;
    x[i] = rounded;
  }
  return x;
}

interface SubsetResult {
  bars: number[][]; // séquence de patrons utilisés (répétés selon multiplicités)
  total: number;
}

function solveCuttingStockSubset(
  lengths: number[],
  demands: number[],
  capacity: number,
  kerf: number,
  upperBound: number,
  maxMs = 1200,
): SubsetResult | null {
  const n = lengths.length;
  const patterns = enumAllPatterns(lengths, capacity, kerf, demands);
  if (patterns.length === 0) return null;
  const deadline = Date.now() + maxMs;
  let best = upperBound;
  let bestBars: number[][] | null = null;

  // Indices triés : on essaie d'abord les patrons les plus remplis pour
  // resserrer la borne rapidement.
  const order = patterns
    .map((p, i) => ({ i, fill: patternFill(p, lengths, kerf) }))
    .sort((a, b) => b.fill - a.fill)
    .map((o) => o.i);

  // Cas k=1 : un seul patron couvre toute la demande.
  for (const i of order) {
    const p = patterns[i];
    let mult = -1;
    let ok = true;
    for (let t = 0; t < n; t++) {
      if (demands[t] === 0) continue;
      if (p[t] === 0) {
        ok = false;
        break;
      }
      const m = demands[t] / p[t];
      if (m !== Math.floor(m)) {
        ok = false;
        break;
      }
      if (mult === -1) mult = m;
      else if (mult !== m) {
        ok = false;
        break;
      }
    }
    if (ok && mult >= 0 && mult < best) {
      best = mult;
      bestBars = new Array(mult).fill(0).map(() => [...p]);
    }
  }

  // Cas k = n : sous-ensembles de taille n (système carré).
  // Pour limiter le combinatoire on plafonne le nombre de patrons examinés.
  const MAX_PATS = 60;
  const pool = order.slice(0, Math.min(order.length, MAX_PATS));

  function combine(size: number, start: number, picked: number[]) {
    if (Date.now() > deadline) return;
    if (picked.length === size) {
      // Construire A (n x size) puis résoudre
      const A: number[][] = [];
      for (let t = 0; t < n; t++) {
        const row: number[] = [];
        for (const pi of picked) row.push(patterns[pi][t]);
        A.push(row);
      }
      const x = solveLinearSystem(A, demands);
      if (x) {
        const total = x.reduce((s, v) => s + v, 0);
        if (total < best) {
          best = total;
          const bars: number[][] = [];
          for (let k = 0; k < picked.length; k++) {
            for (let r = 0; r < x[k]; r++) bars.push([...patterns[picked[k]]]);
          }
          bestBars = bars;
        }
      }
      return;
    }
    for (let i = start; i < pool.length; i++) {
      picked.push(pool[i]);
      combine(size, i + 1, picked);
      picked.pop();
      if (Date.now() > deadline) return;
    }
  }

  // On teste les tailles 2..n (et n+1 si possible) pour couvrir aussi les
  // cas où une base de taille < n suffit (demande nulle pour un type).
  const activeTypes = demands.filter((d) => d > 0).length;
  const maxSize = Math.min(n, activeTypes);
  for (let size = 2; size <= maxSize; size++) {
    combine(size, 0, []);
    if (Date.now() > deadline) break;
  }

  if (!bestBars) return null;
  return { bars: bestBars, total: best };
}



function optimiserMinBarres(
  items: Item[],
  poolDefaut: PoolBarre,
  traitScie: number,
): BarreOptimisee[] {
  // 1) Solution de base (BFD) qui servira aussi de borne supérieure.
  const ffd = optimiserFFD(items, poolDefaut, traitScie);

  // 2) Regrouper les items par longueur unique pour le solveur de patrons.
  //    On garde une file par longueur pour préserver les noms / pieceId.
  const byLen = new Map<number, Item[]>();
  for (const it of items) {
    if (it.longueur <= 0) continue;
    const arr = byLen.get(it.longueur) ?? [];
    arr.push(it);
    byLen.set(it.longueur, arr);
  }
  const uniqueLens = [...byLen.keys()].sort((a, b) => b - a);
  if (uniqueLens.length === 0) return ffd;

  // Le solveur de patrons suppose une seule longueur utile : la barre par défaut.
  // (Le mode "priorité stock" gère les longueurs multiples séparément.)
  const capacity = poolDefaut.longueurUtile;
  const demands = uniqueLens.map((L) => byLen.get(L)!.length);

  // Garde-fou : si trop de longueurs distinctes, on s'en tient au FFD/BFD pour
  // éviter une explosion combinatoire (rare en pratique).
  if (uniqueLens.length > 8) return ffd;

  // 2a) Solveur "subset-LP" : trouve souvent l'optimum exact très vite.
  let bestBars: number[][] = [];
  let bestCount = ffd.length;

  const subset = solveCuttingStockSubset(
    uniqueLens,
    demands,
    capacity,
    traitScie,
    ffd.length,
  );
  if (subset && subset.total < bestCount) {
    bestBars = subset.bars;
    bestCount = subset.total;
  }

  // 2b) Branch-and-bound, avec la meilleure borne supérieure trouvée.
  const bnb = solveCuttingStockBnB(
    uniqueLens,
    demands,
    capacity,
    traitScie,
    bestCount,
  );
  if (bnb.bars && bnb.bars.length > 0 && bnb.bestFound < bestCount) {
    bestBars = bnb.bars;
    bestCount = bnb.bestFound;
  }

  if (bestBars.length === 0 || bestCount >= ffd.length) {
    return ffd;
  }
  const result = { bars: bestBars };

  // 3) Reconstruire les BarreOptimisee à partir de la séquence de patrons.
  const queues = new Map<number, Item[]>();
  for (const L of uniqueLens) queues.set(L, [...byLen.get(L)!]);

  const barres: BarreOptimisee[] = [];
  result.bars.forEach((pattern, idx) => {
    const b = newBarre(idx + 1, poolDefaut);
    // Construire la liste des coupes (longueurs décroissantes pour l'esthétique)
    const coupes: Item[] = [];
    for (let i = 0; i < uniqueLens.length; i++) {
      const L = uniqueLens[i];
      const count = pattern[i];
      const q = queues.get(L)!;
      for (let k = 0; k < count; k++) {
        const it = q.shift();
        if (it) coupes.push(it);
      }
    }
    for (const it of coupes) placerSurBarre(b, it, traitScie);
    barres.push(b);
  });

  // Sécurité : si toutes les pièces ne sont pas placées (bug de reconstruction),
  // on retombe sur le FFD.
  const placedCount = barres.reduce((s, b) => s + b.coupes.length, 0);
  if (placedCount !== items.filter((i) => i.longueur > 0 && i.longueur <= capacity).length) {
    return ffd;
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
  /** Mode Ultra (SmartCut) : active le solveur cutting-stock avancé. Sinon FFD rapide. */
  modeUltra?: boolean;
  positionMarge?: PositionMarge;
  /** Chute mini à conserver (mm), appliquée après placement. */
  seuilChuteReutilisable?: number;
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
    modeUltra = false,
    positionMarge = "debut",
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
      rendementHorsChutesReutilisables: 0,
      longueurTraitsScie: 0,
      longueurMarges: 0,
      pourcentageChutes: 0,
    };
  }

  switch (strategie) {
    case "min-barres":
      barres = modeUltra
        ? optimiserMinBarres(items, poolDefaut, traitScie)
        : optimiserFFD(items, poolDefaut, traitScie);
      break;
    case "priorite-stock":
      barres = optimiserPrioriteStock(items, poolDefaut, poolsStock, traitScie);
      break;
  }

  for (const b of barres) {
    // Comptabilité après optimisation uniquement : les patrons et placements
    // restent inchangés. Si le reste est plus étroit que la lame, la partie
    // de lame hors barre ne consomme pas de matière.
    const traitFinal = b.coupes.length > 0 ? Math.min(b.chute, Math.max(0, traitScie)) : 0;
    b.longueurTraitsScie += traitFinal;
    b.chute = Math.max(0, b.chute - traitFinal);
    const marge = Math.max(0, b.longueurBrute - b.longueurBarre);
    b.margeDebut = positionMarge === "fin" ? 0 : positionMarge === "deux-bouts" ? marge / 2 : marge;
    b.margeFin = marge - b.margeDebut;
    const seuil = options.seuilChuteReutilisable ?? SEUIL_CHUTE_REUTILISABLE;
    b.seuilChute = seuil;
    b.chuteReutilisable = b.chute > 0 && b.chute >= seuil;
  }

  const nbBarres = barres.length;
  const nbBarresStock = barres.filter((b) => b.origine === "stock").length;
  const nbBarresDefaut = nbBarres - nbBarresStock;
  const longueurTotale = barres.reduce((s, b) => s + b.longueurBrute, 0);
  const longueurUtile = barres.reduce((s, b) => s + b.longueurUtilisee, 0);
  const longueurTraitsScie = barres.reduce((s, b) => s + b.longueurTraitsScie, 0);
  const longueurMarges = barres.reduce((s, b) => s + b.longueurBrute - b.longueurBarre, 0);
  const longueurChutes = barres.reduce((s, b) => s + b.chute, 0);
  const longueurChutesReutilisables = barres
    .filter((b) => b.chuteReutilisable)
    .reduce((s, b) => s + b.chute, 0);
  const longueurDechets = longueurChutes - longueurChutesReutilisables;
  const rendement = longueurTotale > 0 ? (longueurUtile / longueurTotale) * 100 : 0;
  const longueurConsommee = longueurTotale - longueurChutesReutilisables;
  const rendementHorsChutesReutilisables = longueurConsommee > 0 ? (longueurUtile / longueurConsommee) * 100 : 0;
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
    rendementHorsChutesReutilisables,
    longueurTraitsScie,
    longueurMarges,
    pourcentageChutes,
  };
}
