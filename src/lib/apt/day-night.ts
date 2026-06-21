export type DayPhase = "dawn" | "morning" | "afternoon" | "evening" | "night";

const PHASE_LABEL: Record<DayPhase, string> = {
  dawn: "새벽",
  morning: "아침",
  afternoon: "오후",
  evening: "저녁",
  night: "밤",
};

/** 실제 현재 시각 기준 0–24시 (분·초 포함) */
export function getRealWorldHour(now = new Date()): number {
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
}

export function formatWorldClock(hour: number): string {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour % 1) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function getDayPhase(hour: number): DayPhase {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 5 && h < 7) return "dawn";
  if (h >= 7 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 20) return "evening";
  return "night";
}

export function getDayPhaseLabel(hour: number): string {
  return PHASE_LABEL[getDayPhase(hour)];
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpColor(a: number, b: number, t: number) {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const bl = Math.round(lerp(ab, bb, t));
  return (r << 16) | (g << 8) | bl;
}

export type DayNightLighting = {
  skyColor: number;
  fogNear: number;
  fogFar: number;
  ambientIntensity: number;
  ambientColor: number;
  hemiIntensity: number;
  hemiSky: number;
  hemiGround: number;
  sunIntensity: number;
  sunColor: number;
  fillIntensity: number;
  fillColor: number;
  /** 0 = 낮, 1 = 한밤 */
  darkness: number;
  /** 0–1 Animal Crossing 따뜻함 */
  warmth: number;
  /** 0–1 창문·문틈 빛 강도 */
  windowGlow: number;
  exposure: number;
};

const SKY_DAY = 0xfff8f0;
const SKY_DAWN = 0xffc8a0;
const SKY_EVENING = 0xff9868;
const SKY_DUSK = 0xff7858;
const SKY_NIGHT = 0x1a2844;

/** 시간대별 하늘·조명 파라미터 (실시간 보간) */
export function getDayNightLighting(hour: number): DayNightLighting {
  const h = ((hour % 24) + 24) % 24;

  let skyColor = SKY_DAY;
  let darkness = 0;
  let warmth = 0.35;
  let windowGlow = 0.08;

  if (h < 5) {
    darkness = 1;
    skyColor = SKY_NIGHT;
    warmth = 0.15;
    windowGlow = 0.92;
  } else if (h < 7) {
    const t = smoothstep(5, 7, h);
    darkness = 1 - t;
    skyColor = lerpColor(SKY_NIGHT, SKY_DAWN, t);
    warmth = lerp(0.15, 0.55, t);
    windowGlow = lerp(0.92, 0.25, t);
  } else if (h < 17) {
    darkness = 0;
    warmth = h < 10 ? lerp(0.55, 0.42, smoothstep(7, 10, h)) : 0.38;
    windowGlow = 0.06;
    if (h < 8) {
      skyColor = lerpColor(SKY_DAWN, SKY_DAY, smoothstep(7, 8, h));
    } else {
      skyColor = SKY_DAY;
    }
  } else if (h < 20) {
    const t = smoothstep(17, 20, h);
    darkness = t;
    warmth = lerp(0.38, 0.72, t);
    windowGlow = lerp(0.08, 0.75, t);
    skyColor = lerpColor(SKY_DAY, SKY_EVENING, Math.min(1, t * 1.2));
    if (h >= 19) {
      skyColor = lerpColor(skyColor, SKY_NIGHT, smoothstep(19, 20, h));
    }
  } else {
    darkness = 1;
    skyColor = SKY_NIGHT;
    warmth = 0.12;
    windowGlow = 0.95;
  }

  const dayAmbient = 0.48;
  const nightAmbient = 0.06;
  const daySun = 0.78;
  const nightSun = 0.04;
  const dayHemi = 0.58;
  const nightHemi = 0.1;

  const eveningSun = lerpColor(0xfff0d8, 0xff8844, smoothstep(0.2, 0.85, darkness) * warmth);

  return {
    skyColor,
    fogNear: lerp(16, 11, darkness),
    fogFar: lerp(30, 24, darkness),
    ambientIntensity: lerp(dayAmbient, nightAmbient, darkness),
    ambientColor: lerpColor(0xfff8f0, 0x8899bb, darkness * 0.85),
    hemiIntensity: lerp(dayHemi, nightHemi, darkness),
    hemiSky: lerpColor(0xfff8f0, 0x445577, darkness),
    hemiGround: lerpColor(0xf5e6d3, 0x2a3344, darkness),
    sunIntensity: lerp(daySun, nightSun, darkness),
    sunColor: darkness > 0.2 ? eveningSun : lerpColor(0xfff5eb, 0xffcc88, warmth * 0.3),
    fillIntensity: lerp(0.32, 0.06, darkness),
    fillColor: lerpColor(0xffeed8, 0x334455, darkness),
    darkness,
    warmth,
    windowGlow,
    exposure: lerp(1.08, 0.78, darkness),
  };
}

export function isLampEffective(darkness: number) {
  return darkness > 0.25;
}
