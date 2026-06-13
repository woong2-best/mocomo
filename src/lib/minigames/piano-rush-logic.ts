/** 피아노 러쉬 — 공유 게임 로직 (클라이언트·서버) */

export const PIANO_RUSH_LANES = 4;
export const PIANO_RUSH_KEYS = ["d", "f", "j", "k"] as const;
export const PIANO_RUSH_COUNTDOWN_MS = 3000;
export const PIANO_RUSH_LOOKAHEAD_MS = 1600;
export const PIANO_RUSH_BATTLE_LIVES = 3;
export const PIANO_RUSH_ATTACK_COMBO = 50;
export const PIANO_RUSH_ATTACK_MS = 4000;

export const JUDGE_MS = { PERFECT: 20, GREAT: 50, GOOD: 100 } as const;
export const SCORE_BY_JUDGE = { PERFECT: 100, GREAT: 70, GOOD: 40, MISS: 0 } as const;

export type PianoJudge = keyof typeof SCORE_BY_JUDGE;
export type PianoNoteType = "tap" | "long" | "spam" | "slide" | "bomb";
export type PianoRushMode = "solo" | "duel" | "battle";
export type PianoDifficulty = "EASY" | "NORMAL" | "HARD" | "EXPERT" | "MASTER";
export type PianoCategory =
  | "classic"
  | "kpop"
  | "jpop"
  | "anime"
  | "game"
  | "edm"
  | "piano";

export type PianoChartNote = {
  id: string;
  t: number;
  lane: 0 | 1 | 2 | 3;
  type: PianoNoteType;
  /** 롱노트 길이(ms) */
  dur?: number;
  /** 연타 필요 횟수 */
  taps?: number;
  /** 슬라이드 방향 */
  dir?: "left" | "right";
};

export type PianoChart = {
  id: string;
  title: string;
  artist: string;
  category: PianoCategory;
  difficulty: PianoDifficulty;
  bpm: number;
  durationMs: number;
  notes: PianoChartNote[];
};

export type PianoPlayerStats = {
  score: number;
  combo: number;
  maxCombo: number;
  perfect: number;
  great: number;
  good: number;
  miss: number;
  lives: number;
  eliminated: boolean;
  hitNotes: string[];
  spamProgress: Record<string, number>;
  longStarted: Record<string, number>;
  debuffShakeUntil: number;
  debuffSpeedUntil: number;
};

export type PianoRushMove =
  | { type: "tap"; noteId: string; lane: number; atMs: number }
  | { type: "long_start"; noteId: string; lane: number; atMs: number }
  | { type: "long_end"; noteId: string; lane: number; atMs: number }
  | { type: "spam"; noteId: string; lane: number; atMs: number }
  | { type: "slide"; noteId: string; lane: number; dir: "left" | "right"; atMs: number }
  | { type: "attack" };

export function emptyPlayerStats(mode: PianoRushMode): PianoPlayerStats {
  return {
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfect: 0,
    great: 0,
    good: 0,
    miss: 0,
    lives: mode === "battle" ? PIANO_RUSH_BATTLE_LIVES : 999,
    eliminated: false,
    hitNotes: [],
    spamProgress: {},
    longStarted: {},
    debuffShakeUntil: 0,
    debuffSpeedUntil: 0,
  };
}

export function judgeDeltaMs(noteTimeMs: number, hitMs: number): number {
  return Math.abs(hitMs - noteTimeMs);
}

export function judgeHit(noteTimeMs: number, hitMs: number): PianoJudge {
  const d = judgeDeltaMs(noteTimeMs, hitMs);
  if (d <= JUDGE_MS.PERFECT) return "PERFECT";
  if (d <= JUDGE_MS.GREAT) return "GREAT";
  if (d <= JUDGE_MS.GOOD) return "GOOD";
  return "MISS";
}

export function accuracyPct(stats: PianoPlayerStats): number {
  const total = stats.perfect + stats.great + stats.good + stats.miss;
  if (total <= 0) return 100;
  const weighted = stats.perfect * 1 + stats.great * 0.85 + stats.good * 0.6;
  return Math.round((weighted / total) * 1000) / 10;
}

export function applyJudge(stats: PianoPlayerStats, judge: PianoJudge): PianoPlayerStats {
  const next = { ...stats };
  if (judge === "MISS") {
    next.combo = 0;
    next.miss += 1;
    return next;
  }
  next.combo += 1;
  next.maxCombo = Math.max(next.maxCombo, next.combo);
  next.score += SCORE_BY_JUDGE[judge] + Math.min(next.combo, 100);
  if (judge === "PERFECT") next.perfect += 1;
  else if (judge === "GREAT") next.great += 1;
  else next.good += 1;
  return next;
}

export function registerMiss(stats: PianoPlayerStats, mode: PianoRushMode): PianoPlayerStats {
  const next = applyJudge(stats, "MISS");
  if (mode === "battle") {
    next.lives -= 1;
    if (next.lives <= 0) next.eliminated = true;
  }
  return next;
}

export function pianoRushModeFromPlayers(count: number, requested?: PianoRushMode): PianoRushMode {
  if (requested === "solo" && count === 1) return "solo";
  if (requested === "battle" && count >= 3) return "battle";
  if (count === 1) return "solo";
  if (count === 2) return "duel";
  return requested === "battle" ? "battle" : "duel";
}

export function findNote(chart: PianoChart, noteId: string): PianoChartNote | undefined {
  return chart.notes.find((n) => n.id === noteId);
}

export function noteMissDeadlineMs(note: PianoChartNote): number {
  if (note.type === "long" && note.dur) return note.t + note.dur + JUDGE_MS.GOOD;
  if (note.type === "spam") return note.t + JUDGE_MS.GOOD + 400;
  return note.t + JUDGE_MS.GOOD;
}

export function buildPianoResultMessage(
  mode: PianoRushMode,
  stats: Record<string, PianoPlayerStats>,
  names: Record<string, string>,
  chartTitle: string
): { winnerId: string; resultMessage: string } {
  const ids = Object.keys(stats).filter((id) => !stats[id]?.eliminated);
  const ranked = [...ids].sort((a, b) => {
    const sa = stats[a]!;
    const sb = stats[b]!;
    if (sb.score !== sa.score) return sb.score - sa.score;
    return accuracyPct(sb) - accuracyPct(sa);
  });

  if (mode === "solo") {
    const uid = ranked[0] ?? Object.keys(stats)[0] ?? "";
    const s = stats[uid];
    return {
      winnerId: uid,
      resultMessage: `${chartTitle} · ${s?.score ?? 0}점 · ${accuracyPct(s ?? emptyPlayerStats("solo"))}% · 최대 ${s?.maxCombo ?? 0}콤보`,
    };
  }

  if (mode === "battle") {
    const alive = Object.keys(stats).filter((id) => !stats[id]?.eliminated);
    const winnerId = alive.length === 1 ? alive[0]! : ranked[0] ?? "";
    const name = names[winnerId] ?? "플레이어";
    return {
      winnerId,
      resultMessage: `배틀로얄 · ${name} 우승! · ${stats[winnerId]?.score ?? 0}점`,
    };
  }

  const [a, b] = Object.keys(stats);
  const wa = a ? stats[a]!.score : 0;
  const wb = b ? stats[b]!.score : 0;
  if (wa === wb && a && b) {
    const accA = accuracyPct(stats[a]!);
    const accB = accuracyPct(stats[b]!);
    if (accA !== accB) {
      const winnerId = accA > accB ? a : b;
      return {
        winnerId,
        resultMessage: `${chartTitle} · ${names[winnerId]} 승리 (정확도 ${Math.max(accA, accB)}%)`,
      };
    }
    return { winnerId: a ?? "", resultMessage: `${chartTitle} · 무승부` };
  }
  const winnerId = ranked[0] ?? "";
  return {
    winnerId,
    resultMessage: `${chartTitle} · ${names[winnerId] ?? "플레이어"} 승리 · ${stats[winnerId]?.score ?? 0}점`,
  };
}

export const PIANO_CATEGORY_LABELS: Record<PianoCategory, string> = {
  classic: "클래식",
  kpop: "K-POP",
  jpop: "J-POP",
  anime: "애니송",
  game: "게임 OST",
  edm: "EDM",
  piano: "피아노곡",
};

export const PIANO_MODE_LABELS: Record<PianoRushMode, string> = {
  solo: "싱글",
  duel: "1:1 대전",
  battle: "배틀로얄",
};
