/** 슬라이드 퍼즐 · 직소 공용 */

export function createSolvedGrid(size: number): number[] {
  const arr = Array.from({ length: size * size }, (_, i) => i);
  return arr;
}

export function indexToXY(index: number, size: number): { x: number; y: number } {
  return { x: index % size, y: Math.floor(index / size) };
}

export function xyToIndex(x: number, y: number, size: number): number {
  return y * size + x;
}

export function shuffleSolvableSlide(size: number): number[] {
  let tiles = createSolvedGrid(size);
  let empty = size * size - 1;
  for (let i = 0; i < size * size * 20; i++) {
    const { x, y } = indexToXY(empty, size);
    const neighbors: number[] = [];
    if (x > 0) neighbors.push(xyToIndex(x - 1, y, size));
    if (x < size - 1) neighbors.push(xyToIndex(x + 1, y, size));
    if (y > 0) neighbors.push(xyToIndex(x, y - 1, size));
    if (y < size - 1) neighbors.push(xyToIndex(x, y + 1, size));
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)]!;
    tiles[empty] = tiles[pick]!;
    tiles[pick] = size * size - 1;
    empty = pick;
  }
  return tiles;
}

export function slideMove(tiles: number[], dir: "up" | "down" | "left" | "right", size: number): number[] | null {
  const empty = tiles.indexOf(size * size - 1);
  const { x, y } = indexToXY(empty, size);
  let tx = x;
  let ty = y;
  if (dir === "up") ty++;
  else if (dir === "down") ty--;
  else if (dir === "left") tx++;
  else if (dir === "right") tx--;
  if (tx < 0 || tx >= size || ty < 0 || ty >= size) return null;
  const next = [...tiles];
  const swap = xyToIndex(tx, ty, size);
  next[empty] = next[swap]!;
  next[swap] = size * size - 1;
  return next;
}

export function isSlideSolved(tiles: number[], size: number): boolean {
  for (let i = 0; i < size * size; i++) {
    if (tiles[i] !== i) return false;
  }
  return true;
}

/** 틀린 그림 찾기 — 결정적 패턴 생성 */
export function generateSpotDiff(size = 8, diffCount = 5, seed = 0): {
  left: number[][];
  right: number[][];
  diffs: { x: number; y: number }[];
} {
  let s = seed || Date.now();
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const left: number[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => Math.floor(rand() * 6))
  );
  const right = left.map((row) => [...row]);
  const diffs: { x: number; y: number }[] = [];
  while (diffs.length < diffCount) {
    const x = Math.floor(rand() * size);
    const y = Math.floor(rand() * size);
    if (diffs.some((d) => d.x === x && d.y === y)) continue;
    right[y]![x] = (right[y]![x]! + 1 + Math.floor(rand() * 5)) % 6;
    diffs.push({ x, y });
  }
  return { left, right, diffs };
}

export function shuffleJigsaw(size = 4): { order: number[]; solved: number[] } {
  const solved = createSolvedGrid(size * size);
  const order = [...solved];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return { order, solved };
}

export function createMemoryDeck(pairs = 8): number[] {
  const ids = Array.from({ length: pairs }, (_, i) => i);
  const deck = [...ids, ...ids];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return deck;
}
