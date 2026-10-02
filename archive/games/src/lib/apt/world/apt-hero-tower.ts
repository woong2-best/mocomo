"use client";

import * as THREE from "three";
import { APT_ART, aptBox, aptGlowMat, aptMat, aptWoodMat } from "./apt-world-art";
import { makeArtWallTexture, makeNeonSignTexture } from "./apt-hero-textures";
import type { WindowLifeKind } from "./apt-social-presence";
import { MEGA_FLOOR_H, MEGA_TOWER_D, MEGA_TOWER_W } from "./megatower-facade";

function add(g: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, ry = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
  return m;
}

/** 메가타워 랜드마크 — 네온·스파이어·로비 아트월·살아있는 창문 */
export function buildHeroTowerLandmarks(
  totalH: number,
  floorCount: number,
  windowLifeByFloor?: Map<number, WindowLifeKind>,
  streamingFloors: number[] = []
): THREE.Group {
  const g = new THREE.Group();
  g.name = "hero-tower-landmarks";

  const podium = add(g, aptBox(MEGA_TOWER_W + 1.2, MEGA_FLOOR_H * 4.5, MEGA_TOWER_D + 0.8, 0.06), aptMat(0xffffff), 0, MEGA_FLOOR_H * 2.2, MEGA_TOWER_D / 2 + 0.35);
  podium.name = "hero-lobby-podium";

  const artWall = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.85),
    new THREE.MeshStandardMaterial({ map: makeArtWallTexture(), roughness: 0.75 })
  );
  artWall.position.set(0, MEGA_FLOOR_H * 2.8, MEGA_TOWER_D / 2 + 0.72);
  artWall.name = "hero-art-wall";
  g.add(artWall);

  const canopy = add(g, aptBox(MEGA_TOWER_W + 1.6, 0.08, 0.55, 0.025), aptWoodMat(), 0, MEGA_FLOOR_H * 4.2, MEGA_TOWER_D / 2 + 0.55);
  canopy.name = "hero-lobby-canopy";
  add(g, aptBox(MEGA_TOWER_W + 1.4, 0.04, 0.08, 0.012), aptGlowMat(APT_ART.lightWarm, 0.35), 0, MEGA_FLOOR_H * 4.15, MEGA_TOWER_D / 2 + 0.82);

  const neon = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 0.38),
    new THREE.MeshBasicMaterial({
      map: makeNeonSignTexture("APT"),
      transparent: true,
      depthWrite: false,
    })
  );
  neon.position.set(0, totalH * 0.72, MEGA_TOWER_D / 2 + 0.15);
  neon.name = "hero-neon-sign";
  g.add(neon);

  const spire = new THREE.Group();
  spire.name = "hero-spire";
  spire.position.set(0, totalH + 0.2, 0);
  add(spire, aptBox(0.22, 0.55, 0.22, 0.04), aptMat(APT_ART.accent), 0, 0.28, 0);
  const beacon = add(spire, new THREE.SphereGeometry(0.12, 12, 12), aptGlowMat(0xffaad8, 0.65), 0, 0.62, 0);
  beacon.name = "hero-spire-beacon";
  g.add(spire);

  buildSocialLivingWindows(g, floorCount, windowLifeByFloor, streamingFloors);
  return g;
}

function buildSocialLivingWindows(
  g: THREE.Group,
  floorCount: number,
  windowLifeByFloor?: Map<number, WindowLifeKind>,
  streamingFloors: number[] = []
) {
  const streamSet = new Set(streamingFloors);
  const maxF = Math.min(120, floorCount);

  for (let f = 4; f <= maxF; f += 1) {
    const kind = windowLifeByFloor?.get(f);
    if (!kind) continue;
    if (kind === "dark") continue;

    const y = (f - 0.5) * MEGA_FLOOR_H;
    const z = MEGA_TOWER_D / 2 + 0.08;
    const side = f % 2 === 0 ? -1 : 1;
    const x = side * MEGA_TOWER_W * 0.26;

    const color =
      kind === "tv" || kind === "stream"
        ? 0x88ccff
        : kind === "music"
          ? 0xcc88ff
          : kind === "guest"
            ? 0xffccaa
            : APT_ART.lightWarm;
    const opacity = kind === "guest" ? 0.55 : kind === "stream" ? 0.62 : 0.48;

    const win = new THREE.Mesh(
      new THREE.PlaneGeometry(MEGA_TOWER_W * 0.07, MEGA_FLOOR_H * 0.36),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false })
    );
    win.position.set(x, y, z);
    win.name = kind === "stream" || kind === "tv" ? "hero-window-tv" : "hero-window-warm";
    win.userData.phase = f * 0.11;
    g.add(win);

    if (kind === "guest") {
      const sil = new THREE.Mesh(
        new THREE.PlaneGeometry(MEGA_TOWER_W * 0.04, MEGA_FLOOR_H * 0.18),
        new THREE.MeshBasicMaterial({ color: 0x2a2233, transparent: true, opacity: 0.4, depthWrite: false })
      );
      sil.position.set(x * 0.9, y - MEGA_FLOOR_H * 0.04, z + 0.02);
      sil.name = "hero-window-silhouette";
      g.add(sil);
    }

    if (kind === "stream" || streamSet.has(f)) {
      const live = new THREE.Mesh(
        new THREE.PlaneGeometry(0.08, 0.04),
        new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.85 })
      );
      live.position.set(x + 0.06, y + MEGA_FLOOR_H * 0.12, z + 0.01);
      live.name = "hero-window-stream-live";
      g.add(live);
    }
  }
}
