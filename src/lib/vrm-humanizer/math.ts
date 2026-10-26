export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function damp(current: number, target: number, lambda: number, delta: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * delta));
}

export function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/** Chest Y/Z scale from a sine wave. Range is inclusive, typically 1.0–1.015. */
export function breathingScale(time: number, speed: number, min: number, max: number): number {
  const wave = 0.5 + 0.5 * Math.sin(time * speed);
  return lerp(min, max, wave);
}

/** Tiny head/neck pitch so the head nods with the breath. */
export function breathingHeadPitch(time: number, speed: number, amplitude: number): number {
  return Math.sin(time * speed) * amplitude;
}

export function intervalFromUnit(unit: number, min: number, max: number): number {
  return lerp(min, max, clamp01(unit));
}

export function slerpAlpha(elapsed: number, duration: number): number {
  if (duration <= 1e-5) return 1;
  return smoothstep(elapsed / duration);
}

export type CartoonEase = "elastic" | "bounce";

/** Fast start, overshoot, then settle — cartoon settle, not a linear blend. */
export function easeOutElastic(t: number): number {
  const x = clamp01(t);
  if (x === 0 || x === 1) return x;
  const c4 = (2 * Math.PI) / 3;
  return 2 ** (-10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
}

export function easeOutBounce(t: number): number {
  let x = clamp01(t);
  const n1 = 7.5625;
  const d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) {
    x -= 1.5 / d1;
    return n1 * x * x + 0.75;
  }
  if (x < 2.5 / d1) {
    x -= 2.25 / d1;
    return n1 * x * x + 0.9375;
  }
  x -= 2.625 / d1;
  return n1 * x * x + 0.984375;
}

export function cartoonEase(t: number, style: CartoonEase = "elastic"): number {
  return style === "bounce" ? easeOutBounce(t) : easeOutElastic(t);
}

export function cartoonSlerpAlpha(elapsed: number, duration: number, style: CartoonEase = "elastic"): number {
  if (duration <= 1e-5) return 1;
  return cartoonEase(elapsed / duration, style);
}

export const TOON_BOP_MAX = 0.012;
export const TOON_NOD_MAX = 0.055;
export const TOON_SWAY_MAX = 0.045;

/** hips.y offset. Negative sine = down, so a nod can lock to the same phase. */
export function toonBopOffset(time: number, speed: number, amplitude: number, phase = 0): number {
  return clamp(Math.sin(time * speed + phase) * amplitude, -TOON_BOP_MAX, TOON_BOP_MAX);
}

/** When hips drop, head pitch goes down. */
export function toonNodPitch(bopSine: number, nodAmp: number): number {
  return clamp(-bopSine * nodAmp, -TOON_NOD_MAX, TOON_NOD_MAX);
}

export function toonSwayRoll(time: number, speed: number, amplitude: number): number {
  return clamp(Math.sin(time * speed) * amplitude, -TOON_SWAY_MAX, TOON_SWAY_MAX);
}

/** Squash at the bottom of the bop. `amount` 1 → scale (1.02, 0.98). */
export function toonSquashScale(bopSine: number, rms: number, amount: number): { x: number; y: number } {
  const squash = Math.max(0, -bopSine) * clamp01(rms) * clamp01(amount);
  return { x: 1 + 0.02 * squash, y: 1 - 0.02 * squash };
}

export function angularVelocity(angleRad: number, delta: number): number {
  if (delta <= 1e-5) return 0;
  return Math.abs(angleRad) / delta;
}

export function shouldTriggerReflexBlink(velocity: number, threshold: number): boolean {
  return velocity >= threshold;
}

/**
 * Speaking louder raises procedural amplitude.
 * Mio-style explosion multiplies again after a volume threshold.
 */
export function rmsAmplitudeScale(
  rms: number,
  gain: number,
  explosionThreshold = 1,
  explosionMul = 1
): number {
  const volume = clamp01(rms);
  let scale = 1 + volume * gain;
  if (volume >= explosionThreshold && explosionMul > 1) {
    scale *= explosionMul;
  }
  return scale;
}

export type FsmState = "idle" | "thinking" | "speaking";

export function resolveFsmState(speaking: boolean, thinking: boolean): FsmState {
  if (speaking) return "speaking";
  if (thinking) return "thinking";
  return "idle";
}

const PANIC =
  /oops|sorry|embarrass|wait\b|uhh|\uB2F9\uD669|\uC5B4\uB5A1|\uBBF8\uC548|\uC81C\uBC1C/i;

export function shouldBoostSaccade(text?: string | null, emotion?: string | null): boolean {
  if (emotion?.trim().toLowerCase() === "surprised") return true;
  return Boolean(text && PANIC.test(text));
}
