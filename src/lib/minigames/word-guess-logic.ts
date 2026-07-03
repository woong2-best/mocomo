/** 단어 맞추기 파티 게임 상수·타입 */

export const WORD_GUESS_MAX_ROUNDS = 8;
export const WORD_GUESS_ROUND_SEC = 90;
export const WORD_GUESS_HINT_INTERVAL_SEC = 7;
export const WORD_GUESS_REVEAL_SEC = 3;
export const WORD_GUESS_MAX_HINTS = 10;

export type WordGuessPhase = "playing" | "reveal";

export type WordGuessSolveEvent = {
  userId: string;
  username: string;
  points: number;
  answer: string;
  at: number;
};

export type WordGuessPublicGame = {
  round: number;
  maxRounds: number;
  category: string;
  letterCount: number;
  revealedHints: string[];
  totalHints: number;
  timeLeft: number;
  nextHintIn: number;
  phase: WordGuessPhase;
  scores: Record<string, number>;
  roundSolved: boolean;
  answer: string | null;
  lastSolve: WordGuessSolveEvent | null;
};

export function computeWordGuessPoints(timeLeftSec: number, revealedHints: number): number {
  const base = 100;
  const hintPenalty = revealedHints * 8;
  const timeBonus = timeLeftSec * 2;
  return Math.max(10, base - hintPenalty + timeBonus);
}

export function rankedScores(
  scores: Record<string, number>,
  players: { userId: string; username: string }[]
): { userId: string; username: string; score: number; rank: number }[] {
  const sorted = [...players]
    .map((p) => ({ userId: p.userId, username: p.username, score: scores[p.userId] ?? 0 }))
    .sort((a, b) => b.score - a.score);
  let rank = 0;
  let prev = -1;
  return sorted.map((row, i) => {
    if (row.score !== prev) {
      rank = i + 1;
      prev = row.score;
    }
    return { ...row, rank };
  });
}
