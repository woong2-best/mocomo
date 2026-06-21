"use client";

import * as THREE from "three";
import { getAptAtlasMaterial } from "@/lib/apt/bondee/apt-texture-atlas";
import {
  APT_ART,
  aptBox,
  aptGlowMat,
  aptMat,
  aptMetalMat,
  aptTrimMat,
  aptWallMat,
  aptWoodMat,
  makeBulletinBoardTexture,
  makeCanvasLabel,
} from "./apt-world-art";
import { buildDetailedCctv, buildDetailedElevatorHall, buildDetailedPlanter } from "./apt-world-props";
import { buildHeroLobbyLandmarks } from "./apt-hero-lobby";

function add(g: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, ry = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

/** 1층 로비·주차장 — 복도와 동일한 APT 아트 디렉션 */
export function buildLobbyParkingLevel(): THREE.Group {
  const g = new THREE.Group();
  g.name = "lobby-parking-level";

  const floorMat = getAptAtlasMaterial("floorWood");
  const wallMat = getAptAtlasMaterial("wall");
  const trimMat = getAptAtlasMaterial("trim");
  const W = 14;
  const D = 10;
  const H = 3.2;

  add(g, aptBox(W, 0.12, D), floorMat, 0, 0.06, 0);
  add(g, aptBox(W, 0.035, D, 0.012), trimMat, 0, 0.018, 0);

  for (const zSign of [-1, 1] as const) {
    add(g, aptBox(W, H, 0.12), wallMat, 0, H / 2, zSign * (D / 2 - 0.04));
    add(g, aptBox(W, 0.07, 0.06, 0.012), trimMat, 0, 0.12, zSign * (D / 2 - 0.02));
    add(g, aptBox(W, 0.06, 0.05, 0.01), trimMat, 0, H - 0.08, zSign * (D / 2 - 0.03));
  }
  add(g, aptBox(W, 0.07, D, 0.015), aptMat(APT_ART.wallCool, { roughness: 0.9 }), 0, H - 0.035, 0);

  const desk = add(g, aptBox(1.35, 0.92, 0.55, 0.04), aptMat(0xffffff), -3.5, 0.56, -1.15);
  desk.name = "lobby-desk";
  add(g, aptBox(1.1, 0.04, 0.45, 0.02), aptWoodMat(), -3.5, 0.14, -1.15);
  add(g, aptBox(0.35, 0.22, 0.04, 0.01), aptGlowMat(APT_ART.lightWarm, 0.12), -3.85, 0.72, -0.92);

  const bulletin = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.42),
    new THREE.MeshStandardMaterial({ map: makeBulletinBoardTexture(1), roughness: 0.85 })
  );
  bulletin.position.set(-1.6, 1.55, -4.88);
  bulletin.name = "lobby-bulletin";
  g.add(bulletin);

  const floorSign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.42),
    new THREE.MeshStandardMaterial({
      map: makeCanvasLabel("1F 로비", { bg: APT_ART.signBlue, fg: "#ffffff", w: 96, h: 128 }),
      roughness: 0.7,
    })
  );
  floorSign.position.set(5.8, 1.45, -4.88);
  floorSign.name = "lobby-floor-map";
  g.add(floorSign);

  const mailWall = new THREE.Group();
  mailWall.name = "mailbox-wall";
  mailWall.position.set(2.2, 0, -4.55);
  for (let i = 0; i < 10; i++) {
    const mb = add(
      mailWall,
      aptBox(0.2, 0.13, 0.1, 0.018),
      aptMat(0x3a5a8a),
      -0.95 + i * 0.21,
      0.88 + (i % 2) * 0.16,
      0
    );
    mb.name = "mailbox-slot";
    mb.userData.interact = "mailbox";
    add(mailWall, aptBox(0.04, 0.02, 0.02, 0.004), aptMetalMat(true), -0.95 + i * 0.21, 0.78 + (i % 2) * 0.16, 0.055);
  }
  g.add(mailWall);

  const cctv = buildDetailedCctv();
  cctv.position.set(-0.5, H - 0.42, -4.82);
  g.add(cctv);

  const planter = buildDetailedPlanter();
  planter.position.set(5.2, 0, -3.2);
  g.add(planter);

  const planter2 = buildDetailedPlanter();
  planter2.position.set(-5.8, 0, 2.5);
  planter2.scale.setScalar(0.9);
  g.add(planter2);

  add(g, aptBox(0.28, 0.01, 0.18, 0.004), aptMat(0x888899, { transparent: true, opacity: 0.45 }), 4.2, 0.025, -3.8);
  add(g, aptBox(0.12, 0.06, 0.08, 0.015), aptMat(0x444455), -5.5, 0.05, -3.6, 0.25);

  add(g, aptBox(6, 0.05, 5, 0.02), aptMat(0x555560), 3.5, 0.08, 1.5);
  for (let i = 0; i < 3; i++) {
    add(g, aptBox(1.6, 0.02, 3), aptMat(0x666677), 2 + i * 1.8, 0.1, 1.5);
    add(g, aptBox(1.4, 0.5, 0.9, 0.05), aptMat(0x8899aa), 2 + i * 1.8, 0.35, 1.5);
    add(g, aptBox(0.08, 0.12, 0.04, 0.008), aptGlowMat(0xffaa44, 0.25), 2 + i * 1.8, 0.62, 1.35);
  }

  const stairs = new THREE.Group();
  stairs.name = "stairwell";
  stairs.position.set(-6, 0, 2);
  for (let i = 0; i < 8; i++) {
    add(stairs, aptBox(1.4, 0.08, 0.35, 0.02), aptTrimMat(), 0, 0.08 + i * 0.12, i * 0.32);
  }
  add(stairs, aptBox(0.28, 0.38, 0.04, 0.01), aptMat(APT_ART.signBlue), 0.55, 0.55, 0.05);
  g.add(stairs);

  const elev = buildDetailedElevatorHall({ floor: 1, corridorSide: "south" });
  elev.name = "lobby-elevator-hall";
  elev.position.set(0, 0, 3.5);
  g.add(elev);

  g.add(buildHeroLobbyLandmarks());

  g.userData.walkBounds = { minX: -W / 2 + 0.3, maxX: W / 2 - 0.3, minZ: -D / 2 + 0.3, maxZ: D / 2 - 0.3 };
  g.userData.lobbyLen = W;
  g.userData.lobbyW = D;
  g.userData.lobbyH = H;
  return g;
}
