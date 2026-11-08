// Formateurs gardes en memoire : en creer un a chaque nombre affiche coutait cher
// (plusieurs centaines de ms sur un gros resultat).
const cache = new Map<string, Intl.NumberFormat>();

/** Presentation only: retain precision while removing binary floating-point noise. */
export function formatNombre(value: number, decimales?: number): string {
  const cle = String(decimales ?? "");
  let f = cache.get(cle);
  if (!f) {
    f = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: decimales ?? 0, maximumFractionDigits: decimales ?? 6 });
    cache.set(cle, f);
  }
  // Format suisse de la famille d'applis : apostrophe pour les milliers (« 1'200 »), virgule decimale
  // Jamais « -0 » : une valeur qui s'arrondit a zero s'affiche 0
  const v = decimales !== undefined && Math.abs(value) < 0.5 * 10 ** -decimales ? 0 : Object.is(value, -0) ? 0 : value;
  return f.format(v).replace(/[\s\u00a0\u202f]/g, "'");
}
