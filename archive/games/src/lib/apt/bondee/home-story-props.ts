"use client";

import * as THREE from "three";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { aptBox, aptGlowMat, aptMat, aptWoodMat, APT_ART } from "@/lib/apt/world/apt-world-art";

function add(g: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, ry = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
  return m;
}

/** 살아있는 집 — 생활 흔적 소품 (기능 없음, 분위기 전용) */
export function buildRoomStoryClutter(room: AptRoom, w: number, d: number, cx: number, cz: number): THREE.Group {
  const g = new THREE.Group();
  g.name = `story-${room.id}`;

  if (room.type === "entrance" || room.id === "entrance") {
    for (const [x, z, ry] of [
      [-0.15, d / 2 - 0.22, 0.2],
      [0.08, d / 2 - 0.18, -0.15],
      [0.22, d / 2 - 0.25, 0.1],
    ] as const) {
      add(g, aptBox(0.12, 0.06, 0.18, 0.02), aptMat(0x444455), cx + x, 0.05, cz + z, ry);
    }
    add(g, aptBox(0.04, 0.28, 0.04, 0.008), aptMat(0x333344), cx - w / 2 + 0.2, 0.18, cz + d / 2 - 0.2);
  }

  if (room.type === "living" || room.id === "living") {
    add(g, aptBox(0.08, 0.02, 0.14, 0.006), aptMat(0x222228), cx + 0.5, 0.28, cz - 0.1);
    add(g, aptBox(0.1, 0.015, 0.08, 0.005), aptMat(0xff8866), cx - 0.2, 0.27, cz + 0.15, 0.3);
    add(g, aptBox(0.05, 0.06, 0.05, 0.01), aptMat(0xffffff), cx + 0.15, 0.28, cz + 0.05);
    add(g, aptBox(0.06, 0.08, 0.02, 0.005), aptMat(0x4488cc), cx + w / 2 - 0.35, 0.5, cz - d / 2 + 0.12);
  }

  if (room.type === "kitchen" || room.id === "kitchen") {
    add(g, aptBox(0.04, 0.04, 0.008, 0.002), aptGlowMat(0xff6688, 0.3), cx - w / 2 + 0.28, 0.82, cz - d / 2 + 0.1);
    add(g, aptBox(0.04, 0.04, 0.008, 0.002), aptGlowMat(0x66ccff, 0.3), cx - w / 2 + 0.36, 0.78, cz - d / 2 + 0.1);
    add(g, aptBox(0.14, 0.04, 0.14, 0.015), aptMat(0xffcc88), cx, 0.78, cz - d / 2 + 0.22);
  }

  if (room.type === "bedroom") {
    add(g, aptBox(0.08, 0.02, 0.12, 0.004), aptMat(0x556677), cx + 0.35, 0.28, cz - 0.35);
    add(g, aptBox(0.06, 0.09, 0.04, 0.008), aptMat(0x333344), cx - 0.38, 0.3, cz - 0.32);
    add(g, aptBox(0.1, 0.14, 0.02, 0.004), aptMat(0xffeedd), cx + 0.42, 0.32, cz - 0.38, 0.2);
  }

  if (room.type === "bathroom") {
    add(g, aptBox(0.18, 0.02, 0.12, 0.008), aptMat(0xffffff), cx - 0.1, 0.76, cz - d / 2 + 0.14);
    add(g, aptBox(0.05, 0.08, 0.05, 0.01), aptMat(0x88ccff), cx + 0.15, 0.78, cz - d / 2 + 0.12);
  }

  if (room.type === "balcony") {
    add(g, aptBox(0.08, 0.06, 0.08, 0.015), aptWoodMat(), cx, 0.08, cz + d / 2 - 0.28);
  }

  if (room.type === "hall" || room.id === "hall-corridor") {
    add(g, aptBox(0.06, 0.01, 0.04, 0.003), aptMat(0x888899), cx, 0.04, cz);
  }

  void APT_ART;
  return g;
}
