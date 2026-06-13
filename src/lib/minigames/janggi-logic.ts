/** 한국 장기 9×10 — 공유 규칙 엔진 (클라이언트·서버) */

export const JANGGI_W = 9;
export const JANGGI_H = 10;
export const JANGGI_TURN_MS = 20_000;

export type JanggiPiece = string; // "rC" | "bK" ...
export type JanggiBoard = (JanggiPiece | null)[][];
export type JanggiCoord = { x: number; y: number };
export type JanggiMove = { fromX: number; fromY: number; toX: number; toY: number };

const RED_PALACE = { xMin: 3, xMax: 5, yMin: 0, yMax: 2 };
const BLUE_PALACE = { xMin: 3, xMax: 5, yMin: 7, yMax: 9 };

const RED_PALACE_DIAGS: JanggiCoord[][] = [
  [
    { x: 3, y: 0 },
    { x: 4, y: 1 },
    { x: 5, y: 2 },
  ],
  [
    { x: 5, y: 0 },
    { x: 4, y: 1 },
    { x: 3, y: 2 },
  ],
];

const BLUE_PALACE_DIAGS: JanggiCoord[][] = [
  [
    { x: 3, y: 7 },
    { x: 4, y: 8 },
    { x: 5, y: 9 },
  ],
  [
    { x: 5, y: 7 },
    { x: 4, y: 8 },
    { x: 3, y: 9 },
  ],
];

export function emptyJanggiBoard(): JanggiBoard {
  return Array.from({ length: JANGGI_H }, () =>
    Array.from({ length: JANGGI_W }, () => null as JanggiPiece | null)
  );
}

export function createInitialJanggiBoard(): JanggiBoard {
  const b = emptyJanggiBoard();
  const place = (x: number, y: number, p: JanggiPiece) => {
    b[y]![x] = p;
  };
  // 초(적) — 위쪽
  for (const [x, p] of [
    [0, "rC"],
    [1, "rH"],
    [2, "rE"],
    [3, "rA"],
    [4, "rK"],
    [5, "rA"],
    [6, "rE"],
    [7, "rH"],
    [8, "rC"],
  ] as const) {
    place(x, 0, p);
  }
  place(1, 1, "rO");
  place(7, 1, "rO");
  for (const x of [0, 2, 4, 6, 8]) place(x, 3, "rP");

  // 한(청) — 아래쪽
  for (const [x, p] of [
    [0, "bC"],
    [1, "bH"],
    [2, "bE"],
    [3, "bA"],
    [4, "bK"],
    [5, "bA"],
    [6, "bE"],
    [7, "bH"],
    [8, "bC"],
  ] as const) {
    place(x, 9, p);
  }
  place(1, 8, "bO");
  place(7, 8, "bO");
  for (const x of [0, 2, 4, 6, 8]) place(x, 6, "bP");

  return b;
}

export function isRedPiece(p: JanggiPiece): boolean {
  return p.startsWith("r");
}

export function pieceKind(p: JanggiPiece): string {
  return p[1] ?? "";
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < JANGGI_W && y >= 0 && y < JANGGI_H;
}

export function inPalace(x: number, y: number, red: boolean): boolean {
  const p = red ? RED_PALACE : BLUE_PALACE;
  return x >= p.xMin && x <= p.xMax && y >= p.yMin && y <= p.yMax;
}

function palaceDiags(red: boolean): JanggiCoord[][] {
  return red ? RED_PALACE_DIAGS : BLUE_PALACE_DIAGS;
}

function onSamePalaceDiag(x: number, y: number, red: boolean): JanggiCoord[] | null {
  for (const line of palaceDiags(red)) {
    if (line.some((c) => c.x === x && c.y === y)) return line;
  }
  return null;
}

function addMove(
  board: JanggiBoard,
  moves: JanggiCoord[],
  fx: number,
  fy: number,
  tx: number,
  ty: number,
  piece: JanggiPiece
) {
  if (!inBounds(tx, ty)) return;
  const target = board[ty]![tx];
  if (target && isRedPiece(target) === isRedPiece(piece)) return;
  moves.push({ x: tx, y: ty });
}

function slideOrthogonal(board: JanggiBoard, moves: JanggiCoord[], fx: number, fy: number, piece: JanggiPiece) {
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ] as const;
  for (const [dx, dy] of dirs) {
    let x = fx + dx;
    let y = fy + dy;
    while (inBounds(x, y)) {
      const target = board[y]![x];
      if (!target) {
        moves.push({ x, y });
      } else {
        if (isRedPiece(target) !== isRedPiece(piece)) moves.push({ x, y });
        break;
      }
      x += dx;
      y += dy;
    }
  }
}

function slidePalaceDiag(board: JanggiBoard, moves: JanggiCoord[], fx: number, fy: number, piece: JanggiPiece) {
  const red = isRedPiece(piece);
  if (!inPalace(fx, fy, red)) return;
  const line = onSamePalaceDiag(fx, fy, red);
  if (!line) return;
  const idx = line.findIndex((c) => c.x === fx && c.y === fy);
  for (const dir of [-1, 1] as const) {
    for (let i = idx + dir; i >= 0 && i < line.length; i += dir) {
      const { x, y } = line[i]!;
      const target = board[y]![x];
      if (!target) {
        moves.push({ x, y });
      } else {
        if (isRedPiece(target) !== isRedPiece(piece)) moves.push({ x, y });
        break;
      }
    }
  }
}

function cannonMoves(board: JanggiBoard, moves: JanggiCoord[], fx: number, fy: number, piece: JanggiPiece) {
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ] as const;
  for (const [dx, dy] of dirs) {
    let x = fx + dx;
    let y = fy + dy;
    let jumped = false;
    while (inBounds(x, y)) {
      const cur = board[y]![x];
      if (!jumped) {
        if (cur) {
          if (pieceKind(cur) === "O") break;
          jumped = true;
        }
      } else if (cur) {
        if (isRedPiece(cur) !== isRedPiece(piece)) moves.push({ x, y });
        break;
      } else {
        moves.push({ x, y });
      }
      x += dx;
      y += dy;
    }
  }
  // 궁성 대각 포
  const red = isRedPiece(piece);
  if (!inPalace(fx, fy, red)) return;
  const line = onSamePalaceDiag(fx, fy, red);
  if (!line) return;
  const idx = line.findIndex((c) => c.x === fx && c.y === fy);
  for (const dir of [-1, 1] as const) {
    let jumped = false;
    for (let i = idx + dir; i >= 0 && i < line.length; i += dir) {
      const { x, y } = line[i]!;
      const cur = board[y]![x];
      if (!jumped) {
        if (cur) {
          if (pieceKind(cur) === "O") break;
          jumped = true;
        }
      } else if (cur) {
        if (isRedPiece(cur) !== isRedPiece(piece)) moves.push({ x, y });
        break;
      } else {
        moves.push({ x, y });
      }
    }
  }
}

function horseMoves(board: JanggiBoard, moves: JanggiCoord[], fx: number, fy: number, piece: JanggiPiece) {
  const legs = [
    { lx: 0, ly: -1, tx: -1, ty: -2 },
    { lx: 0, ly: -1, tx: 1, ty: -2 },
    { lx: 0, ly: 1, tx: -1, ty: 2 },
    { lx: 0, ly: 1, tx: 1, ty: 2 },
    { lx: -1, ly: 0, tx: -2, ty: -1 },
    { lx: -1, ly: 0, tx: -2, ty: 1 },
    { lx: 1, ly: 0, tx: 2, ty: -1 },
    { lx: 1, ly: 0, tx: 2, ty: 1 },
  ];
  for (const { lx, ly, tx, ty } of legs) {
    const legX = fx + lx;
    const legY = fy + ly;
    if (!inBounds(legX, legY) || board[legY]![legX]) continue;
    addMove(board, moves, fx, fy, fx + tx, fy + ty, piece);
  }
}

function elephantMoves(board: JanggiBoard, moves: JanggiCoord[], fx: number, fy: number, piece: JanggiPiece) {
  const steps = [
    { ox: 0, oy: -1, tx: -2, ty: -3 },
    { ox: 0, oy: -1, tx: 2, ty: -3 },
    { ox: 0, oy: 1, tx: -2, ty: 3 },
    { ox: 0, oy: 1, tx: 2, ty: 3 },
    { ox: -1, oy: 0, tx: -3, ty: -2 },
    { ox: -1, oy: 0, tx: -3, ty: 2 },
    { ox: 1, oy: 0, tx: 3, ty: -2 },
    { ox: 1, oy: 0, tx: 3, ty: 2 },
  ];
  for (const { ox, oy, tx, ty } of steps) {
    const blockX = fx + ox;
    const blockY = fy + oy;
    if (!inBounds(blockX, blockY) || board[blockY]![blockX]) continue;
    addMove(board, moves, fx, fy, fx + tx, fy + ty, piece);
  }
}

function kingAdvisorMoves(board: JanggiBoard, moves: JanggiCoord[], fx: number, fy: number, piece: JanggiPiece) {
  const red = isRedPiece(piece);
  const kind = pieceKind(piece);
  const orth = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ] as const;
  for (const [dx, dy] of orth) {
    const tx = fx + dx;
    const ty = fy + dy;
    if (kind === "K" && inPalace(tx, ty, red)) addMove(board, moves, fx, fy, tx, ty, piece);
  }
  const line = onSamePalaceDiag(fx, fy, red);
  if (!line) return;
  const idx = line.findIndex((c) => c.x === fx && c.y === fy);
  for (const dir of [-1, 1] as const) {
    const next = line[idx + dir];
    if (!next) continue;
    if (kind === "A" || kind === "K") {
      addMove(board, moves, fx, fy, next.x, next.y, piece);
    }
  }
}

function pawnMoves(board: JanggiBoard, moves: JanggiCoord[], fx: number, fy: number, piece: JanggiPiece) {
  const red = isRedPiece(piece);
  const forward = red ? 1 : -1;
  addMove(board, moves, fx, fy, fx, fy + forward, piece);

  const crossed = red ? fy >= 5 : fy <= 4;
  if (crossed) {
    addMove(board, moves, fx, fy, fx - 1, fy, piece);
    addMove(board, moves, fx, fy, fx + 1, fy, piece);
  }

  if (inPalace(fx, fy, red)) {
    const line = onSamePalaceDiag(fx, fy, red);
    if (line) {
      const idx = line.findIndex((c) => c.x === fx && c.y === fy);
      const next = line[idx + (red ? 1 : -1)];
      if (next) addMove(board, moves, fx, fy, next.x, next.y, piece);
    }
  }
}

/** 공격 가능 칸 (장군 판정용 — 자기 king 노출 무시) */
export function generateAttackMoves(
  board: JanggiBoard,
  fx: number,
  fy: number,
  piece: JanggiPiece
): JanggiCoord[] {
  const moves: JanggiCoord[] = [];
  if (!piece) return moves;
  const kind = pieceKind(piece);
  switch (kind) {
    case "C":
      slideOrthogonal(board, moves, fx, fy, piece);
      slidePalaceDiag(board, moves, fx, fy, piece);
      break;
    case "O":
      cannonMoves(board, moves, fx, fy, piece);
      break;
    case "H":
      horseMoves(board, moves, fx, fy, piece);
      break;
    case "E":
      elephantMoves(board, moves, fx, fy, piece);
      break;
    case "K":
    case "A":
      kingAdvisorMoves(board, moves, fx, fy, piece);
      break;
    case "P":
      pawnMoves(board, moves, fx, fy, piece);
      break;
  }
  return moves;
}

export function applyJanggiMove(board: JanggiBoard, move: JanggiMove): JanggiBoard {
  const next = board.map((row) => [...row]) as JanggiBoard;
  next[move.toY]![move.toX] = next[move.fromY]![move.fromX];
  next[move.fromY]![move.fromX] = null;
  return next;
}

export function findKing(board: JanggiBoard, red: boolean): JanggiCoord | null {
  const k = red ? "rK" : "bK";
  for (let y = 0; y < JANGGI_H; y++) {
    for (let x = 0; x < JANGGI_W; x++) {
      if (board[y]![x] === k) return { x, y };
    }
  }
  return null;
}

export function isSquareAttacked(board: JanggiBoard, tx: number, ty: number, byRed: boolean): boolean {
  for (let y = 0; y < JANGGI_H; y++) {
    for (let x = 0; x < JANGGI_W; x++) {
      const p = board[y]![x];
      if (!p || isRedPiece(p) !== byRed) continue;
      const attacks = generateAttackMoves(board, x, y, p);
      if (attacks.some((a) => a.x === tx && a.y === ty)) return true;
    }
  }
  return false;
}

export function isInCheck(board: JanggiBoard, red: boolean): boolean {
  const king = findKing(board, red);
  if (!king) return false;
  return isSquareAttacked(board, king.x, king.y, !red);
}

export function getPseudoLegalMoves(
  board: JanggiBoard,
  fx: number,
  fy: number
): JanggiCoord[] {
  const piece = board[fy]![fx];
  if (!piece) return [];
  return generateAttackMoves(board, fx, fy, piece);
}

export function getLegalMoves(board: JanggiBoard, fx: number, fy: number): JanggiCoord[] {
  const piece = board[fy]![fx];
  if (!piece) return [];
  const red = isRedPiece(piece);
  const pseudo = getPseudoLegalMoves(board, fx, fy);
  return pseudo.filter(({ x, y }) => {
    const next = applyJanggiMove(board, { fromX: fx, fromY: fy, toX: x, toY: y });
    return !isInCheck(next, red);
  });
}

export function isLegalJanggiMove(board: JanggiBoard, turnRed: boolean, move: JanggiMove): boolean {
  const { fromX, fromY, toX, toY } = move;
  if (!inBounds(fromX, fromY) || !inBounds(toX, toY)) return false;
  const piece = board[fromY]![fromX];
  if (!piece || isRedPiece(piece) !== turnRed) return false;
  return getLegalMoves(board, fromX, fromY).some((m) => m.x === toX && m.y === toY);
}

export function allLegalMoves(board: JanggiBoard, turnRed: boolean): JanggiMove[] {
  const out: JanggiMove[] = [];
  for (let y = 0; y < JANGGI_H; y++) {
    for (let x = 0; x < JANGGI_W; x++) {
      const p = board[y]![x];
      if (!p || isRedPiece(p) !== turnRed) continue;
      for (const m of getLegalMoves(board, x, y)) {
        out.push({ fromX: x, fromY: y, toX: m.x, toY: m.y });
      }
    }
  }
  return out;
}

export function isCheckmate(board: JanggiBoard, turnRed: boolean): boolean {
  if (!isInCheck(board, turnRed)) return false;
  return allLegalMoves(board, turnRed).length === 0;
}

export const JANGGI_PIECE_LABELS: Record<string, { red: string; blue: string }> = {
  K: { red: "楚", blue: "漢" },
  A: { red: "士", blue: "士" },
  C: { red: "車", blue: "車" },
  H: { red: "馬", blue: "馬" },
  E: { red: "象", blue: "象" },
  O: { red: "包", blue: "包" },
  P: { red: "卒", blue: "兵" },
};

export function janggiPieceLabel(piece: JanggiPiece): string {
  const kind = pieceKind(piece);
  const labels = JANGGI_PIECE_LABELS[kind];
  if (!labels) return kind;
  return isRedPiece(piece) ? labels.red : labels.blue;
}
