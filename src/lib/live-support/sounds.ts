import type { SoundPresetId } from "@/lib/live-support/types";

let audioCtx: AudioContext | null = null;

function ctx() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function tone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.15
) {
  const c = ctx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(c.destination);
  const t = c.currentTime;
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration);
}

export function playCheerSound(id: SoundPresetId) {
  switch (id) {
    case "clap":
      tone(880, 0.08, "square", 0.08);
      setTimeout(() => tone(660, 0.08, "square", 0.08), 90);
      setTimeout(() => tone(880, 0.1, "square", 0.1), 180);
      break;
    case "boom":
      tone(80, 0.35, "sawtooth", 0.2);
      tone(40, 0.4, "sine", 0.25);
      break;
    case "boo":
      tone(220, 0.25, "sawtooth", 0.12);
      setTimeout(() => tone(180, 0.3, "sawtooth", 0.1), 120);
      break;
    case "meow":
      tone(520, 0.15, "triangle", 0.12);
      setTimeout(() => tone(780, 0.12, "triangle", 0.1), 100);
      setTimeout(() => tone(620, 0.2, "triangle", 0.08), 200);
      break;
    case "fanfare":
      [523, 659, 784, 1047].forEach((f, i) => {
        setTimeout(() => tone(f, 0.18, "square", 0.1), i * 110);
      });
      break;
    default:
      tone(440, 0.15);
  }
}
