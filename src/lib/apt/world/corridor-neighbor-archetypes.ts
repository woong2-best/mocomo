"use client";

import * as THREE from "three";
import { APT_ART, aptBox, aptGlowMat, aptMat, makeCanvasLabel } from "./apt-world-art";
import type { DetailedDoorParts } from "./apt-world-props";

export type NeighborArchetypeId = "gamer" | "musician" | "cosplayer" | "streamer" | "collector";

const ARCHETYPES: NeighborArchetypeId[] = ["gamer", "musician", "cosplayer", "streamer", "collector"];

const ARCHETYPE_META: Record<
  NeighborArchetypeId,
  { label: string; sub: string; accent: number; glow: number; badge: string }
> = {
  gamer: { label: "102호", sub: "게이머", accent: 0x6b5bff, glow: 0x8877ff, badge: "RGB" },
  musician: { label: "104호", sub: "음악가", accent: 0xff8866, glow: 0xffaa88, badge: "♪" },
  cosplayer: { label: "106호", sub: "코스어", accent: 0xff88cc, glow: 0xffaad8, badge: "★" },
  streamer: { label: "108호", sub: "방송인", accent: 0x44ccff, glow: 0x66ddff, badge: "ON" },
  collector: { label: "110호", sub: "수집가", accent: 0xffcc66, glow: 0xffdd99, badge: "✦" },
};

export function archetypeForDoor(index: number, isHome: boolean): NeighborArchetypeId | null {
  if (isHome) return null;
  return ARCHETYPES[index % ARCHETYPES.length];
}

function add(
  g: THREE.Group,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  ry = 0
) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
  return m;
}

/** 이웃 집 현관 — 문틈 빛·문패·성격이 느껴지는 힌트 (기능 없음, 감성 전용) */
export function applyNeighborDoorPersonality(
  group: THREE.Group,
  parts: Pick<DetailedDoorParts, "innerGlow" | "pivot">,
  index: number,
  isHome: boolean
) {
  const arch = archetypeForDoor(index, isHome);
  group.userData.archetype = arch ?? "home";

  if (isHome) {
    parts.innerGlow.name = "door-inner-glow";
    return;
  }
  if (!arch) return;

  const meta = ARCHETYPE_META[arch];

  const gapGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.04, 1.42),
    new THREE.MeshBasicMaterial({
      color: meta.glow,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    })
  );
  gapGlow.name = "door-gap-glow";
  gapGlow.position.set(0.42, 0.02, 0.05);
  parts.pivot.add(gapGlow);

  const badge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.1),
    new THREE.MeshBasicMaterial({
      map: makeCanvasLabel(meta.badge, { bg: meta.accent, fg: "#ffffff", w: 96, h: 48 }),
      transparent: true,
    })
  );
  badge.name = "door-archetype-badge";
  badge.position.set(-0.08, 1.72, 0.07);
  group.add(badge);

  const nameplate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.12),
    new THREE.MeshBasicMaterial({
      map: makeCanvasLabel(meta.sub, { bg: APT_ART.bulletin, fg: "#556677" }),
      transparent: true,
    })
  );
  nameplate.name = "door-archetype-label";
  nameplate.position.set(0.12, 1.48, 0.07);
  group.add(nameplate);

  if (arch === "gamer") {
    add(group, aptBox(0.06, 0.06, 0.02, 0.008), aptGlowMat(0x6644ff, 0.4), 0.32, 0.55, 0.07);
  } else if (arch === "musician") {
    add(group, aptBox(0.04, 0.14, 0.02, 0.006), aptMat(meta.accent), -0.28, 1.05, 0.07, 0.2);
  } else if (arch === "cosplayer") {
    add(group, aptBox(0.1, 0.08, 0.02, 0.01), aptMat(0xffaad8), 0.2, 1.05, 0.07);
  } else if (arch === "streamer") {
    const rec = add(group, aptBox(0.05, 0.05, 0.02, 0.008), aptGlowMat(0xff3333, 0.55), -0.26, 1.38, 0.07);
    rec.name = "door-rec-dot";
  } else if (arch === "collector") {
    add(group, aptBox(0.08, 0.08, 0.02, 0.012), aptMat(0xffcc88), -0.18, 0.42, 0.07);
    add(group, aptBox(0.06, 0.06, 0.02, 0.01), aptMat(0x88ccff), -0.08, 0.38, 0.07);
  }

  parts.innerGlow.name = "door-inner-glow";
  if (parts.innerGlow.material instanceof THREE.MeshBasicMaterial) {
    parts.innerGlow.material.color.setHex(meta.glow);
    parts.innerGlow.material.opacity = 0.12;
  }
}
