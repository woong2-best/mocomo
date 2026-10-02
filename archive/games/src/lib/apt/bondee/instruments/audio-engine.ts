"use client";

import type { InstrumentKind } from "./types";
import { INSTRUMENT_SPECS } from "./architecture";
import { midiToFreq } from "./types";

let ctx: AudioContext | null = null;
const activeNodes = new Map<string, { stop: () => void }>();

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export async function unlockInstrumentAudio() {
  const c = ac();
  if (c?.state === "suspended") await c.resume();
}

function env(g: GainNode, t0: number, attack: number, decay: number, sustain: number, release: number, peak: number) {
  g.gain.setValueAtTime(0.001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + attack);
  g.gain.linearRampToValueAtTime(sustain * peak, t0 + attack + decay);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + attack + decay + release);
}

function playKeyboard(freq: number, gain = 0.2) {
  const c = ac();
  if (!c) return () => {};
  const t0 = c.currentTime;
  const g = c.createGain();
  g.connect(c.destination);
  env(g, t0, 0.005, 0.08, 0.35, 0.45, gain);
  const osc1 = c.createOscillator();
  osc1.type = "triangle";
  osc1.frequency.value = freq;
  const osc2 = c.createOscillator();
  osc2.type = "sine";
  osc2.frequency.value = freq * 2;
  const g2 = c.createGain();
  g2.gain.value = 0.25;
  osc1.connect(g);
  osc2.connect(g2);
  g2.connect(g);
  osc1.start(t0);
  osc2.start(t0);
  osc1.stop(t0 + 0.7);
  osc2.stop(t0 + 0.7);
  return () => {
    try {
      osc1.stop();
      osc2.stop();
    } catch {
      /* noop */
    }
  };
}

function playSynth(freq: number, gain = 0.18) {
  const c = ac();
  if (!c) return () => {};
  const t0 = c.currentTime;
  const g = c.createGain();
  const filt = c.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.setValueAtTime(freq * 6, t0);
  filt.frequency.exponentialRampToValueAtTime(freq * 1.5, t0 + 0.35);
  filt.connect(g);
  g.connect(c.destination);
  env(g, t0, 0.01, 0.12, 0.2, 0.35, gain);
  const osc = c.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = freq;
  osc.connect(filt);
  osc.start(t0);
  osc.stop(t0 + 0.6);
  return () => {
    try {
      osc.stop();
    } catch {
      /* noop */
    }
  };
}

function playPluck(freq: number, gain = 0.22) {
  const c = ac();
  if (!c) return () => {};
  const t0 = c.currentTime;
  const g = c.createGain();
  g.connect(c.destination);
  env(g, t0, 0.002, 0.06, 0.15, 0.35, gain);
  const osc = c.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.98, t0 + 0.4);
  osc.connect(g);
  osc.start(t0);
  osc.stop(t0 + 0.5);
  const osc2 = c.createOscillator();
  osc2.type = "sine";
  osc2.frequency.value = freq * 2;
  const g2 = c.createGain();
  g2.gain.setValueAtTime(gain * 0.3, t0);
  g2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25);
  osc2.connect(g2);
  g2.connect(c.destination);
  osc2.start(t0);
  osc2.stop(t0 + 0.3);
  return () => {
    try {
      osc.stop();
      osc2.stop();
    } catch {
      /* noop */
    }
  };
}

function playBowed(freq: number, gain = 0.16, sustain = 0.5) {
  const c = ac();
  if (!c) return () => {};
  const t0 = c.currentTime;
  const g = c.createGain();
  const filt = c.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.value = freq * 2;
  filt.Q.value = 2;
  filt.connect(g);
  g.connect(c.destination);
  env(g, t0, 0.08, 0.1, 0.4, sustain, gain);
  const osc = c.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = freq;
  osc.connect(filt);
  osc.start(t0);
  osc.stop(t0 + sustain + 0.2);
  return () => {
    try {
      osc.stop();
    } catch {
      /* noop */
    }
  };
}

function playMallet(freq: number, gain = 0.24, woody = true) {
  const c = ac();
  if (!c) return () => {};
  const t0 = c.currentTime;
  const g = c.createGain();
  g.connect(c.destination);
  env(g, t0, 0.002, 0.04, 0.1, woody ? 0.55 : 0.35, gain);
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t0 + 0.4);
  osc.connect(g);
  osc.start(t0);
  osc.stop(t0 + 0.65);
  if (woody) {
    const osc2 = c.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.value = freq * 2.76;
    const g2 = c.createGain();
    g2.gain.setValueAtTime(gain * 0.35, t0);
    g2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.15);
    osc2.connect(g2);
    g2.connect(c.destination);
    osc2.start(t0);
    osc2.stop(t0 + 0.2);
  }
  return () => {
    try {
      osc.stop();
    } catch {
      /* noop */
    }
  };
}

function playDrum(kind: "kick" | "snare" | "hihat" | "tom" | "crash" | "ride", gain = 0.28) {
  const c = ac();
  if (!c) return () => {};
  const t0 = c.currentTime;
  const g = c.createGain();
  g.connect(c.destination);

  if (kind === "kick") {
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, t0);
    osc.frequency.exponentialRampToValueAtTime(40, t0 + 0.12);
    env(g, t0, 0.001, 0.04, 0.01, 0.25, gain);
    osc.connect(g);
    osc.start(t0);
    osc.stop(t0 + 0.35);
  } else if (kind === "snare") {
    env(g, t0, 0.001, 0.02, 0.05, 0.12, gain);
    const bufferSize = Math.floor(c.sampleRate * 0.15);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filt = c.createBiquadFilter();
    filt.type = "highpass";
    filt.frequency.value = 900;
    src.connect(filt);
    filt.connect(g);
    src.start(t0);
    src.stop(t0 + 0.18);
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 180;
    const g2 = c.createGain();
    g2.gain.setValueAtTime(gain * 0.4, t0);
    g2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);
    osc.connect(g2);
    g2.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + 0.1);
  } else if (kind === "hihat") {
    env(g, t0, 0.001, 0.01, 0.01, 0.06, gain * 0.7);
    const bufferSize = Math.floor(c.sampleRate * 0.08);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filt = c.createBiquadFilter();
    filt.type = "highpass";
    filt.frequency.value = 7000;
    src.connect(filt);
    filt.connect(g);
    src.start(t0);
    src.stop(t0 + 0.1);
  } else {
    const freq = kind === "tom" ? 140 : kind === "crash" ? 320 : 260;
    env(g, t0, 0.001, 0.03, 0.05, kind === "crash" ? 0.9 : 0.45, gain * (kind === "crash" ? 0.55 : 0.4));
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, t0 + 0.3);
    osc.connect(g);
    osc.start(t0);
    osc.stop(t0 + 0.8);
    if (kind === "crash" || kind === "ride") {
      const bufferSize = Math.floor(c.sampleRate * 0.4);
      const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.3;
      const src = c.createBufferSource();
      src.buffer = buffer;
      const filt = c.createBiquadFilter();
      filt.type = "highpass";
      filt.frequency.value = 4000;
      src.connect(filt);
      const gN = c.createGain();
      gN.gain.setValueAtTime(gain * 0.25, t0);
      gN.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
      filt.connect(gN);
      gN.connect(c.destination);
      src.start(t0);
      src.stop(t0 + 0.55);
    }
  }
  return () => {};
}

function playWind(freq: number, brass: boolean, gain = 0.15) {
  const c = ac();
  if (!c) return () => {};
  const t0 = c.currentTime;
  const g = c.createGain();
  const filt = c.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.value = brass ? freq * 1.8 : freq * 2.2;
  filt.Q.value = brass ? 4 : 6;
  filt.connect(g);
  g.connect(c.destination);
  env(g, t0, 0.06, 0.08, 0.35, 0.35, gain);
  const osc = c.createOscillator();
  osc.type = brass ? "sawtooth" : "square";
  osc.frequency.value = freq;
  osc.connect(filt);
  osc.start(t0);
  osc.stop(t0 + 0.55);
  const bufferSize = Math.floor(c.sampleRate * 0.2);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const breath = c.createGain();
  breath.gain.setValueAtTime(gain * 0.08, t0);
  breath.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25);
  src.connect(breath);
  breath.connect(c.destination);
  src.start(t0);
  src.stop(t0 + 0.3);
  return () => {
    try {
      osc.stop();
    } catch {
      /* noop */
    }
  };
}

function playPanFlute(freq: number, gain = 0.18) {
  const c = ac();
  if (!c) return () => {};
  const t0 = c.currentTime;
  const g = c.createGain();
  g.connect(c.destination);
  env(g, t0, 0.02, 0.05, 0.3, 0.25, gain);
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;
  osc.connect(g);
  osc.start(t0);
  osc.stop(t0 + 0.45);
  return () => {
    try {
      osc.stop();
    } catch {
      /* noop */
    }
  };
}

function playOcarina(freq: number, gain = 0.16) {
  const c = ac();
  if (!c) return () => {};
  const t0 = c.currentTime;
  const g = c.createGain();
  const filt = c.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = freq * 4;
  filt.connect(g);
  g.connect(c.destination);
  env(g, t0, 0.03, 0.06, 0.25, 0.3, gain);
  const osc = c.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = freq;
  osc.connect(filt);
  osc.start(t0);
  osc.stop(t0 + 0.5);
  return () => {
    try {
      osc.stop();
    } catch {
      /* noop */
    }
  };
}

const DRUM_PAD_KINDS = ["kick", "snare", "hihat", "tom", "tom", "crash", "ride"] as const;

export function playInstrumentNote(kind: InstrumentKind, midi: number, padIndex?: number) {
  void unlockInstrumentAudio();
  const spec = INSTRUMENT_SPECS[kind];
  const freq = midiToFreq(midi);
  const id = `${kind}-${midi}-${padIndex ?? ""}-${Date.now()}`;

  let stop: () => void = () => {};

  switch (spec.family) {
    case "keyboard":
      stop = kind === "synthesizer" ? playSynth(freq) : playKeyboard(freq);
      break;
    case "string_fret":
      stop = playPluck(freq, kind === "bass_guitar" ? 0.28 : kind === "electric_guitar" ? 0.2 : 0.22);
      break;
    case "bowed":
      stop = playBowed(freq);
      break;
    case "harp":
      stop = playPluck(freq, 0.18);
      break;
    case "mallet":
      stop = playMallet(freq, 0.24, kind === "marimba");
      break;
    case "timpani":
      stop = playMallet(freq, 0.32, false);
      break;
    case "percussion_kit": {
      const drumKind = DRUM_PAD_KINDS[padIndex ?? 0] ?? "kick";
      stop = playDrum(drumKind);
      break;
    }
    case "wind_reed":
      stop = playWind(freq, false, kind === "accordion" ? 0.14 : 0.16);
      break;
    case "wind_brass":
      stop = playWind(freq, true, 0.17);
      break;
    case "pan_flute":
      stop = playPanFlute(freq);
      break;
    case "ocarina":
      stop = playOcarina(freq);
      break;
  }

  activeNodes.set(id, { stop });
  setTimeout(() => activeNodes.delete(id), 900);
}

export function stopAllInstrumentNotes() {
  for (const { stop } of activeNodes.values()) stop();
  activeNodes.clear();
}
