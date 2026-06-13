import type { ChessMoveInput } from "./chess-logic";

export type ChessPuzzle = {
  id: string;
  title: string;
  fen: string;
  solution: ChessMoveInput[];
  hint: string;
  difficulty: "easy" | "medium" | "hard";
};

export const CHESS_PUZZLES: ChessPuzzle[] = [
  {
    id: "back-rank-m1",
    title: "백랭크 메이트",
    fen: "6k1/5ppp/8/8/8/8/5PPP/5RK1 w - - 0 1",
    solution: [{ from: "f1", to: "f8" }],
    hint: "룩으로 8랭크를 공격하세요.",
    difficulty: "easy",
  },
  {
    id: "scholar-m1",
    title: "퀸 메이트",
    fen: "4k3/6Q1/8/8/8/8/8/4K3 w - - 0 1",
    solution: [{ from: "g7", to: "g8" }],
    hint: "퀸으로 g8에 메이트.",
    difficulty: "easy",
  },
  {
    id: "fork-m1",
    title: "나이트 포크",
    fen: "8/8/8/3qk3/8/3N4/8/4K3 w - - 0 1",
    solution: [{ from: "d3", to: "c5" }],
    hint: "나이트가 킹과 퀸을 동시에 공격하는 칸으로.",
    difficulty: "medium",
  },
  {
    id: "pin-m2",
    title: "룩 메이트",
    fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
    solution: [{ from: "e1", to: "e8" }],
    hint: "룩으로 8랭크 백랭크 메이트.",
    difficulty: "medium",
  },
  {
    id: "discovered-m1",
    title: "발견 공격",
    fen: "6k1/5ppp/8/8/8/3B4/5PPP/4R1K1 w - - 0 1",
    solution: [{ from: "e1", to: "e8" }],
    hint: "룩으로 백랭크를 공격하세요.",
    difficulty: "hard",
  },
];

export function getChessPuzzleById(id: string): ChessPuzzle | undefined {
  return CHESS_PUZZLES.find((p) => p.id === id);
}
