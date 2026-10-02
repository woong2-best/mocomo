/** 틀린그림 찾기 문제 카탈로그 — 절手 seed + public SVG/PNG 이미지 */

import {
  generateSpotDiffPuzzle,
  SPOT_DIFF_HEIGHT,
  SPOT_DIFF_WIDTH,
  type SpotDifference,
  type SpotDiffPuzzle,
} from "./spot-diff-logic";

export type SpotDiffDifficulty = "easy" | "medium" | "hard";

export type SpotDiffCatalogEntry = {
  id: string;
  title: string;
  theme: string;
  difficulty: SpotDiffDifficulty;
  diffCount: number;
  seed: number;
  /** /spot-diff/zoo-left.svg 또는 .png */
  imageLeft?: string;
  imageRight?: string;
  /** 이미지 퍼즐일 때 서버 판정용 고정 좌표 */
  differences?: SpotDifference[];
  width?: number;
  height?: number;
};

export const SPOT_DIFF_CATALOG: SpotDiffCatalogEntry[] = [
  {
    id: "img-zoo",
    title: "동물원",
    theme: "동물",
    difficulty: "easy",
    diffCount: 5,
    seed: 42001,
    imageLeft: "/spot-diff/zoo-left.svg",
    imageRight: "/spot-diff/zoo-right.svg",
    differences: [
      { id: 1, x: 330, y: 45, radius: 28 },
      { id: 2, x: 246, y: 55, radius: 24 },
      { id: 3, x: 61, y: 118, radius: 26 },
      { id: 4, x: 159, y: 200, radius: 26 },
      { id: 5, x: 220, y: 178, radius: 22 },
    ],
  },
  {
    id: "img-picnic",
    title: "해변 피크닉",
    theme: "음식",
    difficulty: "medium",
    diffCount: 6,
    seed: 42002,
    imageLeft: "/spot-diff/picnic-left.svg",
    imageRight: "/spot-diff/picnic-right.svg",
    differences: [
      { id: 1, x: 200, y: 190, radius: 42 },
      { id: 2, x: 109, y: 211, radius: 24 },
      { id: 3, x: 250, y: 210, radius: 22 },
      { id: 4, x: 305, y: 200, radius: 24 },
      { id: 5, x: 306, y: 174, radius: 28 },
      { id: 6, x: 64, y: 226, radius: 22 },
    ],
  },
  { id: "park-easy", title: "공원 산책", theme: "공원", difficulty: "easy", diffCount: 5, seed: 41001 },
  { id: "beach-easy", title: "해변 휴가", theme: "해변", difficulty: "easy", diffCount: 5, seed: 41002 },
  { id: "village-med", title: "마을 풍경", theme: "마을", difficulty: "medium", diffCount: 7, seed: 41003 },
  { id: "forest-med", title: "숲속 오후", theme: "숲", difficulty: "medium", diffCount: 7, seed: 41004 },
  { id: "park-hard", title: "공원 저녁", theme: "공원", difficulty: "hard", diffCount: 8, seed: 41005 },
  { id: "beach-hard", title: "바닷가 석양", theme: "해변", difficulty: "hard", diffCount: 8, seed: 41006 },
  { id: "forest-hard", title: "깊은 숲", theme: "숲", difficulty: "hard", diffCount: 9, seed: 41007 },
  { id: "village-easy", title: "작은 마을", theme: "마을", difficulty: "easy", diffCount: 5, seed: 41008 },
  { id: "park-event", title: "봄 축제", theme: "공원", difficulty: "medium", diffCount: 7, seed: 41009 },
  { id: "beach-event", title: "서핑 데이", theme: "해변", difficulty: "medium", diffCount: 7, seed: 41010 },
  { id: "forest-event", title: "캠핑장", theme: "숲", difficulty: "hard", diffCount: 9, seed: 41011 },
  { id: "village-event", title: "야시장", theme: "마을", difficulty: "hard", diffCount: 8, seed: 41012 },
];

export function getCatalogEntry(id: string): SpotDiffCatalogEntry | undefined {
  return SPOT_DIFF_CATALOG.find((e) => e.id === id);
}

export function loadCatalogPuzzle(entry: SpotDiffCatalogEntry): SpotDiffPuzzle {
  if (entry.imageLeft && entry.imageRight && entry.differences?.length) {
    return {
      width: entry.width ?? SPOT_DIFF_WIDTH,
      height: entry.height ?? SPOT_DIFF_HEIGHT,
      left: [],
      right: [],
      differences: entry.differences,
      seed: entry.seed,
      theme: entry.theme,
      puzzleId: entry.id,
      title: entry.title,
      difficulty: entry.difficulty,
      imageLeft: entry.imageLeft,
      imageRight: entry.imageRight,
    };
  }

  const base = generateSpotDiffPuzzle(entry.seed, entry.diffCount);
  return {
    ...base,
    puzzleId: entry.id,
    title: entry.title,
    difficulty: entry.difficulty,
    imageLeft: entry.imageLeft,
    imageRight: entry.imageRight,
    theme: entry.theme,
  };
}

export function pickCatalogPuzzle(opts?: {
  difficulty?: SpotDiffDifficulty;
  excludeIds?: string[];
}): SpotDiffPuzzle {
  let pool = [...SPOT_DIFF_CATALOG];
  if (opts?.difficulty) pool = pool.filter((e) => e.difficulty === opts.difficulty);
  if (opts?.excludeIds?.length) {
    const ex = new Set(opts.excludeIds);
    const filtered = pool.filter((e) => !ex.has(e.id));
    if (filtered.length) pool = filtered;
  }
  const entry = pool[Math.floor(Math.random() * pool.length)] ?? SPOT_DIFF_CATALOG[0]!;
  return loadCatalogPuzzle(entry);
}

export function pickNextInfinitePuzzle(usedIds: string[]): SpotDiffPuzzle {
  return pickCatalogPuzzle({ excludeIds: usedIds.slice(-6) });
}

/** 새 이미지 퍼즐 추가 시 참고용 템플릿 */
export function spotDiffImagePuzzleTemplate(
  id: string,
  title: string,
  theme: string,
  left: string,
  right: string,
  differences: SpotDifference[],
  difficulty: SpotDiffDifficulty = "medium"
): SpotDiffCatalogEntry {
  return {
    id,
    title,
    theme,
    difficulty,
    diffCount: differences.length,
    seed: 0,
    imageLeft: left,
    imageRight: right,
    differences,
  };
}
