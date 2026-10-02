/**
 * 퍼블릭 도메인(저작권 만료) 클래식 멜로디 기반 차트.
 * Web Audio 합성음만 사용 — MP3/스트리밍 없음.
 */

import type { PianoChart, PianoChartNote, PianoDifficulty } from "./piano-rush-logic";

function n(
  id: string,
  t: number,
  lane: 0 | 1 | 2 | 3,
  type: PianoChartNote["type"] = "tap",
  extra?: Partial<PianoChartNote>
): PianoChartNote {
  return { id, t, lane, type, ...extra };
}

/** BPM · 한 스텝 = 1/(beatDiv)박 */
function seq(
  prefix: string,
  bpm: number,
  lanes: (0 | 1 | 2 | 3 | "rest")[],
  startMs = 2200,
  beatDiv = 1
): PianoChartNote[] {
  const beatMs = 60000 / bpm;
  const stepMs = beatMs / beatDiv;
  const out: PianoChartNote[] = [];
  lanes.forEach((lane, i) => {
    if (lane === "rest") return;
    out.push(n(`${prefix}-${i}`, startMs + Math.round(i * stepMs), lane));
  });
  return out;
}

function chartMeta(
  id: string,
  title: string,
  artist: string,
  difficulty: PianoDifficulty,
  bpm: number,
  notes: PianoChartNote[],
  extra?: Partial<PianoChart>
): PianoChart {
  const end = notes.reduce((m, x) => Math.max(m, x.t + (x.dur ?? 0)), 0);
  return {
    id,
    title,
    artist,
    category: "classic",
    difficulty,
    bpm,
    durationMs: end + 2500,
    notes,
    ...extra,
  };
}

/** C=0 D=1 E=2 G=3 (4레인용 단순화) · F/A는 인접 레인 */
const TWINKLE = seq("tw", 96, [
  0, 0, 3, 3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 0, "rest", 3, 3, 2, 2, 1, 1, 0,
]);

const ODE_TO_JOY = seq("ode", 108, [
  2, 2, 3, 3, 3, 2, 1, 0, 0, 1, 2, 2, 1, 1, "rest", 2, 2, 3, 3, 3, 2, 1, 0, 0, 1, 2, 1, 0, 0,
]);

/** Für Elise 도입부 (단순화) */
const FUR_ELISE: PianoChartNote[] = [
  ...seq("fe", 120, [2, 1, 2, 1, 2, 3, 1, 0, 3], 2200, 2),
  n("fe-long", 5200, 2, "long", { dur: 600 }),
  ...seq("fe2", 120, [2, 1, 2, 1, 2, 3, 1, 0], 6200, 2),
];

const MINUET_G = seq("mg", 112, [
  3, 1, 2, 0, 1, 2, 3, 3, 1, 2, 0, 1, 0, "rest", 3, 1, 2, 0, 1, 2, 3, 2, 1, 0, 0,
]);

/** Pachelbel 캐논 — 베이스 진행 (D-A-Bm-F#m-G-D-G-A 느낌) */
const CANON_BASS = seq("can", 60, [0, 3, 2, 3, 0, 3, 0, 3, 0, 3, 2, 3, 0, 1, 2, 3], 2400, 1);

const CANON_MELODY = seq("canm", 60, [
  2, 3, 3, 2, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 2, 3, 3, 2, 1, 2, 3, 2, 1, 0,
], 4800, 2);

const GREENSLEEVE = seq("gr", 90, [
  0, 2, 3, 2, 1, 0, 1, 2, 3, 3, 2, 1, 0, "rest", 0, 2, 3, 2, 1, 0, 1, 2, 1, 0, 0,
]);

const MORNING_MOOD = seq("mm", 100, [
  0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 3, 2, 1, 0, "rest", 0, 1, 2, 3, 2, 3, 2, 1, 0,
]);

/** Mozart 를돌프 Variation 1 테마 (단순) */
const TWINKLE_VAR = seq("tv", 120, [0, 2, 0, 2, 0, 2, 0, 2, 3, 2, 1, 0, 3, 2, 1, 0], 2200, 2);

function withGameplayExtras(base: PianoChartNote[], prefix: string): PianoChartNote[] {
  const t = base.reduce((m, x) => Math.max(m, x.t), 0);
  if (t < 8000) return base;
  return [
    ...base,
    n(`${prefix}-lg`, Math.round(t * 0.45), 1, "long", { dur: 700 }),
    n(`${prefix}-sp`, Math.round(t * 0.55), 2, "spam", { taps: 4 }),
    n(`${prefix}-sl`, Math.round(t * 0.65), 3, "slide", { dir: "right" }),
  ];
}

export const CLASSICAL_CHARTS: PianoChart[] = [
  chartMeta("twinkle-star", "반짝반짝 작은별", "Traditional (PD)", "EASY", 96, withGameplayExtras(TWINKLE, "tw")),
  chartMeta("ode-to-joy", "환희의 송가", "Beethoven (PD)", "EASY", 108, ODE_TO_JOY),
  chartMeta("fur-elise", "엘리제를 위하여", "Beethoven (PD)", "NORMAL", 120, FUR_ELISE),
  chartMeta("minuet-g", "G장조 미뉴엣", "Bach (PD)", "NORMAL", 112, MINUET_G),
  chartMeta(
    "canon-d",
    "캐논 D장조",
    "Pachelbel (PD)",
    "NORMAL",
    60,
    [...CANON_BASS, ...CANON_MELODY, n("can-fin", 14000, 2, "long", { dur: 900 })]
  ),
  chartMeta("greensleeves", "그린슬리브스", "Traditional (PD)", "NORMAL", 90, GREENSLEEVE),
  chartMeta("morning-mood", "아침의 기분", "Grieg (PD)", "EASY", 100, MORNING_MOOD),
  chartMeta("twinkle-variation", "작은별 변주곡", "Mozart (PD)", "HARD", 120, TWINKLE_VAR),
];

export const CLASSICAL_CHART_IDS = CLASSICAL_CHARTS.map((c) => c.id);

export function getClassicalChartById(id: string): PianoChart | undefined {
  return CLASSICAL_CHARTS.find((c) => c.id === id);
}

export function pickClassicalChart(opts?: {
  chartId?: string;
  difficulty?: PianoDifficulty;
  excludeIds?: string[];
}): PianoChart {
  if (opts?.chartId) {
    const fixed = getClassicalChartById(opts.chartId);
    if (fixed) return fixed;
  }
  const exclude = new Set(opts?.excludeIds ?? []);
  let pool = CLASSICAL_CHARTS.filter((c) => !exclude.has(c.id));
  if (opts?.difficulty) {
    const by = pool.filter((c) => c.difficulty === opts.difficulty);
    if (by.length) pool = by;
  }
  return pool[Math.floor(Math.random() * pool.length)] ?? CLASSICAL_CHARTS[0]!;
}
