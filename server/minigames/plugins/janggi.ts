/** 장기 MVP — 9×10 간소화 (마·상·사·차·포·졸·장) */

const W = 9;
const H = 10;

type Piece = string; // e.g. "rK" red king
type JanggiBoard = (Piece | null)[][];

function emptyBoard(): JanggiBoard {
  return Array.from({ length: H }, () => Array.from({ length: W }, () => null));
}

function initialJanggi(): JanggiBoard {
  const b = emptyBoard();
  const red = [
    ["rC", "rE", "rE", "rG", "rK", "rG", "rE", "rE", "rC"],
    [null, null, null, null, null, null, null, null, null],
    [null, "rA", null, null, null, null, null, "rA", null],
    ["rP", null, "rP", null, "rP", null, "rP", null, "rP"],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    ["bP", null, "bP", null, "bP", null, "bP", null, "bP"],
    [null, "bA", null, null, null, null, null, "bA", null],
    [null, null, null, null, null, null, null, null, null],
    ["bC", "bE", "bE", "bG", "bK", "bG", "bE", "bE", "bC"],
  ];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      b[y]![x] = red[y]![x] ?? null;
    }
  }
  return b;
}

function isRed(p: Piece) {
  return p.startsWith("r");
}

function findKing(board: JanggiBoard, red: boolean): { x: number; y: number } | null {
  const k = red ? "rK" : "bK";
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (board[y]![x] === k) return { x, y };
    }
  }
  return null;
}

function canMoveSimple(board: JanggiBoard, fx: number, fy: number, tx: number, ty: number): boolean {
  if (tx < 0 || tx >= W || ty < 0 || ty >= H) return false;
  const piece = board[fy]![fx];
  if (!piece) return false;
  const target = board[ty]![tx];
  if (target && isRed(piece) === isRed(target)) return false;
  const dx = Math.abs(tx - fx);
  const dy = Math.abs(ty - fy);
  const kind = piece[1];
  if (kind === "K") return dx + dy === 1;
  if (kind === "G") return (dx === 1 && dy === 2) || (dx === 2 && dy === 1);
  if (kind === "E" || kind === "A") return dx + dy === 1;
  if (kind === "C" || kind === "P") {
    if (dx + dy !== 1) return false;
    if (kind === "P") {
      const forward = isRed(piece) ? -1 : 1;
      if (ty - fy !== forward && Math.abs(fy - 3) > 1 && Math.abs(fy - 6) > 1) return false;
    }
    return true;
  }
  return false;
}

import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

type JanggiState = {
  board: JanggiBoard;
  turnRed: boolean;
  redUserId: string;
  blueUserId: string;
};

function gs(room: MinigameRoomInternal): JanggiState {
  return room.gameState as JanggiState;
}

export const janggiPlugin: MinigamePlugin = {
  id: "janggi",
  minPlayers: 2,
  maxPlayers: 2,
  maxPlayersPublic: 2,
  autoStartOnPublicMatch: true,

  initGameState(room) {
    const ids = [...room.players.keys()];
    const redUserId = room.hostId;
    const blueUserId = ids.find((id) => id !== redUserId) ?? ids[1]!;
    for (const p of room.players.values()) {
      p.role = p.userId === redUserId ? "red" : "blue";
      p.ready = true;
    }
    return { board: initialJanggi(), turnRed: true, redUserId, blueUserId };
  },

  toPublicState(room) {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
    const state = gs(room);
    return {
      ...base,
      game: {
        board: state.board,
        turnRed: state.turnRed,
        turnUserId: state.turnRed ? state.redUserId : state.blueUserId,
        redUserId: state.redUserId,
        blueUserId: state.blueUserId,
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임이 진행 중이 아닙니다.";
    const state = gs(room);
    const turnUserId = state.turnRed ? state.redUserId : state.blueUserId;
    if (userId !== turnUserId) return "상대 턴입니다.";
    const m = move as { fromX?: number; fromY?: number; toX?: number; toY?: number };
    if ([m.fromX, m.fromY, m.toX, m.toY].some((v) => typeof v !== "number")) return "잘못된 수";
    const piece = state.board[m.fromY!]![m.fromX!];
    if (!piece) return "기물 없음";
    if (state.turnRed !== isRed(piece)) return "내 기물이 아닙니다";
    if (!canMoveSimple(state.board, m.fromX!, m.fromY!, m.toX!, m.toY!)) return "불법 수";
    return null;
  },

  applyMove(room, userId, move) {
    const state = gs(room);
    const m = move as { fromX: number; fromY: number; toX: number; toY: number };
    const captured = state.board[m.toY]![m.toX];
    state.board[m.toY]![m.toX] = state.board[m.fromY]![m.fromX];
    state.board[m.fromY]![m.fromX] = null;
    state.turnRed = !state.turnRed;
    room.moveHistory.push({ userId, ...m, captured });
    if (captured === "bK") room.winnerId = state.redUserId;
    if (captured === "rK") room.winnerId = state.blueUserId;
  },

  checkWin(room) {
    const state = gs(room);
    if (room.winnerId) {
      return { winnerId: room.winnerId, resultMessage: "장군! 승리" };
    }
    if (!findKing(state.board, true)) {
      return { winnerId: state.blueUserId, resultMessage: "적 장군 포획" };
    }
    if (!findKing(state.board, false)) {
      return { winnerId: state.redUserId, resultMessage: "적 장군 포획" };
    }
    return null;
  },
};
