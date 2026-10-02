"use client";

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/** APT 전역 아트 디렉션 — 건물·복도·로비·실내가 공유하는 Bondee 파스텔 세계관 */
export const APT_ART = {
  bg: 0xfef6f8,
  skyWarm: 0xfff8f4,
  wallBase: 0xfff6ee,
  wallAccent: 0xffe8f0,
  wallPeach: 0xffecd9,
  wallMint: 0xd4f0e8,
  wallCool: 0xfff4e8,
  floorWood: 0xf5e6d3,
  floorWoodAlt: 0xecdcc8,
  floorTile: 0xfff8f0,
  lobbyFloor: 0xfff0e8,
  elevatorZone: 0xffe8d0,
  trim: 0xfff8f4,
  trimWood: 0xd4b896,
  trimDark: 0xb88860,
  metal: 0xe8d4bc,
  metalDark: 0xc8a878,
  elevatorDoor: 0xf0f8ff,
  glass: 0xd8eeff,
  accent: 0xffb4c8,
  accentSoft: 0xffd8e8,
  lightWarm: 0xfff0c8,
  lightCool: 0xffeed8,
  shadow: 0x3a2a28,
  doorPalette: [0xd4e8ff, 0xffe0ec, 0xe8e0ff, 0xffecd9, 0xd8f0e8, 0xfff0d8] as const,
  plant: 0x7ec898,
  plantPot: 0xffc8b0,
  bulletin: 0xfff8f0,
  signBlue: 0x5a9fd4,
  signWarm: 0xffa860,
} as const;

const matCache = new Map<string, THREE.MeshStandardMaterial>();

function cacheKey(color: number, opts?: Partial<THREE.MeshStandardMaterialParameters>) {
  return `${color}-${opts?.metalness ?? 0}-${opts?.roughness ?? 0.72}-${opts?.transparent ?? false}-${opts?.opacity ?? 1}`;
}

export function aptMat(
  color: number | string,
  opts?: Partial<THREE.MeshStandardMaterialParameters>
): THREE.MeshStandardMaterial {
  const c = typeof color === "string" ? color : color;
  const key = cacheKey(typeof c === "number" ? c : 0, opts);
  const hit = matCache.get(key);
  if (hit && !opts?.map) return hit;
  const mat = new THREE.MeshStandardMaterial({
    color: c,
    roughness: 0.68,
    metalness: 0.03,
    ...opts,
  });
  if (!opts?.map) matCache.set(key, mat);
  return mat;
}

export function aptWallMat(opts?: Partial<THREE.MeshStandardMaterialParameters>) {
  return aptMat(APT_ART.wallBase, { roughness: 0.82, ...opts });
}

export function aptFloorMat(variant: "wood" | "woodAlt" | "tile" = "wood") {
  const color =
    variant === "woodAlt" ? APT_ART.floorWoodAlt : variant === "tile" ? APT_ART.floorTile : APT_ART.floorWood;
  return aptMat(color, { roughness: 0.62 });
}

export function aptTrimMat() {
  return aptMat(APT_ART.trim, { roughness: 0.55 });
}

export function aptWoodMat(dark = false) {
  return aptMat(dark ? APT_ART.trimDark : APT_ART.trimWood, { roughness: 0.7 });
}

export function aptMetalMat(polished = false) {
  return aptMat(polished ? APT_ART.metal : APT_ART.metalDark, {
    metalness: polished ? 0.55 : 0.38,
    roughness: polished ? 0.22 : 0.4,
  });
}

export function aptGlowMat(color: number, intensity = 0.4) {
  return aptMat(color, { emissive: color, emissiveIntensity: intensity });
}

export function aptBox(w: number, h: number, d: number, r = 0.052) {
  return new RoundedBoxGeometry(w, h, d, 4, r);
}

export function doorColorForUnit(index: number) {
  return APT_ART.doorPalette[index % APT_ART.doorPalette.length];
}

export function makeCanvasLabel(text: string, opts?: { bg?: number; fg?: string; w?: number; h?: number }): THREE.CanvasTexture {
  const w = opts?.w ?? 128;
  const h = opts?.h ?? 48;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = `#${(opts?.bg ?? 0xffffff).toString(16).padStart(6, "0")}`;
  if (typeof ctx.roundRect === "function") ctx.roundRect(4, 4, w - 8, h - 8, 8);
  else ctx.fillRect(4, 4, w - 8, h - 8);
  ctx.fill();
  ctx.fillStyle = opts?.fg ?? "#334455";
  ctx.font = "600 22px system-ui,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2 + 1);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeBulletinBoardTexture(floor: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff8f0";
  ctx.fillRect(0, 0, 256, 192);
  ctx.strokeStyle = "#c9a882";
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 244, 180);
  ctx.fillStyle = "#4488cc";
  ctx.font = "bold 20px system-ui,sans-serif";
  ctx.fillText(`${floor}층 안내`, 20, 32);
  const notes = ["관리실 010-0000", "택배함 1층", "분리수거 금·목", "Elevator B"];
  ctx.fillStyle = "#556677";
  ctx.font = "14px system-ui,sans-serif";
  notes.forEach((n, i) => ctx.fillText(`• ${n}`, 18, 58 + i * 28));
  ctx.fillStyle = "#ffccd8";
  ctx.fillRect(160, 40, 72, 48);
  ctx.fillStyle = "#cc8899";
  ctx.font = "12px system-ui,sans-serif";
  ctx.fillText("공지", 180, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function disposeAptWorldArt() {
  matCache.forEach((m) => m.dispose());
  matCache.clear();
}
