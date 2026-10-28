// Export reads the same CSS tokens as the screen; no second palette to maintain.
export function themeHex(token: string): string {
  if (typeof document === "undefined") return "";
  // Le PDF garde toujours les couleurs claires : lecture sans la classe « dark » (rien n'est redessine entre-temps)
  const root = document.documentElement;
  const dark = root.classList.contains("dark");
  if (dark) root.classList.remove("dark");
  const value = getComputedStyle(root).getPropertyValue(`--${token}`).trim();
  if (dark) root.classList.add("dark");
  return value;
}

export function themeRgb(token: string): [number, number, number] {
  const raw = themeHex(token).replace("#", "");
  const hex = raw.length === 3 ? raw.split("").map(char => char + char).join("") : raw;
  return [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16)) as [number, number, number];
}