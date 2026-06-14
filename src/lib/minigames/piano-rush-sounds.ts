/** Web Audio 타격음 + MP3 곡 재생 (Musopen CC PD) */

import type { PianoChartNote } from "./piano-rush-logic";

const LANE_FREQ = [261.63, 329.63, 392.0, 523.25] as const;

let ctx: AudioContext | null = null;
let melodyTimers: ReturnType<typeof setTimeout>[] = [];
let track: HTMLAudioElement | null = null;
let trackTimer: ReturnType<typeof setTimeout> | null = null;
let preloadEl: HTMLAudioElement | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export async function unlockPianoAudio() {
  const c = ac();
  if (c?.state === "suspended") await c.resume();
}

function tone(freq: number, dur = 0.12, type: OscillatorType = "triangle", gain = 0.15) {
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function playLaneNote(lane: number) {
  void unlockPianoAudio();
  const f = LANE_FREQ[lane] ?? LANE_FREQ[0];
  tone(f, 0.14, "triangle", 0.2);
}

export function playJudgeSound(judge: "PERFECT" | "GREAT" | "GOOD" | "MISS") {
  if (judge === "PERFECT") tone(880, 0.08, "sine", 0.12);
  else if (judge === "GREAT") tone(660, 0.08, "sine", 0.1);
  else if (judge === "GOOD") tone(440, 0.08, "sine", 0.08);
  else tone(120, 0.2, "sawtooth", 0.1);
}

export function playCountdownTick(n: number) {
  void unlockPianoAudio();
  tone(n === 0 ? 523.25 : 330, n === 0 ? 0.25 : 0.1, "square", 0.08);
}

export function playLongHold(lane: number) {
  const f = (LANE_FREQ[lane] ?? LANE_FREQ[0]) * 0.5;
  tone(f, 0.06, "sine", 0.06);
}

export function playAttackReceived() {
  tone(90, 0.35, "sawtooth", 0.14);
}

/** 카운트다운 중 MP3 프리로드 */
export function preloadChartTrack(audioUrl: string) {
  if (preloadEl?.src.includes(audioUrl)) return;
  preloadEl = new Audio(audioUrl);
  preloadEl.preload = "auto";
  preloadEl.load();
}

export function startChartTrack(
  chart: { audioUrl: string; audioOffsetMs?: number },
  startedAt: number
): () => void {
  stopChartTrack();
  track = new Audio(chart.audioUrl);
  track.preload = "auto";
  track.volume = 0.88;

  const offsetSec = (chart.audioOffsetMs ?? 0) / 1000;

  const begin = () => {
    if (!track) return;
    const lateMs = Math.max(0, Date.now() - startedAt);
    track.currentTime = offsetSec + lateMs / 1000;
    void unlockPianoAudio().then(() => {
      void track?.play().catch(() => {});
    });
  };

  const delay = startedAt - Date.now();
  if (delay > 0) {
    trackTimer = setTimeout(begin, delay);
  } else {
    begin();
  }

  return stopChartTrack;
}

export function stopChartTrack() {
  if (trackTimer) clearTimeout(trackTimer);
  trackTimer = null;
  if (track) {
    track.pause();
    track.removeAttribute("src");
    track.load();
    track = null;
  }
}

/** 합성음 차트용 — audioUrl 없을 때만 */
export function startChartMelody(notes: PianoChartNote[], startedAt: number): () => void {
  stopChartMelody();
  const now = Date.now();
  for (const note of notes) {
    if (note.type === "bomb") continue;
    const delay = startedAt + note.t - now;
    if (delay < -500) continue;
    const wait = Math.max(0, delay);
    const id = setTimeout(() => {
      const f = LANE_FREQ[note.lane] ?? LANE_FREQ[0];
      const dur = note.type === "long" && note.dur ? Math.min(note.dur / 1000, 0.8) : 0.1;
      tone(f, dur, "sine", note.type === "long" ? 0.07 : 0.05);
    }, wait);
    melodyTimers.push(id);
  }
  return stopChartMelody;
}

export function stopChartMelody() {
  for (const id of melodyTimers) clearTimeout(id);
  melodyTimers = [];
}

export function stopAllChartAudio() {
  stopChartTrack();
  stopChartMelody();
}
