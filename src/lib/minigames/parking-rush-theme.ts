import type { MapType } from "./parking-rush-logic";

export type ParkingMapTheme = {
  skyTop: string;
  skyBottom: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  ambient: number;
  hemiSky: number;
  hemiGround: number;
  sunColor: number;
  sunIntensity: number;
  sunPos: [number, number, number];
  lampColor: number;
  lampIntensity: number;
  neon: string;
  gridColor: string;
};

export const PARKING_MAP_THEMES: Record<MapType, ParkingMapTheme> = {
  parking_lot: {
    skyTop: "#0c1222",
    skyBottom: "#1e293b",
    fog: "#0f172a",
    fogNear: 28,
    fogFar: 95,
    ambient: 0.42,
    hemiSky: 0x7dd3fc,
    hemiGround: 0x1e293b,
    sunColor: 0xffe4b5,
    sunIntensity: 0.75,
    sunPos: [18, 32, 12],
    lampColor: 0xfde68a,
    lampIntensity: 0.55,
    neon: "#22d3ee",
    gridColor: "#164e63",
  },
  mart: {
    skyTop: "#1a1033",
    skyBottom: "#312e81",
    fog: "#1e1b4b",
    fogNear: 30,
    fogFar: 100,
    ambient: 0.38,
    hemiSky: 0xc4b5fd,
    hemiGround: 0x312e81,
    sunColor: 0xe9d5ff,
    sunIntensity: 0.65,
    sunPos: [14, 28, 18],
    lampColor: 0xa78bfa,
    lampIntensity: 0.7,
    neon: "#a78bfa",
    gridColor: "#4c1d95",
  },
  apartment: {
    skyTop: "#14532d",
    skyBottom: "#1e293b",
    fog: "#14532d",
    fogNear: 32,
    fogFar: 105,
    ambient: 0.45,
    hemiSky: 0x86efac,
    hemiGround: 0x374151,
    sunColor: 0xfef3c7,
    sunIntensity: 0.8,
    sunPos: [22, 36, 8],
    lampColor: 0xfbbf24,
    lampIntensity: 0.5,
    neon: "#86efac",
    gridColor: "#166534",
  },
  downtown: {
    skyTop: "#0f172a",
    skyBottom: "#334155",
    fog: "#1e293b",
    fogNear: 25,
    fogFar: 88,
    ambient: 0.35,
    hemiSky: 0xfde047,
    hemiGround: 0x334155,
    sunColor: 0xfef08a,
    sunIntensity: 0.7,
    sunPos: [10, 40, 20],
    lampColor: 0xfacc15,
    lampIntensity: 0.65,
    neon: "#fde047",
    gridColor: "#854d0e",
  },
  underground: {
    skyTop: "#020617",
    skyBottom: "#0f172a",
    fog: "#020617",
    fogNear: 18,
    fogFar: 70,
    ambient: 0.55,
    hemiSky: 0x64748b,
    hemiGround: 0x0f172a,
    sunColor: 0xfbbf24,
    sunIntensity: 0.35,
    sunPos: [0, 20, 0],
    lampColor: 0xfbbf24,
    lampIntensity: 0.85,
    neon: "#fbbf24",
    gridColor: "#422006",
  },
  rooftop: {
    skyTop: "#0c4a6e",
    skyBottom: "#475569",
    fog: "#334155",
    fogNear: 35,
    fogFar: 110,
    ambient: 0.5,
    hemiSky: 0x7dd3fc,
    hemiGround: 0x475569,
    sunColor: 0xffffff,
    sunIntensity: 0.9,
    sunPos: [25, 45, 10],
    lampColor: 0xfde68a,
    lampIntensity: 0.45,
    neon: "#fde68a",
    gridColor: "#713f12",
  },
  harbor: {
    skyTop: "#082f49",
    skyBottom: "#0c4a6e",
    fog: "#0c4a6e",
    fogNear: 30,
    fogFar: 100,
    ambient: 0.4,
    hemiSky: 0x38bdf8,
    hemiGround: 0x1e3a5f,
    sunColor: 0xbae6fd,
    sunIntensity: 0.65,
    sunPos: [16, 30, 22],
    lampColor: 0x38bdf8,
    lampIntensity: 0.6,
    neon: "#38bdf8",
    gridColor: "#0e7490",
  },
  airport: {
    skyTop: "#1e1b4b",
    skyBottom: "#312e81",
    fog: "#1e1b4b",
    fogNear: 32,
    fogFar: 105,
    ambient: 0.38,
    hemiSky: 0xc4b5fd,
    hemiGround: 0x312e81,
    sunColor: 0xe0e7ff,
    sunIntensity: 0.72,
    sunPos: [20, 38, 14],
    lampColor: 0x818cf8,
    lampIntensity: 0.75,
    neon: "#c4b5fd",
    gridColor: "#4338ca",
  },
};

export function createAsphaltTexture(
  baseColor: string,
  lineColor: string,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 8000; i++) {
    const g = 20 + Math.floor(Math.random() * 35);
    ctx.fillStyle = `rgba(${g},${g + 4},${g + 8},0.08)`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  ctx.strokeStyle = lineColor;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  const cols = Math.max(4, Math.round(width / 5.5));
  const rows = Math.max(3, Math.round(height / 7.5));
  const cellW = 512 / cols;
  const cellH = 512 / rows;
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cellW, 0);
    ctx.lineTo(c * cellW, 512);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * cellH);
    ctx.lineTo(512, r * cellH);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.5;
  ctx.setLineDash([18, 14]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = lineColor;
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.stroke();

  return canvas;
}
