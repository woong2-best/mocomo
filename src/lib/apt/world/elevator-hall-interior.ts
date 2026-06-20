"use client";

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { PASTEL, pastelMat } from "@/lib/apt/bondee/dollhouse-meshes";

export function buildElevatorHallInterior(floor = 1): THREE.Group {
  const g = new THREE.Group();
  g.name = "elevator-hall-interior";

  const box = (w: number, h: number, d: number) => new RoundedBoxGeometry(w, h, d, 2, 0.03);
  const wall = pastelMat(0xf0ece8);
  const metal = pastelMat(PASTEL.elevatorDoor, { metalness: 0.25, roughness: 0.35 });

  const car = new THREE.Group();
  car.name = "elevator-car-interior";

  car.add(Object.assign(new THREE.Mesh(box(1.35, 2.15, 1.35), wall), { position: new THREE.Vector3(0, 1.1, 0) }));

  const mirror = new THREE.Mesh(
    box(1.1, 1.5, 0.03),
    new THREE.MeshStandardMaterial({ color: 0xd8e8f8, metalness: 0.85, roughness: 0.08 })
  );
  mirror.position.set(0, 1.25, -0.62);
  mirror.name = "elevator-mirror";
  car.add(mirror);

  const doorL = new THREE.Mesh(box(0.62, 1.85, 0.05), metal);
  doorL.name = "elevator-door-left";
  doorL.position.set(-0.32, 1, 0.62);
  car.add(doorL);
  const doorR = new THREE.Mesh(box(0.62, 1.85, 0.05), metal);
  doorR.name = "elevator-door-right";
  doorR.position.set(0.32, 1, 0.62);
  car.add(doorR);

  const panel = new THREE.Group();
  panel.name = "elevator-floor-panel";
  panel.position.set(0.48, 1.55, 0.62);
  panel.add(new THREE.Mesh(box(0.28, 0.22, 0.04), pastelMat(0x1a1a22)));
  const num = makeFloorDisplayMesh(floor);
  num.name = "elevator-floor-number";
  panel.add(num);
  car.add(panel);

  g.add(car);
  return g;
}

function makeFloorDisplayMesh(floor: number): THREE.Mesh {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "#0a0a0a";
  ctx.font = "bold 28px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(floor), 32, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.16), new THREE.MeshBasicMaterial({ map: tex }));
}

export function updateElevatorFloorDisplay(root: THREE.Object3D, floor: number) {
  const num = root.getObjectByName("elevator-floor-number") as THREE.Mesh | undefined;
  if (!num || !(num.material instanceof THREE.MeshBasicMaterial)) return;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "#0a0a0a";
  ctx.font = "bold 28px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(Math.round(floor)), 32, 34);
  const old = num.material.map;
  num.material.map = new THREE.CanvasTexture(canvas);
  num.material.map.colorSpace = THREE.SRGBColorSpace;
  num.material.needsUpdate = true;
  if (old) old.dispose();
}
