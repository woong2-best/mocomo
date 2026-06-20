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
  exposure: number;
};

const SKY_DAY = 0xfef6f8;
const SKY_DAWN = 0xffb88a;
const SKY_DUSK = 0xff8866;
const SKY_NIGHT = 0x0a1628;

/** 시간대별 하늘·조명 파라미터 (실시간 보간) */
export function getDayNightLighting(hour: number): DayNightLighting {
  const h = ((hour % 24) + 24) % 24;

  let skyColor = SKY_DAY;
  let darkness = 0;

  if (h < 5) {
    darkness = 1;
    skyColor = SKY_NIGHT;
  } else if (h < 7) {
    const t = smoothstep(5, 7, h);
    darkness = 1 - t;
    skyColor = lerpColor(SKY_NIGHT, SKY_DAWN, t);
  } else if (h < 17) {
    darkness = 0;
    if (h < 8) {
      skyColor = lerpColor(SKY_DAWN, SKY_DAY, smoothstep(7, 8, h));
    } else {
      skyColor = SKY_DAY;
    }
  } else if (h < 20) {
    const t = smoothstep(17, 20, h);
    darkness = t;
    skyColor = lerpColor(SKY_DAY, SKY_DUSK, t * 0.6);
    if (h >= 19) {
      skyColor = lerpColor(skyColor, SKY_NIGHT, smoothstep(19, 20, h));
    }
  } else {
    darkness = 1;
    skyColor = SKY_NIGHT;
  }

  const dayAmbient = 0.42;
  const nightAmbient = 0.04;
  const daySun = 0.72;
  const nightSun = 0.02;
  const dayHemi = 0.55;
  const nightHemi = 0.08;

  return {
    skyColor,
    fogNear: lerp(14, 10, darkness),
    fogFar: lerp(28, 22, darkness),
    ambientIntensity: lerp(dayAmbient, nightAmbient, darkness),
    ambientColor: lerpColor(0xffffff, 0x8899bb, darkness),
    hemiIntensity: lerp(dayHemi, nightHemi, darkness),
    hemiSky: lerpColor(0xfff8f0, 0x334466, darkness),
    hemiGround: lerpColor(0xe8d8f0, 0x1a2233, darkness),
    sunIntensity: lerp(daySun, nightSun, darkness),
    sunColor: lerpColor(0xfff5eb, 0x6688aa, darkness),
    fillIntensity: lerp(0.28, 0.04, darkness),
    fillColor: lerpColor(0xd8eeff, 0x223344, darkness),
    darkness,
    exposure: lerp(1.05, 0.72, darkness),
  };
}

export function isLampEffective(darkness: number) {
  return darkness > 0.25;
}
