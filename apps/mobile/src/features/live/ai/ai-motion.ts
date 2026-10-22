/** Idle motion tracks. No network. Each channel is independent. */

export type AiPose = {
  breath: number;
  head: number;
  blink: number;
  lookX: number;
  lookY: number;
  mouth: number;
  angry: number;
};

type SpeechCue = {
  start: number;
  stepMs: number;
  samples: number[];
};

export type AiMotionState = {
  lookX: number;
  lookY: number;
  nod: number;
  angryUntil: number;
  nextBlink: number;
  blinkUntil: number;
  speech: SpeechCue | null;
  mouth: number;
};

export function createAiMotion(now: number): AiMotionState {
  return {
    lookX: 0,
    lookY: 0,
    nod: 0,
    angryUntil: 0,
    nextBlink: now + 2000 + Math.random() * 3000,
    blinkUntil: 0,
    speech: null,
    mouth: 0,
  };
}

export function vowelOpen(ch: string): number {
  const code = ch.codePointAt(0) ?? 0;
  if (code >= 0xac00 && code <= 0xd7a3) {
    const vowel = Math.floor(((code - 0xac00) % 588) / 28);
    const table = [
      0.92, 0.7, 0.88, 0.62, 0.84, 0.58, 0.8, 0.5, 0.55, 0.48, 0.72, 0.6, 0.66, 0.86, 0.64, 0.78,
      0.52, 0.42, 0.34, 0.28, 0.22,
    ];
    return table[vowel] ?? 0.45;
  }
  const c = ch.toLowerCase();
  if (c === "a") return 0.95;
  if (c === "e") return 0.58;
  if (c === "i" || c === "y") return 0.26;
  if (c === "o") return 0.8;
  if (c === "u") return 0.38;
  if (c === "m" || c === "b" || c === "p") return 0.04;
  if (c === " " || c === "." || c === "," || c === "!" || c === "?") return 0.02;
  return 0.2;
}

export function cueSpeech(state: AiMotionState, text: string, now: number): number {
  const samples = Array.from(text).slice(0, 180).map((ch) => vowelOpen(ch));
  if (samples.length === 0) samples.push(0.2);
  const stepMs = 78;
  state.speech = { start: now, stepMs, samples };
  state.nod = 8;
  return samples.length * stepMs + 160;
}

export function cueAngry(state: AiMotionState, now: number) {
  state.angryUntil = now + 2200;
  state.nod = 6;
}

export function cueNod(state: AiMotionState) {
  state.nod = 8;
}

export function setLook(state: AiMotionState, x: number, y: number) {
  state.lookX = Math.max(-1, Math.min(1, x));
  state.lookY = Math.max(-1, Math.min(1, y));
}

export function stepAiMotion(state: AiMotionState, now: number, reduced: boolean): AiPose {
  const t = now / 1000;
  if (now >= state.nextBlink) {
    state.blinkUntil = now + 120;
    state.nextBlink = now + 2000 + Math.random() * 3000;
  }
  const blink = now < state.blinkUntil ? 1 : 0;
  const angry = now < state.angryUntil ? 1 : 0;
  state.nod *= 0.88;
  if (state.nod < 0.04) state.nod = 0;

  let target = 0;
  const speech = state.speech;
  if (speech) {
    const idx = Math.floor((now - speech.start) / speech.stepMs);
    if (idx >= speech.samples.length) state.speech = null;
    else if (idx >= 0) target = speech.samples[idx] ?? 0;
  }
  state.mouth += (target - state.mouth) * 0.45;

  const sway = reduced ? 0.35 : angry ? 4.2 : 3.1;
  const head = Math.sin(t * (angry ? 2.2 : 0.85)) * sway + state.nod + state.lookX * 3.5;

  return {
    breath: Math.sin(t * 1.65) * (reduced ? 1 : 4),
    head,
    blink,
    lookX: state.lookX,
    lookY: state.lookY,
    mouth: state.mouth,
    angry,
  };
}
