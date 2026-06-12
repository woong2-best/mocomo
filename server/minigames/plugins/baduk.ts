/** 바둑 MVP — 9×9 집바둑 간소: 돌 놓기 + 패스 + 사석(단순) */

const SIZE = 9;

type BadukBoard = number[][];

function empty(): BadukBoard {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function neighbors(x: number, y: number): [number, number][] {
  const out: [number, number][] = [];
  if (x > 0) out.push([x - 1, y]);
  if (x < SIZE - 1) out.push([x + 1, y]);
  if (y > 0) out.push([x, y - 1]);
  if (y < SIZE - 1) out.push([x, y + 1]);
  return out;
}

function groupLiberties(board: BadukBoard, x: number, y: number, color: number, seen = new Set<string>()): number {
  const key = `${x},${y}`;
  if (seen.has(key)) return 0;
  seen.add(key);
  if (board[y]![x] !== color) return 0;
  let libs = 0;
  for (const [nx, ny] of neighbors(x, y)) {
    if (board[ny]![nx] === 0) libs++;
    else if (board[ny]![nx] === color) libs += groupLiberties(board, nx, ny, color, seen);
  }
  return libs;
}

function removeGroup(board: BadukBoard, x: number, y: number, color: number): number {
  if (board[y]![x] !== color) return 0;
  let n = 1;
  board[y]![x] = 0;
  for (const [nx, ny] of neighbors(x, y)) {
    if (board[ny]![nx] === color) n += removeGroup(board, nx, ny, color);
  }
  return n;
}

import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

type BadukState = {
  board: BadukBoard;
  turn: 1 | 2;
  blackUserId: string;
  whiteUserId: string;
  captures: { black: number; white: number };
  passStreak: number;
  lastBoard?: string;
};

function gs(room: MinigameRoomInternal): BadukState {
  return room.gameState as BadukState;
}

function boardKey(board: BadukBoard) {
  return board.map((r) => r.join("")).join("|");
}

export const badukPlugin: MinigamePlugin = {
  id: "baduk",
  minPlayers: 2,
  maxPlayers: 2,
  maxPlayersPublic: 2,
  autoStartOnPublicMatch: true,

  initGameState(room) {
    const ids = [...room.players.keys()];
    const blackUserId = room.hostId;
    const whiteUserId = ids.find((id) => id !== blackUserId) ?? ids[1]!;
    for (const p of room.players.values()) {
      p.role = p.userId === blackUserId ? "black" : "white";
      p.ready = true;
    }
    return {
      board: empty(),
      turn: 1 as const,
      blackUserId,
      whiteUserId,
      captures: { black: 0, white: 0 },
      passStreak: 0,
    };
  },

  toPublicState(room) {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
    const state = gs(room);
    return {
      ...base,
      game: {
        board: state.board,
        turn: state.turn,
        turnUserId: state.turn === 1 ? state.blackUserId : state.whiteUserId,
        blackUserId: state.blackUserId,
        whiteUserId: state.whiteUserId,
        captures: state.captures,
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임이 진행 중이 아닙니다.";
    const state = gs(room);
    const turnUserId = state.turn === 1 ? state.blackUserId : state.whiteUserId;
    if (userId !== turnUserId) return "상대 턴입니다.";
    const m = move as { x?: number; y?: number; pass?: boolean };
    if (m.pass) return null;
    if (typeof m.x !== "number" || typeof m.y !== "number") return "잘못된 수";
    if (m.x < 0 || m.x >= SIZE || m.y < 0 || m.y >= SIZE) return "범위 밖";
    if (state.board[m.y]![m.x] !== 0) return "이미 돌이 있습니다.";
    return null;
  },

  applyMove(room, userId, move) {
    const state = gs(room);
    const m = move as { x?: number; y?: number; pass?: boolean };
    if (m.pass) {
      state.passStreak++;
      state.turn = state.turn === 1 ? 2 : 1;
      room.moveHistory.push({ userId, pass: true });
      return;
    }
    const color = state.turn;
    const opp = color === 1 ? 2 : 1;
    state.board[m.y!]![m.x!] = color;
    let captured = 0;
    for (const [nx, ny] of neighbors(m.x!, m.y!)) {
      if (state.board[ny]![nx] === opp && groupLiberties(state.board, nx, ny, opp) === 0) {
        captured += removeGroup(state.board, nx, ny, opp);
      }
    }
    if (groupLiberties(state.board, m.x!, m.y!, color) === 0) {
      state.board[m.y!]![m.x!] = 0;
      return;
    }
    const key = boardKey(state.board);
    if (state.lastBoard === key) {
      state.board[m.y!]![m.x!] = 0;
      return;
    }
    state.lastBoard = key;
    if (color === 1) state.captures.black += captured;
    else state.captures.white += captured;
    state.passStreak = 0;
    state.turn = state.turn === 1 ? 2 : 1;
    room.moveHistory.push({ userId, x: m.x, y: m.y });
  },

  checkWin(room) {
    const state = gs(room);
    if (state.passStreak >= 2) {
      const scoreBlack = state.captures.black;
      const scoreWhite = state.captures.white + 6.5;
      if (scoreBlack > scoreWhite) {
        return { winnerId: state.blackUserId, resultMessage: `흑 ${scoreBlack}집 승` };
      }
      return { winnerId: state.whiteUserId, resultMessage: `백 ${scoreWhite}집 승` };
    }
    return null;
  },
};
