"use client";

import * as THREE from "three";
import { APT_ART, aptBox, aptGlowMat, aptMat, aptWoodMat } from "./apt-world-art";
import { makeArtWallTexture, makeHeroBillboardTexture } from "./apt-hero-textures";

function add(g: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, ry = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

/** 로비 Hero — 중앙 조형물·전광판·라운지·엘리베이터 시선 유도 */
export function buildHeroLobbyLandmarks(): THREE.Group {
  const g = new THREE.Group();
  g.name = "hero-lobby-landmarks";

  const sculpture = new THREE.Group();
  sculpture.name = "hero-lobby-sculpture";
  sculpture.position.set(0, 0, -0.5);
  const colors = [APT_ART.accent, 0xb8d8ff, 0xffe8a0, APT_ART.plant];
  for (let i = 0; i < 4; i++) {
    const orb = add(
      sculpture,
      new THREE.SphereGeometry(0.22 + i * 0.06, 16, 16),
      aptMat(colors[i], { roughness: 0.35 }),
      Math.sin(i * 1.2) * 0.15,
      0.35 + i * 0.22,
      Math.cos(i * 0.9) * 0.1
    );
    orb.name = "hero-sculpture-orb";
    orb.userData.orbIndex = i;
  }
  add(sculpture, new THREE.CylinderGeometry(0.35, 0.42, 0.08, 16), aptMat(0xffffff), 0, 0.06, 0);
  g.add(sculpture);

  const billboard = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 1.55),
    new THREE.MeshStandardMaterial({ map: makeHeroBillboardTexture(), roughness: 0.6 })
  );
  billboard.position.set(0, 2.05, -4.75);
  billboard.name = "hero-lobby-billboard";
  g.add(billboard);
  add(g, aptBox(3.35, 0.08, 0.12, 0.02), aptMat(0x333344), 0, 1.25, -4.82);

  const artWall = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 1.6),
    new THREE.MeshStandardMaterial({ map: makeArtWallTexture(), roughness: 0.8 })
  );
  artWall.position.set(-5.2, 1.45, -4.82);
  artWall.name = "hero-lobby-artwall";
  g.add(artWall);

  const lounge = new THREE.Group();
  lounge.name = "hero-lobby-lounge";
  lounge.position.set(4.5, 0, -2);
  add(lounge, aptBox(2.2, 0.1, 1.4, 0.03), aptWoodMat(), 0, 0.08, 0);
  add(lounge, aptBox(0.55, 0.32, 0.55, 0.04), aptMat(APT_ART.accentSoft), -0.5, 0.24, 0.2);
  add(lounge, aptBox(0.55, 0.32, 0.55, 0.04), aptMat(0xb8d8ff), 0.5, 0.24, -0.15);
  const loungeGlow = add(lounge, aptBox(1.8, 0.02, 0.9, 0.008), aptGlowMat(APT_ART.lightWarm, 0.2), 0, 0.12, 0);
  loungeGlow.name = "hero-lounge-glow";
  g.add(lounge);

  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.45),
    new THREE.MeshBasicMaterial({
      color: APT_ART.accent,
      transparent: true,
      opacity: 0.92,
    })
  );
  banner.position.set(2.8, 2.35, -4.78);
  banner.name = "hero-event-banner";
  g.add(banner);

  const path = new THREE.Group();
  path.name = "hero-lobby-path";
  for (let i = 0; i < 6; i++) {
    const strip = add(path, aptBox(0.35, 0.015, 0.12, 0.004), aptGlowMat(APT_ART.accent, 0.35), 0, 0.025, -1.5 + i * 0.85);
    strip.name = "hero-lobby-path-strip";
    strip.userData.stripIndex = i;
  }
  g.add(path);

  const elevGlow = add(g, aptBox(1.5, 2.4, 0.04, 0.01), aptGlowMat(APT_ART.lightCool, 0.12), 0, 1.35, 3.35);
  elevGlow.name = "hero-elevator-beacon";

  return g;
}
