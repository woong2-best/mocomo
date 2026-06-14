/**
 * Musopen CC PD 녹음 + BPM 그리드 노트 차트
 * audioOffsetMs 구간부터 playMs 동안 박자에 맞춰 4레인 노트 생성
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

const LANE_CYCLE = [0, 2, 1, 3, 2, 0, 3, 1] as const;

/** BPM · beatDiv(2=8분음표) 그리드로 노트 생성 */
function generateBeatNotes(
  prefix: string,
  bpm: number,
  noteStartMs: number,
  playMs: number,
  beatDiv = 2
): PianoChartNote[] {
  const stepMs = 60000 / bpm / beatDiv;
  const steps = Math.max(1, Math.floor(playMs / stepMs));
  const out: PianoChartNote[] = [];

  for (let i = 0; i < steps; i++) {
    const t = noteStartMs + Math.round(i * stepMs);
    const lane = LANE_CYCLE[i % LANE_CYCLE.length]!;

    if (i > 0 && i % 16 === 0) {
      out.push(n(`${prefix}-lg-${i}`, t, lane, "long", { dur: Math.round(stepMs * 3) }));
    } else if (i > 0 && i % 20 === 10) {
      out.push(n(`${prefix}-sl-${i}`, t, lane, "slide", { dir: i % 40 === 10 ? "right" : "left" }));
    } else if (i > 0 && i % 24 === 12) {
      out.push(n(`${prefix}-sp-${i}`, t, lane, "spam", { taps: 4 }));
    } else {
      out.push(n(`${prefix}-${i}`, t, lane));
    }
  }
  return out;
}

function audioChart(
  id: string,
  title: string,
  artist: string,
  difficulty: PianoDifficulty,
  bpm: number,
  audioFile: string,
  opts: {
    audioOffsetMs?: number;
    playMs?: number;
    noteStartMs?: number;
    beatDiv?: number;
    license?: string;
  } = {}
): PianoChart {
  const noteStartMs = opts.noteStartMs ?? 1800;
  const playMs = opts.playMs ?? 72000;
  const notes = generateBeatNotes(id, bpm, noteStartMs, playMs, opts.beatDiv ?? 2);
  const end = notes.reduce((m, x) => Math.max(m, x.t + (x.dur ?? 0)), noteStartMs);
  return {
    id,
    title,
    artist,
    category: "classic",
    difficulty,
    bpm,
    durationMs: end + 2200,
    notes,
    audioUrl: `/piano-rush/audio/${audioFile}`,
    audioOffsetMs: opts.audioOffsetMs ?? 0,
    license: opts.license ?? "Musopen · CC PD",
  };
}

export const AUDIO_CHARTS: PianoChart[] = [
  audioChart("pd-nocturne-bb-op9-1", "녹턴 Op.9 No.1 (B♭ minor)", "Chopin · Viñuela", "NORMAL", 46, "nocturne-bb-minor-op9-1.mp3", {
    audioOffsetMs: 4000,
    playMs: 78000,
    beatDiv: 1,
  }),
  audioChart("pd-nocturne-eb-op9-2", "녹턴 Op.9 No.2 (E♭ major)", "Chopin · Higuchi", "EASY", 54, "nocturne-eb-op9-2.mp3", {
    audioOffsetMs: 2500,
    playMs: 72000,
    beatDiv: 1,
  }),
  audioChart("pd-nocturne-b-op9-3", "녹턴 Op.9 No.3 (B major)", "Chopin · Xuan He", "NORMAL", 48, "nocturne-b-op9-3.mp3", {
    audioOffsetMs: 3000,
    playMs: 78000,
    beatDiv: 1,
  }),
  audioChart("pd-bassoon-k191", "바순 협주곡 K.191 I", "Mozart", "HARD", 116, "bassoon-k191-allegro.mp3", {
    audioOffsetMs: 3500,
    playMs: 90000,
    beatDiv: 2,
  }),
  audioChart("pd-violin-op61", "바이올린 협주곡 Op.61 I", "Beethoven", "HARD", 88, "violin-op61-allegro.mp3", {
    audioOffsetMs: 9000,
    playMs: 90000,
    beatDiv: 2,
  }),
  audioChart("pd-polonaise-heroique", "영웅 폴로네즈 Op.53", "Chopin", "HARD", 84, "polonaise-heroique-op53.mp3", {
    audioOffsetMs: 12000,
    playMs: 90000,
    beatDiv: 2,
  }),
  audioChart("pd-asturias", "아스투리아스 (레젠다)", "Albéniz", "EXPERT", 120, "asturias-leyenda.mp3", {
    audioOffsetMs: 2000,
    playMs: 90000,
    beatDiv: 2,
  }),
  audioChart("pd-beethoven-flute-var", "마술피리 주제 변주곡", "Beethoven", "NORMAL", 96, "beethoven-magic-flute-variations.mp3", {
    audioOffsetMs: 2500,
    playMs: 90000,
    beatDiv: 2,
  }),
  audioChart("pd-pathetique-adagio", "패테티크 II. 아다지오", "Beethoven", "EASY", 52, "pathetique-adagio.mp3", {
    audioOffsetMs: 3500,
    playMs: 70000,
    beatDiv: 1,
  }),
  audioChart("pd-pathetique-rondo", "패테티크 III. 론도", "Beethoven", "HARD", 132, "pathetique-rondo.mp3", {
    audioOffsetMs: 2000,
    playMs: 90000,
    beatDiv: 2,
  }),
  audioChart("pd-sonatina-1-allegro", "소나티나 1번 I. 알레그로", "Clementi", "NORMAL", 120, "sonatina-1-allegro.mp3", {
    audioOffsetMs: 800,
    playMs: 62000,
    beatDiv: 2,
  }),
  audioChart("pd-sonatina-1-andante", "소나티나 1번 II. 안단테", "Clementi", "EASY", 76, "sonatina-1-andante.mp3", {
    audioOffsetMs: 800,
    playMs: 62000,
    beatDiv: 1,
  }),
  audioChart("pd-sonatina-1-vivace", "소나티나 1번 III. 비바체", "Clementi", "HARD", 144, "sonatina-1-vivace.mp3", {
    audioOffsetMs: 500,
    playMs: 58000,
    beatDiv: 2,
  }),
  audioChart("pd-k331-andante", "K.331 I. 안단테 그라치오소", "Mozart", "EASY", 60, "k331-andante-grazioso.mp3", {
    audioOffsetMs: 2500,
    playMs: 90000,
    beatDiv: 1,
  }),
  audioChart("pd-k331-menuetto", "K.331 II. 미뉴에트", "Mozart", "NORMAL", 100, "k331-menuetto.mp3", {
    audioOffsetMs: 1500,
    playMs: 75000,
    beatDiv: 2,
  }),
  audioChart("pd-k331-turca", "K.331 III. 터키 행진곡", "Mozart", "NORMAL", 120, "k331-alla-turca.mp3", {
    audioOffsetMs: 1200,
    playMs: 90000,
    beatDiv: 2,
  }),
];

export const AUDIO_CHART_IDS = AUDIO_CHARTS.map((c) => c.id);

export function getAudioChartById(id: string): PianoChart | undefined {
  return AUDIO_CHARTS.find((c) => c.id === id);
}

export function pickAudioChart(opts?: {
  chartId?: string;
  difficulty?: PianoDifficulty;
  excludeIds?: string[];
}): PianoChart | undefined {
  if (opts?.chartId) {
    const fixed = getAudioChartById(opts.chartId);
    if (fixed) return fixed;
  }
  const exclude = new Set(opts?.excludeIds ?? []);
  let pool = AUDIO_CHARTS.filter((c) => !exclude.has(c.id));
  if (opts?.difficulty) {
    const by = pool.filter((c) => c.difficulty === opts.difficulty);
    if (by.length) pool = by;
  }
  if (!pool.length) return undefined;
  return pool[Math.floor(Math.random() * pool.length)];
}
