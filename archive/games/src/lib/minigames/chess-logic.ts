/** 체스 공유 헬퍼 — chess.js 래퍼 (FIDE 규칙) */

import { Chess, type Square } from "chess.js";

export const CHESS_TURN_MS = 30_000;
export const FIFTY_MOVE_HALFMOVES = 100;

export type ChessPromotion = "q" | "r" | "b" | "n";
export type ChessMoveInput = {
  from: string;
  to: string;
  promotion?: ChessPromotion;
};

export type ChessSideMove =
  | ChessMoveInput
  | { resign: true }
  | { drawOffer: true }
  | { acceptDraw: true }
  | { declineDraw: true };

export type ChessMoveVerbose = {
  from: string;
  to: string;
  san: string;
  flags: string;
  promotion?: string;
};

export function createChessGame(fen?: string) {
  return fen ? new Chess(fen) : new Chess();
}

export function cloneChessFromFen(fen: string) {
  return new Chess(fen);
}

export function getTurnUserId(fen: string, whiteUserId: string, blackUserId: string): string {
  const chess = new Chess(fen);
  return chess.turn() === "w" ? whiteUserId : blackUserId;
}

export function getLegalTargets(fen: string, from: string): ChessMoveVerbose[] {
  const chess = new Chess(fen);
  try {
    return chess.moves({ square: from as Square, verbose: true }) as ChessMoveVerbose[];
  } catch {
    return [];
  }
}

export function isPromotionMove(fen: string, from: string, to: string): boolean {
  const moves = getLegalTargets(fen, from);
  return moves.some((m) => m.to === to && m.flags.includes("p"));
}

export function tryChessMove(
  fen: string,
  move: ChessMoveInput
): { ok: true; fen: string; san: string; result: ChessMoveVerbose } | { ok: false; reason: string } {
  const chess = new Chess(fen);
  try {
    const result = chess.move({
      from: move.from as Square,
      to: move.to as Square,
      promotion: move.promotion ?? "q",
    });
    if (!result) return { ok: false, reason: "불법 수입니다." };
    return {
      ok: true,
      fen: chess.fen(),
      san: result.san,
      result: result as unknown as ChessMoveVerbose,
    };
  } catch {
    return { ok: false, reason: "불법 수입니다." };
  }
}

export function getChessStatus(fen: string) {
  const chess = new Chess(fen);
  return {
    turn: chess.turn(),
    isCheck: chess.inCheck(),
    isCheckmate: chess.isCheckmate(),
    isStalemate: chess.isStalemate(),
    isDraw: chess.isDraw(),
    isGameOver: chess.isGameOver(),
  };
}

export const CHESS_PIECE_UNICODE: Record<string, string> = {
  wp: "♙",
  wr: "♖",
  wn: "♘",
  wb: "♗",
  wq: "♕",
  wk: "♔",
  bp: "♟",
  br: "♜",
  bn: "♞",
  bb: "♝",
  bq: "♛",
  bk: "♚",
};

export function pieceUnicode(color: "w" | "b", type: string): string {
  return CHESS_PIECE_UNICODE[`${color}${type}`] ?? type;
}

export function squareToCoords(sq: string): { file: number; rank: number } {
  return { file: sq.charCodeAt(0) - 97, rank: parseInt(sq[1] ?? "1", 10) - 1 };
}

export function coordsToSquare(file: number, rank: number): string {
  return `${"abcdefgh"[file]}${rank + 1}`;
}

export function parseHalfmoveClock(fen: string): number {
  const parts = fen.split(" ");
  const n = parseInt(parts[4] ?? "0", 10);
  return Number.isFinite(n) ? n : 0;
}

export function fiftyMoveInfo(halfmove: number) {
  return {
    halfmove,
    limit: FIFTY_MOVE_HALFMOVES,
    warning: halfmove >= 80,
    reached: halfmove >= FIFTY_MOVE_HALFMOVES,
  };
}

export function getDrawHint(fen: string): string | null {
  const chess = new Chess(fen);
  if (!chess.isDraw()) return null;
  const half = parseHalfmoveClock(fen);
  if (half >= FIFTY_MOVE_HALFMOVES) return "50수 규칙";
  if (chess.isInsufficientMaterial()) return "기물 부족";
  if (chess.isThreefoldRepetition()) return "3회 반복";
  if (chess.isStalemate()) return "스테일메이트";
  return "무승부";
}
