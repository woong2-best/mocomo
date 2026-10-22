"use client";

import { textHasHangul } from "@/lib/ai-live/blocklist";
import { vowelOpen } from "@/lib/ai-live/motion";

export type LipSync = {
  /** RMS from the analyser while a line is playing, else null. */
  level: () => number | null;
  stop: () => void;
};

let primed: AudioContext | null = null;
let current: LipSync | null = null;

/** Call from the send button pointer-down so speech and audio survive the later fetch. */
export function primeHostAudio() {
  if (typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  if (synth) {
    synth.resume();
    const unlock = new SpeechSynthesisUtterance(".");
    unlock.volume = 0;
    unlock.rate = 2;
    synth.speak(unlock);
  }
  const AC =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  if (!primed || primed.state === "closed") primed = new AC();
  void primed.resume();
}

function pickVoice(korean: boolean): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  if (korean) {
    return (
      voices.find((v) => v.lang.toLowerCase().startsWith("ko") && /female/i.test(v.name)) ??
      voices.find((v) => v.lang.toLowerCase().startsWith("ko")) ??
      null
    );
  }
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith("en") && /female/i.test(v.name)) ??
    voices.find((v) => v.lang.toLowerCase().startsWith("en")) ??
    null
  );
}

/**
 * Audible voice is the free Web Speech API.
 * speechSynthesis audio cannot be tapped, so a vowel-shaped carrier is analysed
 * on the same clock and the speakers stay muted. MouthOpen follows that RMS.
 */
export function speakHostLine(text: string): LipSync {
  current?.stop();
  const spoken = text.trim().slice(0, 180);
  let alive = true;
  let analyser: AnalyserNode | null = null;
  let osc: OscillatorNode | null = null;
  const buf = new Uint8Array(256);

  const ctx = primed;
  if (spoken && ctx && ctx.state !== "closed") {
    void ctx.resume();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.45;
    osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 196;
    const shape = ctx.createGain();
    const mute = ctx.createGain();
    mute.gain.value = 0;
    osc.connect(shape);
    shape.connect(analyser);
    analyser.connect(mute);
    mute.connect(ctx.destination);
    const chars = Array.from(spoken);
    const step = 0.078;
    const t0 = ctx.currentTime + 0.03;
    shape.gain.setValueAtTime(0.02, t0);
    chars.forEach((ch, i) => {
      shape.gain.setValueAtTime(Math.max(0.05, vowelOpen(ch)), t0 + i * step);
    });
    const end = t0 + chars.length * step + 0.12;
    shape.gain.setValueAtTime(0.02, end);
    osc.start();
    osc.stop(end);
  }

  if (spoken && typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(spoken);
    const korean = textHasHangul(spoken);
    utter.lang = korean ? "ko-KR" : "en-US";
    utter.pitch = 1.16;
    utter.rate = 1.03;
    const voice = pickVoice(korean);
    if (voice) utter.voice = voice;
    utter.onend = () => {
      alive = false;
    };
    utter.onerror = () => {
      alive = false;
    };
    window.speechSynthesis.speak(utter);
  }

  const handle: LipSync = {
    level() {
      if (!alive || !analyser) return null;
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = ((buf[i] ?? 128) - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      return Math.max(0, Math.min(1, rms * 1.85));
    },
    stop() {
      alive = false;
      window.speechSynthesis?.cancel();
      try {
        osc?.stop();
      } catch {
        /* already stopped */
      }
    },
  };
  current = handle;
  return handle;
}

export function stopHostVoice() {
  current?.stop();
  current = null;
}
