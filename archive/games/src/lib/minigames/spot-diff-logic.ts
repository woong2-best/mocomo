/** 틀린그림 찾기 — 좌표 판정 · 점수 · 씬 생성 */

export const SPOT_DIFF_WIDTH = 400;
export const SPOT_DIFF_HEIGHT = 260;
export const SPOT_DIFF_TIME_MS = 180_000;
export const SPOT_DIFF_WRONG_PENALTY_MS = 5_000;
export const SPOT_DIFF_HINT_PENALTY_MS = 15_000;
export const SPOT_DIFF_SCORE_BASE = 100;
export const SPOT_DIFF_COMBO_BONUS = 25;
export const SPOT_DIFF_COMBO_WINDOW_MS = 5_000;

export type SpotShape =
  | { kind: "circle"; x: number; y: number; r: number; fill: string; stroke?: string }
  | { kind: "rect"; x: number; y: number; w: number; h: number; fill: string; stroke?: string; rot?: number }
  | { kind: "ellipse"; x: number; y: number; rx: number; ry: number; fill: string; stroke?: string };

export type SpotDifference = {
  id: number;
  x: number;
  y: number;
  radius: number;
};

export type SpotDiffPuzzle = {
  width: number;
  height: number;
  left: SpotShape[];
  right: SpotShape[];
  differences: SpotDifference[];
  seed: number;
  theme: string;
  puzzleId?: string;
  title?: string;
  difficulty?: "easy" | "medium" | "hard";
  imageLeft?: string;
  imageRight?: string;
};

export type SpotDiffPlayStyle = "normal" | "infinite";

export const SPOT_DIFF_INFINITE_BONUS_MS = 30_000;
export const SPOT_DIFF_INFINITE_TIME_MS = 300_000;

export type SpotDiffMode = "solo" | "versus" | "coop";

export function spotDiffMode(playerCount: number): SpotDiffMode {
  if (playerCount <= 1) return "solo";
  if (playerCount === 2) return "versus";
  return "coop";
}

export function distanceSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

export function findSpotHit(
  differences: SpotDifference[],
  foundIds: number[],
  x: number,
  y: number
): SpotDifference | null {
  const found = new Set(foundIds);
  for (const d of differences) {
    if (found.has(d.id)) continue;
    const r = d.radius;
    if (distanceSq(x, y, d.x, d.y) <= r * r) return d;
  }
  return null;
}

export function isNearFoundSpot(
  differences: SpotDifference[],
  foundIds: number[],
  x: number,
  y: number
): boolean {
  const found = new Set(foundIds);
  for (const d of differences) {
    if (!found.has(d.id)) continue;
    if (distanceSq(x, y, d.x, d.y) <= d.radius * d.radius) return true;
  }
  return false;
}

export function computeSpotScore(combo: number): number {
  return SPOT_DIFF_SCORE_BASE + Math.max(0, combo - 1) * SPOT_DIFF_COMBO_BONUS;
}

export function formatSpotTime(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function cloneShapes(shapes: SpotShape[]): SpotShape[] {
  return shapes.map((s) => ({ ...s }));
}

function seededRandom(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function shapeAnchor(s: SpotShape): { x: number; y: number; radius: number } {
  if (s.kind === "circle") return { x: s.x, y: s.y, radius: Math.max(22, s.r + 8) };
  if (s.kind === "ellipse") return { x: s.x, y: s.y, radius: Math.max(22, Math.max(s.rx, s.ry) + 6) };
  return { x: s.x + s.w / 2, y: s.y + s.h / 2, radius: Math.max(22, Math.max(s.w, s.h) / 2 + 6) };
}

function buildBaseScene(theme: string, width: number, height: number, rand: () => number): SpotShape[] {
  const left: SpotShape[] = [];
  const sky = theme === "해변" ? "#7ec8e3" : theme === "숲" ? "#6fa8dc" : "#87ceeb";
  const ground =
    theme === "해변" ? "#f4d03f" : theme === "숲" ? "#3d6b35" : theme === "마을" ? "#8b7355" : "#5a8f3c";

  left.push({ kind: "rect", x: 0, y: 0, w: width, h: 165, fill: sky });
  left.push({ kind: "rect", x: 0, y: 165, w: width, h: height - 165, fill: ground });

  if (theme === "해변") {
    left.push({ kind: "ellipse", x: width / 2, y: 195, rx: 170, ry: 28, fill: "#4fc3f7" });
    left.push({ kind: "rect", x: 310, y: 150, w: 12, h: 50, fill: "#e67e22" });
    left.push({ kind: "rect", x: 280, y: 178, w: 70, h: 8, fill: "#d35400" });
  } else {
    left.push({ kind: "circle", x: 330, y: 45, r: 26, fill: "#ffd54f" });
  }

  const cloudXs = [60, 150, 260];
  for (const cx of cloudXs) {
    left.push({ kind: "circle", x: cx, y: 55, r: 18, fill: "#fff" });
    left.push({ kind: "circle", x: cx + 16, y: 50, r: 14, fill: "#fff" });
  }

  if (theme === "마을") {
    left.push({ kind: "rect", x: 40, y: 110, w: 70, h: 55, fill: "#c0392b" });
    left.push({ kind: "rect", x: 280, y: 120, w: 80, h: 45, fill: "#5dade2" });
  } else if (theme === "숲") {
    for (let i = 0; i < 4; i++) {
      const tx = 60 + i * 80;
      left.push({ kind: "rect", x: tx, y: 130, w: 14, h: 40, fill: "#6e3b12" });
      left.push({ kind: "circle", x: tx + 7, y: 118, r: 26, fill: "#229954" });
    }
  } else if (theme === "해변") {
    left.push({ kind: "circle", x: 80, y: 200, r: 10, fill: "#ff6b6b" });
    left.push({ kind: "circle", x: 120, y: 205, r: 8, fill: "#feca57" });
  } else {
    left.push({ kind: "rect", x: 30, y: 140, w: 340, h: 8, fill: "#bdc3c7" });
    left.push({ kind: "circle", x: 90, y: 200, r: 22, fill: "#e74c3c" });
    left.push({ kind: "rect", x: 200, y: 175, w: 50, h: 35, fill: "#3498db" });
    left.push({ kind: "circle", x: 320, y: 195, r: 16, fill: "#9b59b6" });
  }

  for (let i = 0; i < 3; i++) {
    left.push({
      kind: "circle",
      x: 50 + Math.floor(rand() * 300),
      y: 175 + Math.floor(rand() * 60),
      r: 5 + Math.floor(rand() * 6),
      fill: `hsl(${Math.floor(rand() * 360)}, 55%, 50%)`,
    });
  }

  return left;
}

/** 결정적 풍경 + 차이점 생성 */
export function generateSpotDiffPuzzle(seed: number, diffCount = 7): SpotDiffPuzzle {
  const rand = seededRandom(seed);
  const width = SPOT_DIFF_WIDTH;
  const height = SPOT_DIFF_HEIGHT;
  const themes = ["공원", "해변", "마을", "숲"];
  const theme = themes[Math.floor(rand() * themes.length)]!;
  const left = buildBaseScene(theme, width, height, rand);
  const right = cloneShapes(left);
  const differences: SpotDifference[] = [];

  const mutable = left
    .map((_, i) => i)
    .filter((i) => i >= 2)
    .sort(() => rand() - 0.5);

  let id = 1;
  for (const idx of mutable) {
    if (differences.length >= diffCount) break;
    const anchor = shapeAnchor(left[idx]!);
    if (differences.some((d) => distanceSq(d.x, d.y, anchor.x, anchor.y) < 35 * 35)) continue;

    const target = right[idx]!;
    const variant = Math.floor(rand() * 4);
    if (target.kind === "circle") {
      if (variant === 0) target.fill = `hsl(${Math.floor(rand() * 360)}, 60%, 55%)`;
      else if (variant === 1) target.r = Math.max(4, target.r - 8);
      else if (variant === 2) target.x += 12;
      else target.r = 0;
    } else if (target.kind === "rect") {
      if (variant === 0) target.fill = `hsl(${Math.floor(rand() * 360)}, 50%, 45%)`;
      else if (variant === 1) target.w += 15;
      else target.h += 10;
    } else if (target.kind === "ellipse") {
      target.fill = variant % 2 === 0 ? "#2980b9" : "#16a085";
    }

    differences.push({ id: id++, x: anchor.x, y: anchor.y, radius: anchor.radius });
  }

  while (differences.length < diffCount) {
    const x = 40 + Math.floor(rand() * (width - 80));
    const y = 40 + Math.floor(rand() * (height - 80));
    if (differences.some((d) => distanceSq(d.x, d.y, x, y) < 40 * 40)) continue;
    right.push({ kind: "circle", x, y, r: 7, fill: "#2c3e50" });
    differences.push({ id: id++, x, y, radius: 24 });
  }

  return { width, height, left, right, differences, seed, theme };
}

export function pickHintTarget(differences: SpotDifference[], foundIds: number[]): SpotDifference | null {
  const found = new Set(foundIds);
  const left = differences.filter((d) => !found.has(d.id));
  if (!left.length) return null;
  return left[Math.floor(Math.random() * left.length)]!;
}

export function buildSpotResultMessage(
  mode: SpotDiffMode,
  scores: Record<string, number>,
  playerNames: Record<string, string>,
  elapsedMs: number,
  allFound: boolean
): { winnerId: string; resultMessage: string } {
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const top = entries[0];
  const timeLabel = formatSpotTime(elapsedMs);

  if (mode === "coop" || mode === "solo") {
    if (allFound) {
      return {
        winnerId: mode === "solo" ? top?.[0] ?? "" : "",
        resultMessage: mode === "solo" ? `${timeLabel} 클리어!` : `협동 클리어! ${timeLabel}`,
      };
    }
    return { winnerId: "", resultMessage: `시간 초과 · ${top?.[1] ?? 0}점` };
  }

  const name = top ? playerNames[top[0]] ?? "플레이어" : "—";
  if (allFound) return { winnerId: top?.[0] ?? "", resultMessage: `${name} 승리! ${top?.[1] ?? 0}점 · ${timeLabel}` };
  return { winnerId: top?.[0] ?? "", resultMessage: `시간 종료 · ${name} ${top?.[1] ?? 0}점` };
}
