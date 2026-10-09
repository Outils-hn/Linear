// Export reads the same CSS tokens as the screen; no second palette to maintain.
export function themeHex(token: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim();
}

export function themeRgb(token: string): [number, number, number] {
  const hex = themeHex(token).replace("#", "");
  return [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16)) as [number, number, number];
}