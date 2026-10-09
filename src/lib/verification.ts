// Vérification indépendante d'un résultat d'optimisation.
// Ne réutilise aucune fonction du moteur : tout est recalculé à partir des barres.
import type { Piece, PositionMarge } from "./optimizer";
import type { ResultatMulti } from "./multi-profil";

export interface Verification {
  ok: boolean;
  problemes: string[];
}

const EPS = 1e-6;
const eq = (a: number, b: number) => Math.abs(a - b) < EPS;
const prof = (p?: string) => (p ?? "").trim();

export function verifierResultat(
  resultat: ResultatMulti,
  pieces: Piece[],
  opts: { traitScie: number; positionMarge: PositionMarge },
): Verification {
  const problemes: string[] = [];
  const ts = Math.max(0, opts.traitScie);
  const pieceById = new Map(pieces.map((p) => [p.id, p]));
  const comptes = new Map<string, number>();

  let totBrut = 0, totPieces = 0, totTraits = 0, totMarges = 0, totChutes = 0;

  for (const b of resultat.barres) {
    const nomB = `Barre ${b.index}`;
    const mD = b.margeDebut ?? 0;
    const mF = b.margeFin ?? 0;
    const marge = b.longueurBrute - b.longueurBarre;
    const sommePieces = b.coupes.reduce((s, c) => s + c.longueur, 0);
    const n = b.coupes.length;

    for (const c of b.coupes) {
      comptes.set(c.pieceId, (comptes.get(c.pieceId) ?? 0) + 1);
      const p = pieceById.get(c.pieceId);
      if (!p) problemes.push(`${nomB} : pièce inconnue « ${c.nom} »`);
      else if (prof(p.profil) !== prof(b.profil))
        problemes.push(`${nomB} : « ${p.nom} » (profilé ${prof(p.profil) || "sans"}) placée sur une barre de profilé ${prof(b.profil) || "sans"}`);
      if (p && !eq(p.longueur, c.longueur)) problemes.push(`${nomB} : « ${c.nom} » coupée à ${c.longueur} mm au lieu de ${p.longueur} mm`);
    }

    if (!eq(sommePieces, b.longueurUtilisee))
      problemes.push(`${nomB} : somme des pièces ${sommePieces} mm ≠ ${b.longueurUtilisee} mm annoncés`);

    // Traits attendus : entre pièces + trait final si la chute n'est pas nulle
    const entre = n > 1 ? (n - 1) * ts : 0;
    const resteAvantFinal = b.longueurBarre - sommePieces - entre;
    const final = n > 0 ? Math.min(Math.max(0, resteAvantFinal), ts) : 0;
    if (!eq(b.longueurTraitsScie, entre + final))
      problemes.push(`${nomB} : traits de scie ${b.longueurTraitsScie} mm, attendu ${entre + final} mm`);

    if (sommePieces + entre > b.longueurBarre + EPS)
      problemes.push(`${nomB} : ${sommePieces + entre} mm de pièces et traits dépassent la longueur utile ${b.longueurBarre} mm`);

    if (b.chute < -EPS) problemes.push(`${nomB} : chute négative (${b.chute} mm)`);

    const bilan = mD + mF + sommePieces + b.longueurTraitsScie + b.chute;
    if (!eq(bilan, b.longueurBrute))
      problemes.push(`${nomB} : marges ${mD + mF} + pièces ${sommePieces} + traits ${b.longueurTraitsScie} + chute ${b.chute} = ${bilan} mm ≠ ${b.longueurBrute} mm`);

    if (!eq(mD + mF, marge)) problemes.push(`${nomB} : marges ${mD + mF} mm ≠ ${marge} mm attendus`);
    const mDAttendu = opts.positionMarge === "fin" ? 0 : opts.positionMarge === "deux-bouts" ? marge / 2 : marge;
    if (!eq(mD, mDAttendu))
      problemes.push(`${nomB} : marge de début ${mD} mm incohérente avec la position choisie (${mDAttendu} mm attendus)`);

    // Repères cumulés depuis le bout brut
    let pos = mD;
    let prec = mD;
    b.coupes.forEach((c, i) => {
      if (i > 0) pos += ts;
      pos += c.longueur;
      if (!(pos > prec)) problemes.push(`${nomB} : repère ${i + 1} (${pos} mm) non croissant`);
      prec = pos;
    });
    if (n > 0 && pos > b.longueurBrute - mF + EPS)
      problemes.push(`${nomB} : dernier repère ${pos} mm dépasse la barre (${b.longueurBrute - mF} mm disponibles)`);

    totBrut += b.longueurBrute;
    totPieces += sommePieces;
    totTraits += b.longueurTraitsScie;
    totMarges += mD + mF;
    totChutes += b.chute;
  }

  for (const p of pieces) {
    if (p.quantite <= 0 || p.longueur <= 0) continue;
    const c = comptes.get(p.id) ?? 0;
    if (c !== p.quantite) problemes.push(`« ${p.nom} » : placée ${c} fois au lieu de ${p.quantite}`);
  }

  const r = resultat;
  if (!eq(r.longueurTotale, totBrut)) problemes.push(`Bilan : longueur totale ${r.longueurTotale} mm ≠ ${totBrut} mm des barres`);
  if (!eq(r.longueurUtile, totPieces)) problemes.push(`Bilan : pièces ${r.longueurUtile} mm ≠ ${totPieces} mm placés`);
  if (!eq(r.longueurTraitsScie, totTraits)) problemes.push(`Bilan : traits ${r.longueurTraitsScie} mm ≠ ${totTraits} mm`);
  if (!eq(r.longueurMarges, totMarges)) problemes.push(`Bilan : marges ${r.longueurMarges} mm ≠ ${totMarges} mm`);
  if (!eq(r.longueurChutes, totChutes)) problemes.push(`Bilan : chutes ${r.longueurChutes} mm ≠ ${totChutes} mm`);
  if (!eq(r.longueurTotale, r.longueurUtile + r.longueurTraitsScie + r.longueurMarges + r.longueurChutes))
    problemes.push("Bilan matière global : la somme ne boucle pas");
  if (r.nbBarres !== r.barres.length) problemes.push(`Nombre de barres annoncé ${r.nbBarres} ≠ ${r.barres.length}`);

  return { ok: problemes.length === 0, problemes };
}
