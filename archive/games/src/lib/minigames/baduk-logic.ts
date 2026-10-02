/** 바둑 규칙 엔진 — 클라이언트·서버 공용 */

export const BADUK_TURN_MS = 30_000;
export const BADUK_KOMI = 6.5;
export const BADUK_DEFAULT_SIZE = 19;
export const BADUK_SIZES = [9, 13, 19] as const;

export type BadukSize = (typeof BADUK_SIZES)[number];
export type Stone = 0 | 1 | 2;
export type BadukBoard = Stone[][];
export type BadukPoint = { x: number; y: number };
export type BadukMove = { x: number; y: number } | { pass: true };

export type BadukPlayResult = {
  ok: boolean;
  board?: BadukBoard;
  captured?: number;
  koPoint?: BadukPoint | null;
  reason?: string;
};

export function createEmptyBadukBoard(size = BADUK_DEFAULT_SIZE): BadukBoard {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => 0 as Stone));
}

export function cloneBadukBoard(board: BadukBoard): BadukBoard {
  return board.map((row) => [...row] as Stone[]);
}

export function boardSize(board: BadukBoard): number {
  return board.length;
}

export function inBounds(board: BadukBoard, x: number, y: number): boolean {
  const s = boardSize(board);
  return x >= 0 && x < s && y >= 0 && y < s;
}

export function boardKey(board: BadukBoard): string {
  return board.map((r) => r.join("")).join("|");
}

export function neighbors(board: BadukBoard, x: number, y: number): BadukPoint[] {
  const s = boardSize(board);
  const out: BadukPoint[] = [];
  if (x > 0) out.push({ x: x - 1, y });
  if (x < s - 1) out.push({ x: x + 1, y });
  if (y > 0) out.push({ x, y: y - 1 });
  if (y < s - 1) out.push({ x, y: y + 1 });
  return out;
}

export function collectGroup(
  board: BadukBoard,
  x: number,
  y: number,
  color: Stone,
  seen = new Set<string>()
): BadukPoint[] {
  const key = `${x},${y}`;
  if (seen.has(key)) return [];
  if (!inBounds(board, x, y) || board[y]![x] !== color) return [];
  seen.add(key);
  const stones: BadukPoint[] = [{ x, y }];
  for (const n of neighbors(board, x, y)) {
    stones.push(...collectGroup(board, n.x, n.y, color, seen));
  }
  return stones;
}

export function groupLiberties(board: BadukBoard, group: BadukPoint[]): number {
  const libs = new Set<string>();
  for (const { x, y } of group) {
    for (const n of neighbors(board, x, y)) {
      if (board[n.y]![n.x] === 0) libs.add(`${n.x},${n.y}`);
    }
  }
  return libs.size;
}

function removeGroup(board: BadukBoard, group: BadukPoint[]): number {
  for (const { x, y } of group) board[y]![x] = 0;
  return group.length;
}

function opponent(color: Stone): Stone {
  return color === 1 ? 2 : 1;
}

/**
 * 착수 시뮬레이션 — 성공 시 새 보드 반환
 * koPoint: 상대가 다음 턴에 둘 수 없는 좌표 (패)
 */
export function tryBadukPlay(
  board: BadukBoard,
  x: number,
  y: number,
  color: 1 | 2,
  forbiddenKo: BadukPoint | null = null
): BadukPlayResult {
  if (!inBounds(board, x, y)) return { ok: false, reason: "범위 밖입니다." };
  if (board[y]![x] !== 0) return { ok: false, reason: "이미 돌이 있습니다." };
  if (forbiddenKo && forbiddenKo.x === x && forbiddenKo.y === y) {
    return { ok: false, reason: "패(Ko) — 같은 곳에 즉시 재착수할 수 없습니다." };
  }

  const next = cloneBadukBoard(board);
  next[y]![x] = color;
  const opp = opponent(color);
  let captured = 0;
  const removed = new Set<string>();

  for (const n of neighbors(next, x, y)) {
    if (next[n.y]![n.x] !== opp) continue;
    const gKey = `${n.x},${n.y}`;
    if (removed.has(gKey)) continue;
    const g = collectGroup(next, n.x, n.y, opp);
    if (groupLiberties(next, g) === 0) {
      for (const p of g) removed.add(`${p.x},${p.y}`);
      captured += removeGroup(next, g);
    }
  }

  const ownGroup = collectGroup(next, x, y, color);
  if (groupLiberties(next, ownGroup) === 0 && captured === 0) {
    return { ok: false, reason: "자충수는 금지됩니다." };
  }

  let koPoint: BadukPoint | null = null;
  if (captured === 1 && ownGroup.length === 1 && groupLiberties(next, ownGroup) === 1) {
    koPoint = { x, y };
  }

  return { ok: true, board: next, captured, koPoint };
}

export function isLegalBadukMove(
  board: BadukBoard,
  move: BadukMove,
  color: 1 | 2,
  forbiddenKo: BadukPoint | null
): string | null {
  if ("pass" in move && move.pass) return null;
  if (!("x" in move)) return "잘못된 수입니다.";
  const result = tryBadukPlay(board, move.x, move.y, color, forbiddenKo);
  return result.ok ? null : result.reason ?? "착수 불가";
}

export type BadukScore = {
  black: number;
  white: number;
  blackTerritory: number;
  whiteTerritory: number;
  blackCaptures: number;
  whiteCaptures: number;
  komi: number;
};

/** 집 계산 (빈 영역 + 따낸 돌, 백 komi) */
export function scoreBadukBoard(
  board: BadukBoard,
  captures: { black: number; white: number },
  komi = BADUK_KOMI
): BadukScore {
  const s = boardSize(board);
  const visited = new Set<string>();
  let blackTerritory = 0;
  let whiteTerritory = 0;

  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (board[y]![x] !== 0) continue;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      const region: BadukPoint[] = [];
      const queue: BadukPoint[] = [{ x, y }];
      let touchesBlack = false;
      let touchesWhite = false;
      visited.add(key);

      while (queue.length) {
        const p = queue.pop()!;
        region.push(p);
        for (const n of neighbors(board, p.x, p.y)) {
          const stone = board[n.y]![n.x];
          if (stone === 1) touchesBlack = true;
          else if (stone === 2) touchesWhite = true;
          else {
            const nk = `${n.x},${n.y}`;
            if (!visited.has(nk)) {
              visited.add(nk);
              queue.push(n);
            }
          }
        }
      }

      if (touchesBlack && !touchesWhite) blackTerritory += region.length;
      else if (touchesWhite && !touchesBlack) whiteTerritory += region.length;
    }
  }

  const black = blackTerritory + captures.black;
  const white = whiteTerritory + captures.white + komi;

  return {
    black,
    white,
    blackTerritory,
    whiteTerritory,
    blackCaptures: captures.black,
    whiteCaptures: captures.white,
    komi,
  };
}

export function badukPlaySize(grid: number): number {
  const cell = grid <= 9 ? 34 : grid <= 13 ? 30 : 22;
  return cell * (grid - 1);
}

export function badukCanvasMaxWidth(grid: number): number {
  return badukPlaySize(grid) + 72;
}
