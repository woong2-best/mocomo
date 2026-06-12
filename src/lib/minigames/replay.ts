import { Chess } from "chess.js";
import {
  applyReversiMove,
  createInitialReversiBoard,
  type ReversiBoard,
} from "./reversi-logic";
import {
  createEmptyOmokBoard,
  type OmokBoard,
} from "./omok-logic";

export type ReplayStep = {
  index: number;
  userId?: string;
  move: unknown;
  label: string;
};

export type ReplaySnapshot = {
  step: number;
  gameId: string;
  board?: number[][];
  fen?: string;
  label: string;
};

export function buildReplaySteps(
  gameId: string,
  moves: unknown[],
  playerNames?: Record<string, string>
): ReplayStep[] {
  return moves.map((move, index) => {
    const m = move as Record<string, unknown>;
    const uid = m.userId as string | undefined;
    const name = uid && playerNames?.[uid] ? playerNames[uid] : uid?.slice(0, 6) ?? "?";
    let label = `${name}: ${JSON.stringify(m)}`;
    if (m.x != null && m.y != null) label = `${name}: (${m.x}, ${m.y})`;
    if (m.from && m.to) label = `${name}: ${m.from}→${m.to}`;
    if (m.pass) label = `${name}: 패스`;
    return { index, userId: uid, move: m, label };
  });
}

export function snapshotAtStep(
  gameId: string,
  moves: unknown[],
  step: number,
  initialState?: Record<string, unknown> | null,
  playerNames?: Record<string, string>
): ReplaySnapshot {
  const slice = moves.slice(0, step);

  if (gameId === "omok") {
    const board: OmokBoard = createEmptyOmokBoard();
    for (const raw of slice) {
      const m = raw as { move?: { x: number; y: number }; x?: number; y?: number; stone?: number };
      const x = m.move?.x ?? m.x;
      const y = m.move?.y ?? m.y;
      if (typeof x === "number" && typeof y === "number") {
        const stone = (m.stone ??
          (board.flat().filter(Boolean).length % 2 === 0 ? 1 : 2)) as 1 | 2;
        board[y]![x] = stone;
      }
    }
    return {
      step,
      gameId,
      board: board.map((r) => [...r]),
      label: `${step}수`,
    };
  }

  if (gameId === "reversi") {
    let board: ReversiBoard = createInitialReversiBoard();
    let turn: 1 | 2 = 1;
    for (const raw of slice) {
      const m = raw as { x?: number; y?: number; pass?: boolean };
      if (m.pass) {
        turn = turn === 1 ? 2 : 1;
        continue;
      }
      if (typeof m.x === "number" && typeof m.y === "number") {
        board = applyReversiMove(board, m.x, m.y, turn);
        turn = turn === 1 ? 2 : 1;
      }
    }
    return { step, gameId, board: board.map((r) => [...r]), label: `${step}수` };
  }

  if (gameId === "chess") {
    const chess = new Chess();
    for (const raw of slice) {
      const m = raw as { move?: { from: string; to: string; promotion?: string } };
      const mv = m.move ?? (raw as { from?: string; to?: string; promotion?: string });
      if (mv.from && mv.to) {
        try {
          chess.move({ from: mv.from, to: mv.to, promotion: mv.promotion ?? "q" });
        } catch {
          /* skip illegal in replay */
        }
      }
    }
    return { step, gameId, fen: chess.fen(), label: `${step}수` };
  }

  if (gameId === "word-chain") {
    const words: string[] = [];
    for (const raw of slice) {
      const m = raw as { word?: string };
      if (m.word) words.push(m.word);
    }
    const last = words[words.length - 1];
    return {
      step,
      gameId,
      label: last ? `${step}수 · ${last}` : `${step}수`,
    };
  }

  if (gameId === "rps") {
    const rounds: string[] = [];
    for (const raw of slice) {
      const m = raw as { userId?: string; choice?: string };
      if (m.choice) {
        const name =
          m.userId && playerNames?.[m.userId] ? playerNames[m.userId] : m.userId?.slice(0, 6) ?? "?";
        rounds.push(`${name}: ${m.choice}`);
      }
    }
    return { step, gameId, label: rounds[rounds.length - 1] ?? `${step}수` };
  }

  return { step, gameId, label: `${step} / ${moves.length}수` };
}

export function maxReplaySteps(moves: unknown[]): number {
  return moves.length;
}
