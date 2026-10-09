// Palette partagée écran + PDF (mêmes couleurs exactes)
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
  return PALETTE_HEX[idx % PALETTE_HEX.length];
}

export function hexColorForPieceId(pieceId: string, allIds: string[]): string {
  const idx = Math.max(0, allIds.indexOf(pieceId));
  return PALETTE_HEX[idx % PALETTE_HEX.length];
}
