/** Presentation only: retain precision while removing binary floating-point noise. */
export function formatNombre(value: number, decimales?: number): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimales ?? 0,
    maximumFractionDigits: decimales ?? 6,
  }).format(value);
}