"use client";

import * as THREE from "three";
import { APT_ART, aptBox, aptGlowMat, aptFloorMat, aptMat, aptWoodMat } from "./apt-world-art";
import { makeNeonSignTexture } from "./apt-hero-textures";

function add(g: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, ry = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

/** 단지 Hero — 중앙 광장·분수·네온 아치·로비로 이어지는 빛의 길 */
export function buildHeroDistrictPlaza(): THREE.Group {
  const g = new THREE.Group();
  g.name = "hero-district-plaza";

  const plaza = add(g, new THREE.CircleGeometry(7.5, 32), aptFloorMat("tile"), 0, 0.04, 6);
  plaza.rotation.x = -Math.PI / 2;
  const ring = add(g, new THREE.RingGeometry(6.8, 7.5, 32), aptMat(APT_ART.accentSoft, { transparent: true, opacity: 0.6 }), 0, 0.045, 6);
  ring.rotation.x = -Math.PI / 2;

  const fountain = new THREE.Group();
  fountain.name = "hero-fountain";
  fountain.position.set(0, 0, 6);
  const basin = add(fountain, new THREE.CylinderGeometry(1.1, 1.25, 0.18, 24), aptMat(APT_ART.trimWood), 0, 0.12, 0);
  basin.name = "hero-fountain-basin";
  const water = add(fountain, new THREE.CircleGeometry(0.95, 24), aptGlowMat(0xaaccff, 0.25), 0, 0.2, 0);
  water.rotation.x = -Math.PI / 2;
  water.name = "hero-fountain-water";
  for (let i = 0; i < 3; i++) {
    const tier = add(fountain, new THREE.CylinderGeometry(0.12 + i * 0.08, 0.16 + i * 0.08, 0.08, 12), aptMat(0xffffff), 0, 0.28 + i * 0.12, 0);
    tier.name = "hero-fountain-tier";
  }
  const jet = add(fountain, new THREE.CylinderGeometry(0.04, 0.06, 0.35, 8), aptGlowMat(0xd8eeff, 0.4), 0, 0.55, 0);
  jet.name = "hero-fountain-jet";
  g.add(fountain);

  const arch = new THREE.Group();
  arch.name = "hero-plaza-arch";
  arch.position.set(0, 0, 2.5);
  add(arch, aptBox(0.18, 3.2, 0.18, 0.04), aptWoodMat(), -2.2, 1.6, 0);
  add(arch, aptBox(0.18, 3.2, 0.18, 0.04), aptWoodMat(), 2.2, 1.6, 0);
  add(arch, aptBox(4.6, 0.14, 0.2, 0.04), aptWoodMat(), 0, 3.15, 0);
  const archNeon = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 0.55),
    new THREE.MeshBasicMaterial({ map: makeNeonSignTexture("APT TOWN"), transparent: true })
  );
  archNeon.position.set(0, 2.75, 0.12);
  archNeon.name = "hero-arch-neon";
  arch.add(archNeon);
  g.add(arch);

  const path = new THREE.Group();
  path.name = "hero-path-lights";
  const lobbyDir = new THREE.Vector3(-12, 0, 9).normalize();
  for (let i = 0; i < 9; i++) {
    const t = 0.15 + i * 0.09;
    const px = lobbyDir.x * t * 28;
    const pz = 6 + lobbyDir.z * t * 28;
    const lamp = add(path, aptBox(0.08, 0.55, 0.08, 0.02), aptMat(0xffffff), px, 0.28, pz);
    lamp.name = "hero-path-lamp";
    lamp.userData.pathIndex = i;
    add(path, aptBox(0.14, 0.04, 0.14, 0.015), aptGlowMat(APT_ART.lightWarm, 0.3), px, 0.58, pz).name =
      "hero-path-lamp-glow";
  }
  g.add(path);

  for (const [x, z] of [
    [-4, 10],
    [4, 10],
    [-5.5, 3],
    [5.5, 3],
  ] as const) {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    add(tree, new THREE.CylinderGeometry(0.08, 0.1, 0.5, 8), aptWoodMat(true), 0, 0.28, 0);
    add(tree, new THREE.SphereGeometry(0.35, 10, 10), aptMat(APT_ART.plant), 0, 0.72, 0).name = "plant-leaves";
    g.add(tree);
  }

  const lounge = new THREE.Group();
  lounge.name = "hero-plaza-lounge";
  lounge.position.set(-5, 0, 8);
  add(lounge, aptBox(1.8, 0.12, 1.2, 0.03), aptWoodMat(), 0, 0.08, 0);
  add(lounge, aptBox(1.6, 0.08, 0.08, 0.02), aptMat(0xffffff), 0, 0.18, 0.5);
  add(lounge, aptBox(0.5, 0.35, 0.5, 0.04), aptMat(APT_ART.accentSoft), 0.4, 0.28, -0.2);
  g.add(lounge);

  return g;
}

/** 단지 Hero 조명 — 타워·광장·로비 방향 spot */
export function buildHeroDistrictLights(): THREE.Group {
  const g = new THREE.Group();
  g.name = "hero-district-lights";

  const towerSpot = new THREE.SpotLight(APT_ART.lightWarm, 1.2, 80, Math.PI / 5, 0.4, 1.5);
  towerSpot.position.set(6, 18, 16);
  towerSpot.target.position.set(0, 35, 0);
  g.add(towerSpot);
  g.add(towerSpot.target);

  const plazaWash = new THREE.PointLight(APT_ART.accentSoft, 0.55, 18, 1.6);
  plazaWash.position.set(0, 3, 6);
  plazaWash.name = "hero-plaza-wash";
  g.add(plazaWash);

  const pathLight = new THREE.PointLight(APT_ART.lightWarm, 0.35, 12, 1.8);
  pathLight.position.set(-6, 2, 9);
  pathLight.name = "hero-path-wash";
  g.add(pathLight);

  return g;
}
