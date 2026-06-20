"use client";

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { PASTEL, pastelMat } from "@/lib/apt/bondee/dollhouse-meshes";

function box(w: number, h: number, d: number, r = 0.04) {
  return new RoundedBoxGeometry(w, h, d, 2, r);
}

function add(g: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

/** 1층 로비·주차장·우편함·계단 — 보행 가능 */
export function buildLobbyParkingLevel(): THREE.Group {
  const g = new THREE.Group();
  g.name = "lobby-parking-level";

  const floorMat = pastelMat(PASTEL.floorWood);
  const wallMat = pastelMat(0xf8f4f6);
  const W = 14;
  const D = 10;

  add(g, box(W, 0.12, D), floorMat, 0, 0.06, 0);
  add(g, box(5, 3.2, 4), wallMat, -3.5, 1.6, -2);
  add(g, box(4.5, 0.08, 3.5, 0.03), pastelMat(PASTEL.shellTrim), -3.5, 0.12, -2);
  const desk = add(g, box(1.2, 0.9, 0.5, 0.04), pastelMat(0xffffff), -3.5, 0.55, -1.2);
  desk.name = "lobby-desk";
  add(g, box(1.8, 1.2, 0.06, 0.02), pastelMat(0xffffff), -1.5, 1.5, -4.85);

  const mailWall = new THREE.Group();
  mailWall.name = "mailbox-wall";
  mailWall.position.set(2, 0, -4.5);
  for (let i = 0; i < 8; i++) {
    const mb = add(mailWall, box(0.22, 0.14, 0.12, 0.02), pastelMat(0x3a5a8a), -0.8 + i * 0.24, 0.9 + (i % 2) * 0.18, 0);
    mb.name = "mailbox-slot";
    mb.userData.interact = "mailbox";
  }
  g.add(mailWall);

  add(g, box(6, 0.05, 5, 0.02), pastelMat(0x555560), 3.5, 0.08, 1.5);
  for (let i = 0; i < 3; i++) {
    add(g, box(1.6, 0.02, 3), pastelMat(0x666677), 2 + i * 1.8, 0.1, 1.5);
    add(g, box(1.4, 0.5, 0.9, 0.05), pastelMat(0x8899aa), 2 + i * 1.8, 0.35, 1.5);
  }

  const stairs = new THREE.Group();
  stairs.name = "stairwell";
  stairs.position.set(-6, 0, 2);
  for (let i = 0; i < 8; i++) {
    add(stairs, box(1.4, 0.08, 0.35, 0.02), pastelMat(PASTEL.shellTrim), 0, 0.08 + i * 0.12, i * 0.32);
  }
  g.add(stairs);

  const elev = new THREE.Group();
  elev.name = "lobby-elevator-hall";
  elev.position.set(0, 0, 3.5);
  add(elev, box(1.6, 2.8, 1.4), wallMat, 0, 1.4, 0);
  const doorL = add(elev, box(0.65, 2, 0.06, 0.02), pastelMat(PASTEL.elevatorDoor), -0.35, 1.05, 0.65);
  doorL.name = "elevator-door-left";
  const doorR = add(elev, box(0.65, 2, 0.06, 0.02), pastelMat(PASTEL.elevatorDoor), 0.35, 1.05, 0.65);
  doorR.name = "elevator-door-right";
  g.add(elev);

  g.userData.walkBounds = { minX: -W / 2 + 0.3, maxX: W / 2 - 0.3, minZ: -D / 2 + 0.3, maxZ: D / 2 - 0.3 };
  return g;
}
