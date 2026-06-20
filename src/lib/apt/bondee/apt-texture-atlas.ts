"use client";

import * as THREE from "three";
import { BONDEE_PALETTE } from "./bondee-mesh-utils";
import { PASTEL } from "./dollhouse-meshes";

export type AtlasSlot = "wall" | "floorWood" | "floorAlt" | "trim" | "tile" | "shell";

const ATLAS_W = 512;
const ATLAS_H = 512;
const PASTEL_SHELL = 0xe8e4ec;

let atlasTexture: THREE.CanvasTexture | null = null;
const materialCache = new Map<AtlasSlot, THREE.MeshStandardMaterial>();

function hex(c: number) {
  return `#${c.toString(16).padStart(6, "0")}`;
}

function drawWood(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, base: number) {
  ctx.fillStyle = hex(base);
  ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + (i % 2) * 0.02})`;
    ctx.fillRect(x, y + i * (h / 8), w, h / 10);
  }
}

function drawWall(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, base: number) {
  ctx.fillStyle = hex(base);
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  for (let row = 0; row < 8; row++) ctx.fillRect(x, y + row * (h / 8), w, 2);
}

function buildAtlasCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_W;
  canvas.height = ATLAS_H;
  const ctx = canvas.getContext("2d")!;
  drawWall(ctx, 0, 0, 256, 256, 0xf4f0f2);
  drawWood(ctx, 256, 0, 256, 256, PASTEL.floorWood);
  drawWood(ctx, 0, 256, 256, 256, PASTEL.floorWoodAlt);
  drawWall(ctx, 256, 256, 128, 128, PASTEL.shellTrim);
  ctx.fillStyle = hex(BONDEE_PALETTE.tile);
  ctx.fillRect(384, 256, 128, 128);
  ctx.strokeStyle = hex(BONDEE_PALETTE.tileLine);
  for (let i = 0; i <= 128; i += 32) {
    ctx.strokeRect(384 + i, 256, 1, 128);
    ctx.strokeRect(384, 256 + i, 128, 1);
  }
  drawWall(ctx, 384, 384, 128, 128, PASTEL_SHELL);
  return canvas;
}

const UV: Record<AtlasSlot, { u: number; v: number; su: number; sv: number }> = {
  wall: { u: 0, v: 0.5, su: 0.5, sv: 0.5 },
  floorWood: { u: 0.5, v: 0.5, su: 0.5, sv: 0.5 },
  floorAlt: { u: 0, v: 0, su: 0.5, sv: 0.5 },
  trim: { u: 0.5, v: 0, su: 0.25, sv: 0.25 },
  tile: { u: 0.75, v: 0, su: 0.25, sv: 0.25 },
  shell: { u: 0.75, v: 0.25, su: 0.25, sv: 0.25 },
};

function getAtlasTexture(): THREE.CanvasTexture {
  if (!atlasTexture) {
    atlasTexture = new THREE.CanvasTexture(buildAtlasCanvas());
    atlasTexture.colorSpace = THREE.SRGBColorSpace;
    atlasTexture.wrapS = atlasTexture.wrapT = THREE.RepeatWrapping;
    atlasTexture.anisotropy = 4;
  }
  return atlasTexture;
}

/** 공유 texture atlas — draw call·VRAM 절감 */
export function getAptAtlasMaterial(slot: AtlasSlot, opts?: Partial<THREE.MeshStandardMaterialParameters>): THREE.MeshStandardMaterial {
  const cached = materialCache.get(slot);
  if (cached && !opts) return cached;

  const tex = getAtlasTexture().clone();
  tex.needsUpdate = true;
  const region = UV[slot];
  tex.offset.set(region.u, region.v);
  tex.repeat.set(region.su * 4, region.sv * 4);

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.74,
    metalness: 0.02,
    ...opts,
  });
  if (!opts) materialCache.set(slot, mat);
  return mat;
}

export function disposeAptTextureAtlas() {
  atlasTexture?.dispose();
  atlasTexture = null;
  materialCache.forEach((m) => {
    m.map?.dispose();
    m.dispose();
  });
  materialCache.clear();
}
