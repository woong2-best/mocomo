"use client";

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { BONDEE_PALETTE, bondeeMat, roundedBox } from "./bondee-mesh-utils";
import type { AptRoom } from "@/lib/apt/floor-plan-types";

const cache = new Map<string, THREE.CanvasTexture>();

export type WallPattern = "plain" | "stripe" | "dot" | "wainscot";
export type FloorKind = "wood-light" | "wood-dark" | "tile" | "carpet" | "beige";

export type RoomTheme = {
  wallAccent: number;
  wallPattern: WallPattern;
  floorKind: FloorKind;
  floorAccent: number;
  curtainColor: number;
  lightColor: number;
  lightIntensity: number;
};

function hex(c: number) {
  return `#${c.toString(16).padStart(6, "0")}`;
}

function makeCanvasTex(
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  repeat = { x: 2, y: 2 }
): THREE.CanvasTexture {
  const cached = cache.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat.x, repeat.y);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

export function bondeeWallTexture(accent: number, pattern: WallPattern = "stripe"): THREE.CanvasTexture {
  const key = `wall-${accent}-${pattern}`;
  return makeCanvasTex(key, 128, 128, (ctx) => {
    ctx.fillStyle = hex(accent);
    ctx.fillRect(0, 0, 128, 128);
    if (pattern === "stripe") {
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      for (let y = 0; y < 128; y += 10) ctx.fillRect(0, y, 128, 2);
      ctx.fillStyle = "rgba(0,0,0,0.035)";
      for (let x = 0; x < 128; x += 16) ctx.fillRect(x, 0, 1, 128);
    } else if (pattern === "dot") {
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      for (let y = 8; y < 128; y += 16) {
        for (let x = 8; x < 128; x += 16) ctx.fillRect(x, y, 3, 3);
      }
    } else if (pattern === "wainscot") {
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(0, 88, 128, 40);
      ctx.strokeStyle = "rgba(0,0,0,0.06)";
      for (let x = 0; x < 128; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 88);
        ctx.lineTo(x, 128);
        ctx.stroke();
      }
    }
  });
}

export function bondeeWoodFloorTexture(variant: "light" | "dark" = "light"): THREE.CanvasTexture {
  const key = `wood-${variant}`;
  const base = variant === "light" ? BONDEE_PALETTE.wood : BONDEE_PALETTE.woodDark;
  return makeCanvasTex(
    key,
    128,
    128,
    (ctx) => {
      ctx.fillStyle = hex(base);
      ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = `rgba(0,0,0,${0.025 + (i % 2) * 0.02})`;
        ctx.fillRect(0, i * 9, 128, 4);
        ctx.fillStyle = `rgba(255,255,255,${0.04 + (i % 3) * 0.02})`;
        ctx.fillRect(i * 9, 0, 2, 128);
      }
    },
    { x: 3, y: 3 }
  );
}

export function bondeeTileFloorTexture(): THREE.CanvasTexture {
  return makeCanvasTex(
    "tile-floor",
    64,
    64,
    (ctx) => {
      ctx.fillStyle = hex(BONDEE_PALETTE.tile);
      ctx.fillRect(0, 0, 64, 64);
      ctx.strokeStyle = hex(BONDEE_PALETTE.tileLine);
      ctx.lineWidth = 1;
      for (let i = 0; i <= 64; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 64);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(64, i);
        ctx.stroke();
      }
    },
    { x: 4, y: 4 }
  );
}

export function bondeeCarpetTexture(color: number): THREE.CanvasTexture {
  const key = `carpet-${color}`;
  return makeCanvasTex(
    key,
    96,
    96,
    (ctx) => {
      ctx.fillStyle = hex(color);
      ctx.fillRect(0, 0, 96, 96);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          if ((r + c) % 2 === 0) ctx.fillRect(c * 16 + 4, r * 16 + 4, 8, 8);
        }
      }
    },
    { x: 2, y: 2 }
  );
}

export function bondeeThemedMat(
  color: number,
  tex: THREE.CanvasTexture,
  opts?: Partial<THREE.MeshStandardMaterialParameters>
): THREE.MeshStandardMaterial {
  return bondeeMat(color, {
    map: tex,
    roughness: 0.72,
    metalness: 0.02,
    ...opts,
  });
}

export function bondeeThemedFloorMat(theme: RoomTheme): THREE.MeshStandardMaterial {
  switch (theme.floorKind) {
    case "wood-dark":
      return bondeeThemedMat(theme.floorAccent, bondeeWoodFloorTexture("dark"), { roughness: 0.68 });
    case "tile":
      return bondeeThemedMat(BONDEE_PALETTE.tile, bondeeTileFloorTexture(), { roughness: 0.55, metalness: 0.04 });
    case "carpet":
      return bondeeThemedMat(theme.floorAccent, bondeeCarpetTexture(theme.floorAccent), { roughness: 0.92 });
    case "beige":
      return bondeeThemedMat(theme.floorAccent, bondeeCarpetTexture(theme.floorAccent), { roughness: 0.88 });
    default:
      return bondeeThemedMat(theme.floorAccent, bondeeWoodFloorTexture("light"), { roughness: 0.65 });
  }
}

export function bondeeThemedWallMat(theme: RoomTheme): THREE.MeshStandardMaterial {
  return bondeeThemedMat(theme.wallAccent, bondeeWallTexture(theme.wallAccent, theme.wallPattern), {
    roughness: 0.78,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
}

const TYPE_THEMES: Record<string, Partial<RoomTheme>> = {
  living: { wallPattern: "plain", floorKind: "beige", curtainColor: 0xffd0e8, lightColor: 0xfff0e8 },
  bedroom: { wallPattern: "dot", floorKind: "wood-dark", wallAccent: BONDEE_PALETTE.wallLavender, lightColor: 0xe8e0ff },
  kitchen: { wallPattern: "wainscot", floorKind: "tile", wallAccent: BONDEE_PALETTE.wallPeach, lightColor: 0xfff4e0 },
  bathroom: { wallPattern: "plain", floorKind: "tile", wallAccent: BONDEE_PALETTE.bathroom, lightColor: 0xd8eeff },
  entrance: { wallPattern: "stripe", floorKind: "beige", wallAccent: BONDEE_PALETTE.wallMint, lightColor: 0xe8fff4 },
  hall: { wallPattern: "plain", floorKind: "beige", wallAccent: 0xf0f0f0, lightColor: 0xffffff },
  balcony: { wallPattern: "plain", floorKind: "tile", wallAccent: BONDEE_PALETTE.balcony, lightColor: 0xf0fff0 },
};

const ID_THEMES: Record<string, Partial<RoomTheme>> = {
  living: { wallAccent: BONDEE_PALETTE.wallPink, floorAccent: 0xe8ddd0, lightIntensity: 0.42 },
  "bedroom-1": { wallAccent: 0xe8d8ff, floorAccent: BONDEE_PALETTE.woodDark, curtainColor: 0xd8c8ff },
  "bedroom-2": { wallAccent: 0xe8d8ff, floorAccent: BONDEE_PALETTE.wood, floorKind: "wood-light", curtainColor: 0xd8c8ff },
  "bedroom-3": { wallAccent: 0xe8d8ff, floorAccent: BONDEE_PALETTE.wood, curtainColor: 0xd8c8ff },
  kitchen: { wallAccent: 0xffecd0, floorKind: "tile" },
  "hall-corridor": { wallAccent: 0xf5f0ea, floorKind: "beige", floorAccent: 0xe8ddd0 },
  entrance: { wallAccent: BONDEE_PALETTE.wallMint, floorKind: "beige", floorAccent: 0xe8ddd0 },
  bathroom: { wallAccent: BONDEE_PALETTE.bathroom, floorKind: "tile", floorAccent: 0xb8ccd8 },
  elevator: { wallAccent: 0xe8e8ec, floorKind: "tile" },
};

const ROOM_ACCENT_FALLBACK: Record<string, number> = {
  living: BONDEE_PALETTE.wallPink,
  bedroom: BONDEE_PALETTE.wallLavender,
  kitchen: BONDEE_PALETTE.wallPeach,
  bathroom: BONDEE_PALETTE.bathroom,
  entrance: BONDEE_PALETTE.wallMint,
  hall: 0xf0f0f0,
  balcony: BONDEE_PALETTE.balcony,
};

export function getRoomTheme(room: AptRoom): RoomTheme {
  const typeBase = TYPE_THEMES[room.type] ?? {};
  const idBase = ID_THEMES[room.id] ?? {};
  const wallAccent =
    (idBase.wallAccent as number | undefined) ??
    (typeBase.wallAccent as number | undefined) ??
    ROOM_ACCENT_FALLBACK[room.type] ??
    BONDEE_PALETTE.wallPink;

  return {
    wallAccent,
    wallPattern: (idBase.wallPattern ?? typeBase.wallPattern ?? "plain") as WallPattern,
    floorKind: (idBase.floorKind ?? typeBase.floorKind ?? (room.floor === "beige" ? "beige" : "wood-light")) as FloorKind,
    floorAccent:
      (idBase.floorAccent as number | undefined) ??
      (room.type === "bathroom" ? BONDEE_PALETTE.tile : BONDEE_PALETTE.wood),
    curtainColor: (idBase.curtainColor ?? typeBase.curtainColor ?? wallAccent) as number,
    lightColor: (idBase.lightColor ?? typeBase.lightColor ?? 0xfff8f0) as number,
    lightIntensity: (idBase.lightIntensity ?? typeBase.lightIntensity ?? 0.35) as number,
  };
}

export function buildRoomAmbience(
  room: AptRoom,
  w: number,
  d: number,
  cx: number,
  cz: number,
  theme: RoomTheme
): THREE.Group {
  const g = new THREE.Group();
  g.name = `room-ambience-${room.id}`;

  const pl = new THREE.PointLight(theme.lightColor, theme.lightIntensity * 1.15, 6.5);
  pl.position.set(cx, 2.05, cz);
  pl.name = "room-point-light";
  g.add(pl);

  const fill = new THREE.PointLight(0xfff8f0, theme.lightIntensity * 0.35, 4);
  fill.position.set(cx + w * 0.15, 1.2, cz + d * 0.1);
  g.add(fill);

  if (room.type === "living" || room.id === "living") {
    const warm = new THREE.PointLight(0xffe8d0, 0.22, 3.5);
    warm.position.set(cx + w * 0.2, 0.8, cz);
    g.add(warm);
  }

  return g;
}

export function applyThemedWallSurface(mesh: THREE.Mesh, theme: RoomTheme) {
  if (!(mesh.userData.isHomeWall && mesh.userData.wallKind === "interior")) return;
  mesh.material = bondeeThemedWallMat(theme);
}

export function disposeBondeeTextures() {
  cache.forEach((t) => t.dispose());
  cache.clear();
}
