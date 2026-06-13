/** 틀린그림 찾기 문제 카탈로그 — 절手 seed + (선택) public PNG */

import { generateSpotDiffPuzzle, type SpotDiffPuzzle } from "./spot-diff-logic";

export type SpotDiffDifficulty = "easy" | "medium" | "hard";

export type SpotDiffCatalogEntry = {
  id: string;
  title: string;
  theme: string;
  difficulty: SpotDiffDifficulty;
  diffCount: number;
  /** 절手 생성 seed (무료) */
  seed: number;
  /** 추후: /spot-diff/park-left.png */
  imageLeft?: string;
  imageRight?: string;
};

export const SPOT_DIFF_CATALOG: SpotDiffCatalogEntry[] = [
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
