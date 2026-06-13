/** Web Audio 비프 — 외부 MP3 없이 무료 효과음 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function beep(freq: number, durationMs: number, type: OscillatorType = "sine", gain = 0.08) {
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(ac.destination);
  const t = ac.currentTime;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + durationMs / 1000);
  osc.start(t);
  osc.stop(t + durationMs / 1000 + 0.02);
}

export function playSpotSound(kind: "correct" | "wrong" | "clear" | "hint") {
  try {
    if (kind === "correct") {
      beep(880, 90);
      setTimeout(() => beep(1175, 80), 70);
    } else if (kind === "wrong") {
      beep(220, 140, "square", 0.05);
    } else if (kind === "clear") {
      beep(523, 100);
      setTimeout(() => beep(659, 100), 90);
      setTimeout(() => beep(784, 160), 180);
    } else if (kind === "hint") {
      beep(440, 120, "triangle", 0.06);
    }
  } catch {
    /* ignore audio errors */
  }
}
