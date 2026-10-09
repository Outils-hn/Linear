import { themeHex } from "./visual-theme";

const pieceToken = (pieceId: string, allIds: string[]) => `piece-${Math.max(0, allIds.indexOf(pieceId)) % 8 + 1}`;

export function colorForPieceId(pieceId: string, allIds: string[]): string {
  return `var(--${pieceToken(pieceId, allIds)})`;
}

export function hexColorForPieceId(pieceId: string, allIds: string[]): string {
  return themeHex(pieceToken(pieceId, allIds));
}
