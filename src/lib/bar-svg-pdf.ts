import type { jsPDF } from "jspdf";
import type { BarreOptimisee } from "./optimizer";
import { segmentsBarre, placerLibelles, cotesFinSeries, libelleCote, type CotePlacee } from "./bar-drawing";
import { seriesPieces, DETAIL_COTES_RUBAN, type MethodeCoupe } from "./cut-method";
import { themeHex } from "./visual-theme";
import { hexColorForPieceId } from "./piece-colors";
import { formatNombre } from "./format-number";
import { etiquettesPieces, MM_PER_PX, LABEL_BASE_PX } from "./piece-labels";


const escapeXml = (value: string) => value.replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c] ?? c);

/** PDF only: single-piece dimensions never slide beneath a neighbouring brace. */
export function cotesPiecesSeulesPDF(
  series: { fin: number; quantite: number }[], position: (mm: number) => number,
  largeur: number, mesurer: (texte: string) => number,
  reservees: { labelX: number; largeur: number }[], espace = 1.2,
): CotePlacee[] {
  const occupees = [...reservees];
  const retenues: CotePlacee[] = [];
  for (const serie of [...series].reverse()) {
    if (serie.quantite !== 1) continue;
    const x = position(serie.fin), w = mesurer(libelleCote(serie.fin));
    if (x - w / 2 < 0 || x + w / 2 > largeur) continue;
    if (occupees.some(c => Math.abs(c.labelX - x) < (c.largeur + w) / 2 + espace)) continue;
    retenues.push({ valeur: serie.fin, x, labelX: x, largeur: w, niveau: 0 });
    occupees.push({ labelX: x, largeur: w });
  }
  return retenues.reverse();
}

export function dessinBarrePDF(doc: jsPDF, barre: BarreOptimisee, traitScie: number, ids: string[], largeur: number, conserver = false, masquerTypes = false, methode: MethodeCoupe = "butee") {
  const PDF_INK = { text: themeHex("piece-ink"), paper: themeHex("cut-separator"), waste: themeHex("waste"), hatch: themeHex("hatch"), reusable: themeHex("offcut-paper"), reusableHatch: themeHex("warning"), kerf: themeHex("cut-separator") };
  const h = 14;
  const x = (mm: number) => mm / barre.longueurBrute * largeur;
  const segments = segmentsBarre(barre, traitScie);
  doc.setFont("PlexSans", "normal");
  const measure = (text: string, size: number) => {
    doc.setFontSize(size * 0.75);
    return doc.getTextWidth(text) / MM_PER_PX;
  };
  const labels = etiquettesPieces(segments, mm => x(mm) / MM_PER_PX, largeur / MM_PER_PX, h / MM_PER_PX, measure);
  const refs = labels.filter(l => !l.lignes.length);
  const top = refs.length ? ((Math.max(...refs.map(l => l.niveau)) + 1) * 16 + 4) * MM_PER_PX : 0;
  const elements: string[] = [];
  for (const s of segments) {
    const left = x(s.debut), w = x(s.longueur);
    const fill = s.type === "piece" ? hexColorForPieceId(s.pieceId ?? "", ids) : s.type === "scie" ? PDF_INK.kerf : s.type === "reutilisable" && !masquerTypes ? PDF_INK.reusable : PDF_INK.waste;
    elements.push(`<rect x="${left}" y="0" width="${w}" height="${h}" fill="${fill}"/>`);
    if (["marge", "reutilisable", "dechet"].includes(s.type)) {
      const step = s.type === "marge" ? 1.5 : 3;
      const stroke = s.type === "reutilisable" && !masquerTypes ? PDF_INK.reusableHatch : PDF_INK.hatch;
      for (let d = -h; d < w; d += step) {
        const a = Math.max(0, -d), b = Math.min(h, w - d);
        const yy = (v: number) => s.type === "reutilisable" ? h - v : v;
        if (b > a) elements.push(`<line x1="${left + d + a}" y1="${yy(a)}" x2="${left + d + b}" y2="${yy(b)}" stroke="${stroke}" stroke-width="${s.type === "reutilisable" ? 0.265 : 0.1}"/>`);
      }
    }
    if (s.type === "piece") {
      elements.push(`<path d="M${left} 0V${h}M${left + w} 0V${h}" stroke="${PDF_INK.paper}" stroke-width="0.53" fill="none"/>`);
    } else if ((s.type === "reutilisable" || s.type === "dechet") && w > 14) {
      // Etiquette sur fond blanc : sinon les hachures (surtout les bleues) rendent le texte illisible
      const texte = `Chute ${formatNombre(s.longueur)} mm`;
      doc.setFontSize(7); // 2,47 mm = 7 pt : meme taille que le texte du dessin
      const lt = doc.getTextWidth(texte) + 2;
      elements.push(`<rect x="${left + w / 2 - lt / 2}" y="5.6" width="${lt}" height="3.4" rx="0.6" fill="${PDF_INK.paper}"/>`);
      elements.push(`<text x="${left + w / 2}" y="8" font-size="2.47" fill="${PDF_INK.text}" text-anchor="middle">${texte}</text>`);
    }
    if (s.type === "reutilisable" && conserver) elements.push(`<rect x="${left + 0.35}" y="0.35" width="${Math.max(0, w - 0.7)}" height="${h - 0.7}" fill="none" stroke="${themeHex("pdf-print-ink")}" stroke-width="0.7"/>`);
  }
  labels.forEach((label, i) => {
    const cx = (label.gauche + label.droite) / 2 * MM_PER_PX;
    if (!label.lignes.length) {
      const text = String(label.ligneTableau), width = measure(text, LABEL_BASE_PX) * MM_PER_PX;
      const center = Math.max(width / 2, Math.min(largeur - width / 2, cx));
      const y = (-8 - label.niveau * 16) * MM_PER_PX;
      elements.push(`<path d="M${cx} 0V${y + 5 * MM_PER_PX}H${center}" stroke="${PDF_INK.text}" stroke-width="0.13" fill="none"/><text x="${center - width / 2}" y="${y + LABEL_BASE_PX * MM_PER_PX * 0.35}" font-size="${LABEL_BASE_PX * MM_PER_PX}" text-anchor="start" fill="${PDF_INK.text}">${text}</text>`);
      return;
    }
    const size = label.taille * MM_PER_PX;
    elements.push(`<defs><clipPath id="piece-label-${i}"><rect x="${(label.gauche + 4) * MM_PER_PX}" y="0" width="${Math.max(0, label.droite - label.gauche - 8) * MM_PER_PX}" height="${h}"/></clipPath></defs>`);
    label.lignes.forEach((text, line) => {
      const y = h / 2 + (line - (label.lignes.length - 1) / 2) * size * 1.2 + size * 0.35;
      const left = cx - measure(text, label.taille) * MM_PER_PX / 2;
      elements.push(`<text x="${left}" y="${y}" font-size="${size}" letter-spacing="0" font-family="PlexSans" font-weight="normal" fill="${PDF_INK.text}" text-anchor="start" clip-path="url(#piece-label-${i})">${escapeXml(text)}</text>`);
    });
  });
  doc.setFont("PlexSans", "normal"); doc.setFontSize(6.5);
  const pieces = segments.filter(s => s.type === "piece");
  const series = seriesPieces(pieces);
  const mesurer = (txt: string) => doc.getTextWidth(txt);
  let yCotes = h;
  const reservees: { labelX: number; largeur: number }[] = [];
  if (methode === "butee") {
    // Butee : accolade « 4 x 1200 » seulement ; les reperes cumules restent dans le tableau
    const groupes = series.filter(s => s.quantite > 1);
    const accolades = placerLibelles(groupes.map(s => ({ valeur: s.fin, x: (x(s.debut) + x(s.fin)) / 2, texte: `${s.quantite} x ${formatNombre(s.longueur)}` })), largeur, texte => mesurer(texte));
    let rangs = 0;
    accolades.forEach((a, i) => {
      const s = groupes[i], l = x(s.debut) + 0.3, r = x(s.fin) - 0.3, m = (l + r) / 2, y0 = h + 0.8, y1 = h + 2.2;
      rangs = Math.max(rangs, a.niveau + 1);
      const ty = y1 + 3.6 + a.niveau * 4.5;
      elements.push(`<path d="M${l} ${y0}Q${l} ${y1} ${l + 1} ${y1}H${m - 0.8}L${m} ${y1 + 0.8}L${m + 0.8} ${y1}H${r - 1}Q${r} ${y1} ${r} ${y0}" stroke="${PDF_INK.text}" stroke-width="0.18" fill="none"/>`);
      if (a.niveau > 0 || Math.abs(a.labelX - m) > 0.5) elements.push(`<path d="M${m} ${y1 + 0.8}L${a.labelX} ${ty - 2}" stroke="${PDF_INK.hatch}" stroke-width="0.1" fill="none"/>`);
      elements.push(`<text x="${a.labelX}" y="${ty}" font-size="2.293" font-family="PlexSans" font-weight="bold" text-anchor="middle" fill="${PDF_INK.text}">${escapeXml(a.texte)}</text>`);
      reservees.push({ labelX: a.labelX, largeur: a.largeur });
    });
    if (rangs) yCotes = h + 2.2 + rangs * 4.5 + 0.5;
  }
  const cotes = methode === "butee"
    ? []
    : cotesFinSeries(series, x, largeur, mesurer, 1.2);
  for (const cote of cotes) {
    const yy = yCotes + 4.2;
    const coude = yCotes + 1.2;
    elements.push(`<path d="M${cote.x} ${h}V${coude}L${cote.labelX} ${yy - 2.4}" stroke="${PDF_INK.hatch}" stroke-width="0.1" fill="none"/><text x="${cote.labelX}" y="${yy}" font-size="2.293" font-family="PlexSans" font-weight="normal" text-anchor="middle" fill="${PDF_INK.text}">${formatNombre(cote.valeur)}</text>`);
  }
  if (methode === "ruban") elements.push(`<text x="0" y="${yCotes + 9}" font-size="2.293" fill="${PDF_INK.text}">${DETAIL_COTES_RUBAN}</text>`);
  const hauteur = top + yCotes + (methode === "ruban" ? 11 : 2);
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${largeur}" height="${hauteur}" viewBox="0 0 ${largeur} ${hauteur}" font-family="PlexSans" style="font-variant-numeric:tabular-nums"><g transform="translate(0 ${top})">${elements.join("")}</g></svg>`;
  return { source, hauteur };
}