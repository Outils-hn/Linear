const PALETTE = [
  "var(--piece-1)",
  "var(--piece-2)",
  "var(--piece-3)",
  "var(--piece-4)",
  "var(--piece-5)",
  "var(--piece-6)",
  "var(--piece-7)",
  "var(--piece-8)",
];

// Hex equivalents for PDF
const PALETTE_HEX = [
  "#4a90d9",
  "#5fb47a",
  "#6554bf",
  "#c47ac0",
  "#4ab0b6",
  "#bf3657",
  "#9a7ad9",
  "#7ab06a",
];

export function colorForPieceId(pieceId: string, allIds: string[]): string {
  const idx = Math.max(0, allIds.indexOf(pieceId));
  return PALETTE[idx % PALETTE.length];
}

export function hexColorForPieceId(pieceId: string, allIds: string[]): string {
  const idx = Math.max(0, allIds.indexOf(pieceId));
  return PALETTE_HEX[idx % PALETTE_HEX.length];
}
