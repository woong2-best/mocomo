/** Web Audio — 리듬게임 타격·판정·곡 재생 */

import type { PianoChartNote } from "./piano-rush-logic";

const LANE_FREQ = [261.63, 329.63, 392.0, 523.25] as const;

let ctx: AudioContext | null = null;
let melodyTimers: ReturnType<typeof setTimeout>[] = [];
let track: HTMLAudioElement | null = null;
let trackTimer: ReturnType<typeof setTimeout> | null = null;
let preloadEl: HTMLAudioElement | null = null;
let comboStreak = 0;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export async function unlockPianoAudio() {
  const c = ac();
  if (c?.state === "suspended") await c.resume();
}

function tone(freq: number, dur = 0.12, type: OscillatorType = "triangle", gain = 0.15, detune = 0) {
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function pianoHit(freq: number, gain = 0.22) {
  tone(freq, 0.08, "sine", gain * 0.9);
  tone(freq * 2, 0.06, "triangle", gain * 0.35, 4);
  tone(freq * 0.5, 0.14, "sine", gain * 0.25, -8);
}

export function playLaneNote(lane: number, combo = 0) {
  void unlockPianoAudio();
  const f = LANE_FREQ[lane] ?? LANE_FREQ[0];
  const pitchUp = Math.min(combo, 50) * 2;
  pianoHit(f, 0.24);
  if (combo > 0 && combo % 10 === 0) {
    tone(f * 1.5, 0.12, "sine", 0.1);
    tone(f * 2, 0.1, "square", 0.05);
  }
  void pitchUp;
}

export function playJudgeSound(judge: "PERFECT" | "GREAT" | "GOOD" | "MISS") {
  if (judge === "MISS") {
    comboStreak = 0;
    tone(80, 0.25, "sawtooth", 0.14);
    tone(60, 0.3, "square", 0.08);
    return;
  }
  comboStreak += 1;
  if (judge === "PERFECT") {
    pianoHit(880, 0.18);
    pianoHit(1320, 0.12);
    tone(1760, 0.06, "sine", 0.08);
  } else if (judge === "GREAT") {
    pianoHit(660, 0.14);
    tone(990, 0.08, "sine", 0.07);
  } else {
    pianoHit(440, 0.1);
  }
}

export function playCountdownTick(n: number) {
  void unlockPianoAudio();
  if (n === 0) {
    pianoHit(523.25, 0.28);
    tone(784, 0.2, "sine", 0.12);
    tone(1046, 0.15, "triangle", 0.08);
  } else {
    tone(330, 0.1, "square", 0.1);
    tone(440, 0.06, "sine", 0.06);
  }
}

export function playLongHold(lane: number) {
  const f = (LANE_FREQ[lane] ?? LANE_FREQ[0]) * 0.5;
  tone(f, 0.06, "sine", 0.08);
}

export function playAttackReceived() {
  tone(90, 0.35, "sawtooth", 0.16);
  tone(55, 0.4, "square", 0.1);
}

export function playFeverStart() {
  pianoHit(523.25, 0.2);
  pianoHit(659.25, 0.18);
  pianoHit(783.99, 0.16);
}

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
  track.volume = 0.92;

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
