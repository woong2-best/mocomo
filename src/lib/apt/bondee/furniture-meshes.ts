"use client";

import * as THREE from "three";
import type { BondeeFurnitureKind, BondeePlacedItem } from "./types";
import {
  addTo,
  bondeeGlowMat,
  bondeeMat,
  roundedBox,
  shadowizeGroup,
  BONDEE_PALETTE,
} from "./bondee-mesh-utils";
import { buildInstrumentMesh } from "./instruments/meshes";
import { isInstrumentKind } from "./instruments/types";

const GRID = 0.55;

export function gridToWorld(gx: number, gz: number) {
  return { x: gx * GRID, z: gz * GRID };
}

const FURNITURE_PROTOTYPES = new Map<BondeeFurnitureKind, THREE.Group>();

export function buildFurnitureMesh(kind: BondeeFurnitureKind): THREE.Group {
  if (isInstrumentKind(kind)) {
    return buildInstrumentMesh(kind);
  }
  let proto = FURNITURE_PROTOTYPES.get(kind);
  if (!proto) {
    proto = buildFurnitureMeshPrototype(kind);
    shadowizeGroup(proto, false);
    FURNITURE_PROTOTYPES.set(kind, proto);
  }
  return cloneFurnitureShared(proto);
}

function cloneFurnitureShared(src: THREE.Object3D): THREE.Group {
  const root = new THREE.Group();
  root.userData.kind = src.userData.kind;
  src.children.forEach((child) => {
    root.add(cloneFurnitureNode(child));
  });
  return root;
}

function cloneFurnitureNode(src: THREE.Object3D): THREE.Object3D {
  if (src instanceof THREE.Mesh) {
    const m = new THREE.Mesh(src.geometry, src.material);
    m.name = src.name;
    m.position.copy(src.position);
    m.rotation.copy(src.rotation);
    m.scale.copy(src.scale);
    m.castShadow = false;
    m.receiveShadow = false;
    return m;
  }
  const g = new THREE.Group();
  g.name = src.name;
  g.position.copy(src.position);
  g.rotation.copy(src.rotation);
  g.scale.copy(src.scale);
  src.children.forEach((c) => g.add(cloneFurnitureNode(c)));
  return g;
}

function buildFurnitureMeshPrototype(kind: BondeeFurnitureKind): THREE.Group {
  const g = new THREE.Group();
  g.userData.kind = kind;

  switch (kind) {
    case "sofa":
      buildSofa(g);
      break;
    case "bed":
      buildBed(g);
      break;
    case "tv_stand":
      buildTvStand(g);
      break;
    case "coffee_table":
      buildCoffeeTable(g);
      break;
    case "bookshelf":
      buildBookshelf(g);
      break;
    case "floor_lamp":
      buildFloorLamp(g);
      break;
    case "plant":
      buildPlant(g);
      break;
    case "desk":
      buildDesk(g);
      break;
    case "treadmill":
      buildTreadmill(g);
      break;
    case "ac":
      buildAc(g);
      break;
    case "clock":
      buildClock(g);
      break;
    case "rug":
      buildRug(g);
      break;
    case "washer":
      buildWasher(g);
      break;
    case "hoop":
      buildHoop(g);
      break;
    case "shelf_small":
      buildShelfSmall(g);
      break;
    case "gramophone":
      buildGramophone(g);
      break;
    case "refrigerator":
      buildRefrigerator(g);
      break;
    case "computer":
      buildComputer(g);
      break;
    case "monitor":
      buildMonitor(g);
      break;
    case "smartphone":
      buildSmartphone(g);
      break;
    case "window":
      buildWindow(g);
      break;
    case "mailbox":
      buildMailbox(g);
      break;
    case "telephone":
      buildTelephone(g);
      break;
  }

  shadowizeGroup(g, false);
  return g;
}

function buildSofa(g: THREE.Group) {
  const pink = bondeeMat(0xffb8c8);
  const pinkDark = bondeeMat(0xff9eb8);
  const cushion = bondeeMat(0xffd8e4);
  const leg = bondeeMat(BONDEE_PALETTE.woodDark);

  addTo(g, roundedBox(0.88, 0.22, 0.48, 0.06), pink, 0, 0.14, 0);
  addTo(g, roundedBox(0.88, 0.38, 0.14, 0.05), pinkDark, 0, 0.34, -0.18);
  for (const x of [-0.28, 0, 0.28]) {
    addTo(g, roundedBox(0.24, 0.1, 0.32, 0.04), cushion, x, 0.28, 0.02);
  }
  for (const x of [-0.38, 0.38]) {
    addTo(g, roundedBox(0.12, 0.28, 0.42, 0.05), pinkDark, x, 0.26, 0);
  }
  addTo(g, roundedBox(0.14, 0.14, 0.14, 0.04), bondeeMat(0xffe8a0), 0.32, 0.32, 0.08);
  for (const [x, z] of [[-0.32, -0.16], [0.32, -0.16], [-0.32, 0.16], [0.32, 0.16]] as const) {
    addTo(g, roundedBox(0.06, 0.08, 0.06, 0.02), leg, x, 0.04, z);
  }
}

function buildBed(g: THREE.Group) {
  const frame = bondeeMat(BONDEE_PALETTE.wallLavender);
  const mattress = bondeeMat(0xf8f4ff);
  const blanket = bondeeMat(0xffc8dc);
  const pillow = bondeeMat(0xffffff);
  const leg = bondeeMat(BONDEE_PALETTE.wood);

  addTo(g, roundedBox(0.78, 0.14, 0.95, 0.04), frame, 0, 0.1, 0);
  addTo(g, roundedBox(0.72, 0.12, 0.88, 0.05), mattress, 0, 0.2, 0.02);
  addTo(g, roundedBox(0.68, 0.06, 0.55, 0.04), blanket, 0, 0.28, 0.12);
  addTo(g, roundedBox(0.06, 0.04, 0.55, 0.02), bondeeMat(0xffe0ec), 0, 0.31, 0.12);
  for (const x of [-0.2, 0.2]) {
    addTo(g, roundedBox(0.22, 0.08, 0.16, 0.04), pillow, x, 0.28, -0.32);
  }
  addTo(g, roundedBox(0.76, 0.1, 0.08, 0.03), frame, 0, 0.22, -0.44);
  for (const [x, z] of [[-0.32, -0.38], [0.32, -0.38], [-0.32, 0.38], [0.32, 0.38]] as const) {
    addTo(g, roundedBox(0.07, 0.1, 0.07, 0.02), leg, x, 0.05, z);
  }
}

function buildTvStand(g: THREE.Group) {
  const white = bondeeMat(0xfaf8f5);
  const wood = bondeeMat(BONDEE_PALETTE.woodDark);

  addTo(g, roundedBox(0.62, 0.32, 0.28, 0.04), white, 0, 0.18, 0);
  addTo(g, roundedBox(0.58, 0.04, 0.24, 0.02), wood, 0, 0.34, 0);
  for (const x of [-0.18, 0.18]) {
    addTo(g, roundedBox(0.22, 0.06, 0.2, 0.02), bondeeMat(0xf0ece8), x, 0.28, 0.02);
  }
  addTo(g, roundedBox(0.68, 0.4, 0.05, 0.02), bondeeMat(0x1a1a22, { roughness: 0.15 }), 0, 0.58, 0.04);
  const screen = addTo(g, roundedBox(0.58, 0.32, 0.02, 0.01), bondeeGlowMat(0x88ccff, 0.5), 0, 0.57, 0.08);
  screen.name = "console-screen";
  screen.userData.isConsoleScreen = true;
  addTo(g, roundedBox(0.24, 0.07, 0.15, 0.025), bondeeMat(0x3a3a4a), 0.14, 0.4, 0.2);
  addTo(g, roundedBox(0.05, 0.025, 0.025, 0.008), bondeeGlowMat(0x44ff88, 0.9), 0.14, 0.44, 0.2);
  addTo(g, roundedBox(0.08, 0.02, 0.04, 0.008), bondeeMat(0x222222), -0.2, 0.36, 0.18);
  g.userData.interactKind = "game_console";
}

function buildCoffeeTable(g: THREE.Group) {
  addTo(g, roundedBox(0.5, 0.05, 0.34, 0.025), bondeeMat(BONDEE_PALETTE.wood), 0, 0.24, 0);
  for (const [x, z] of [[-0.18, -0.12], [0.18, -0.12], [-0.18, 0.12], [0.18, 0.12]] as const) {
    addTo(g, roundedBox(0.05, 0.2, 0.05, 0.015), bondeeMat(BONDEE_PALETTE.woodDark), x, 0.1, z);
  }
  addTo(g, roundedBox(0.06, 0.07, 0.06, 0.02), bondeeMat(0xffffff), -0.08, 0.29, 0);
  addTo(g, roundedBox(0.1, 0.02, 0.07, 0.008), bondeeMat(0xffd8a8), 0.1, 0.275, 0.04);
}

function buildBookshelf(g: THREE.Group) {
  addTo(g, roundedBox(0.92, 1.08, 0.3, 0.04), bondeeMat(BONDEE_PALETTE.wood), 0, 0.56, 0);
  for (let row = 0; row < 4; row++) {
    addTo(g, roundedBox(0.86, 0.03, 0.26, 0.01), bondeeMat(BONDEE_PALETTE.woodDark), 0, 0.18 + row * 0.24, 0);
    for (let col = 0; col < 4; col++) {
      const colors = [0xff8899, 0x88bbee, 0xaabb66, 0xffcc88, 0xcc99ff, 0x66ccaa];
      addTo(
        g,
        roundedBox(0.07, 0.18, 0.11, 0.012),
        bondeeMat(colors[(row + col) % colors.length]),
        -0.28 + col * 0.19,
        0.28 + row * 0.24,
        0.02
      );
    }
  }
  addTo(g, roundedBox(0.12, 0.14, 0.08, 0.02), bondeeMat(0xffe8a0), 0.28, 0.92, 0.04);
}

function buildFloorLamp(g: THREE.Group) {
  addTo(g, roundedBox(0.14, 0.04, 0.14, 0.02), bondeeMat(BONDEE_PALETTE.woodDark), 0, 0.02, 0);
  addTo(g, roundedBox(0.04, 0.82, 0.04, 0.015), bondeeMat(0x666677), 0, 0.44, 0);
  addTo(g, roundedBox(0.22, 0.16, 0.22, 0.06), bondeeMat(0xfff0d8), 0, 0.88, 0);
  addTo(g, roundedBox(0.16, 0.1, 0.16, 0.04), bondeeGlowMat(0xffe8c0, 0.25), 0, 0.84, 0);
}

function buildPlant(g: THREE.Group) {
  addTo(g, roundedBox(0.18, 0.16, 0.18, 0.04), bondeeMat(0xffc8b0), 0, 0.08, 0);
  addTo(g, roundedBox(0.14, 0.04, 0.14, 0.02), bondeeMat(0x8b6914), 0, 0.18, 0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 10, 10),
      bondeeMat(i % 2 === 0 ? 0x98d8a8 : 0x7ec898)
    );
    leaf.position.set(Math.cos(a) * 0.1, 0.28 + (i % 2) * 0.06, Math.sin(a) * 0.1);
    leaf.scale.set(1, 1.3, 1);
    leaf.castShadow = false;
    g.add(leaf);
  }
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), bondeeMat(0x88cc99));
  top.position.y = 0.42;
  top.scale.set(1, 1.2, 1);
  top.castShadow = false;
  g.add(top);
}

function buildDesk(g: THREE.Group) {
  const wood = bondeeMat(BONDEE_PALETTE.wood);
  const woodDark = bondeeMat(BONDEE_PALETTE.woodDark);
  const leg = bondeeMat(BONDEE_PALETTE.woodDark);

  addTo(g, roundedBox(0.72, 0.05, 0.42, 0.025), wood, 0, 0.42, 0);
  addTo(g, roundedBox(0.66, 0.02, 0.36, 0.012), woodDark, 0, 0.455, 0);
  for (const [x, z] of [[-0.28, -0.14], [0.28, -0.14], [-0.28, 0.14], [0.28, 0.14]] as const) {
    addTo(g, roundedBox(0.05, 0.38, 0.05, 0.015), leg, x, 0.19, z);
  }
  addTo(g, roundedBox(0.14, 0.12, 0.02, 0.01), bondeeMat(0xffffff), -0.22, 0.52, 0.18);
  addTo(g, roundedBox(0.08, 0.06, 0.06, 0.015), bondeeMat(0xffcc88), 0.22, 0.48, -0.1);
  addTo(g, roundedBox(0.06, 0.04, 0.04, 0.01), bondeeMat(0x88bbee), 0.08, 0.485, 0.12);
}

function buildTreadmill(g: THREE.Group) {
  addTo(g, roundedBox(0.52, 0.14, 0.92, 0.04), bondeeMat(0x444455), 0, 0.1, 0);
  addTo(g, roundedBox(0.48, 0.02, 0.8, 0.01), bondeeMat(0x666677), 0, 0.18, 0);
  addTo(g, roundedBox(0.46, 0.48, 0.08, 0.03), bondeeMat(0x999999), 0, 0.42, -0.36);
  addTo(g, roundedBox(0.12, 0.04, 0.04, 0.01), bondeeGlowMat(0x44aaff, 0.3), 0, 0.52, -0.34);
}

function buildAc(g: THREE.Group) {
  const bodyW = 0.28;
  const bodyH = 0.68;
  const bodyD = 0.22;
  const bodyY = bodyH / 2;

  addTo(g, roundedBox(bodyW, bodyH, bodyD, 0.03), bondeeMat(0xffffff), 0, bodyY, 0);
  addTo(g, roundedBox(0.012, bodyH * 0.88, bodyD + 0.008, 0.004), bondeeMat(0xe4e4e4), -bodyW / 2 + 0.006, bodyY, 0);
  addTo(g, roundedBox(0.012, bodyH * 0.88, bodyD + 0.008, 0.004), bondeeMat(0xe4e4e4), bodyW / 2 - 0.006, bodyY, 0);

  const ventY = bodyH - 0.07;
  addTo(g, roundedBox(bodyW * 0.9, 0.1, 0.035, 0.012), bondeeMat(0x1a1a1a), 0, ventY, bodyD / 2 - 0.008);
  for (let i = 0; i < 5; i++) {
    addTo(
      g,
      roundedBox(bodyW * 0.78, 0.005, 0.008, 0.002),
      bondeeMat(0x2a2a2a),
      0,
      ventY + 0.028 - i * 0.018,
      bodyD / 2 + 0.004
    );
  }

  const panelY = ventY - 0.1;
  addTo(g, roundedBox(bodyW * 0.86, 0.048, 0.012, 0.008), bondeeMat(0xf8f8f8), 0, panelY, bodyD / 2 + 0.001);
  const led = addTo(
    g,
    roundedBox(0.014, 0.014, 0.006, 0.003),
    bondeeMat(0x88eeff, { emissive: 0x44ccff, emissiveIntensity: 0.92 }),
    bodyW * 0.22,
    panelY + 0.004,
    bodyD / 2 + 0.01
  );
  led.name = "ac-led";

  for (let i = 0; i < 8; i++) {
    addTo(
      g,
      roundedBox(bodyW * 0.84, 0.007, 0.01, 0.003),
      bondeeMat(0xf4f4f4),
      0,
      0.1 + i * 0.055,
      bodyD / 2 + 0.002
    );
  }

  const wind = new THREE.Mesh(
    new THREE.PlaneGeometry(bodyW * 0.72, 0.11),
    new THREE.MeshBasicMaterial({
      color: 0xd8eeff,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  wind.name = "ac-wind";
  wind.position.set(0, ventY - 0.05, bodyD / 2 + 0.055);
  wind.rotation.x = -0.32;
  g.add(wind);

  const stripsGroup = new THREE.Group();
  stripsGroup.name = "ac-strips";
  const stripCount = 6;
  const stripTopY = ventY - 0.048;
  for (let i = 0; i < stripCount; i++) {
    const pivot = new THREE.Group();
    const x = -bodyW * 0.34 + (i / (stripCount - 1)) * bodyW * 0.68;
    pivot.position.set(x, stripTopY, bodyD / 2 + 0.006);
    const stripLen = 0.042 + (i % 3) * 0.009;
    addTo(
      pivot,
      roundedBox(0.007, stripLen, 0.001, 0.001),
      bondeeMat(0xffffff, { roughness: 0.92 }),
      0,
      -stripLen / 2,
      0
    );
    stripsGroup.add(pivot);
  }
  g.add(stripsGroup);
}

function buildClock(g: THREE.Group) {
  addTo(g, roundedBox(0.04, 0.22, 0.04, 0.01), bondeeMat(BONDEE_PALETTE.wood), 0, 0.48, 0);
  const face = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.04, 20),
    bondeeMat(0xffffff)
  );
  face.rotation.x = Math.PI / 2;
  face.position.y = 0.58;
  face.castShadow = false;
  g.add(face);
  addTo(g, roundedBox(0.01, 0.06, 0.008, 0.003), bondeeMat(0x333333), 0, 0.6, 0.02);
  addTo(g, roundedBox(0.06, 0.008, 0.008, 0.003), bondeeMat(0x333333), 0.02, 0.6, 0.02);
}

function buildRug(g: THREE.Group) {
  addTo(g, roundedBox(0.82, 0.025, 0.62, 0.02), bondeeMat(0xc8a882), 0, 0.012, 0);
  addTo(g, roundedBox(0.68, 0.012, 0.48, 0.015), bondeeMat(0xd8b892, { transparent: true, opacity: 0.7 }), 0, 0.022, 0);
  addTo(g, roundedBox(0.4, 0.008, 0.3, 0.01), bondeeMat(0xffe8d0, { transparent: true, opacity: 0.5 }), 0, 0.028, 0);
}

function buildWasher(g: THREE.Group) {
  addTo(g, roundedBox(0.38, 0.48, 0.38, 0.04), bondeeMat(0xffffff), 0, 0.26, 0);
  const door = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.03, 20),
    bondeeMat(0xd8e8f8, { metalness: 0.15, roughness: 0.3 })
  );
  door.rotation.x = Math.PI / 2;
  door.position.set(0, 0.28, 0.2);
  door.castShadow = false;
  g.add(door);
  addTo(g, roundedBox(0.28, 0.04, 0.02, 0.01), bondeeMat(0xe8e8e8), 0, 0.46, 0.18);
}

function buildHoop(g: THREE.Group) {
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.018, 8, 20),
    bondeeMat(0xff6633)
  );
  rim.position.y = 0.72;
  rim.rotation.x = Math.PI / 2;
  rim.castShadow = false;
  g.add(rim);
  addTo(g, roundedBox(0.05, 0.52, 0.32, 0.02), bondeeMat(0x555566), 0, 0.46, -0.1);
  addTo(g, roundedBox(0.24, 0.04, 0.24, 0.02), bondeeMat(BONDEE_PALETTE.woodDark), 0, 0.02, 0);
}

function buildShelfSmall(g: THREE.Group) {
  addTo(g, roundedBox(0.38, 0.52, 0.22, 0.03), bondeeMat(BONDEE_PALETTE.wood), 0, 0.28, 0);
  for (let i = 0; i < 3; i++) {
    addTo(g, roundedBox(0.34, 0.025, 0.18, 0.01), bondeeMat(BONDEE_PALETTE.woodDark), 0, 0.12 + i * 0.18, 0);
    addTo(g, roundedBox(0.06, 0.1, 0.06, 0.01), bondeeMat(0xffaa88), -0.08 + i * 0.08, 0.2 + i * 0.18, 0.04);
  }
}

function buildGramophone(g: THREE.Group) {
  const wood = bondeeMat(BONDEE_PALETTE.woodDark);
  const woodLight = bondeeMat(BONDEE_PALETTE.wood);
  const brass = bondeeMat(0xd4a84b, { metalness: 0.5, roughness: 0.38 });
  const brassBright = bondeeMat(0xe8c868, { metalness: 0.58, roughness: 0.32 });
  const black = bondeeMat(0x1a1a1a);
  const grille = bondeeMat(0x222228);

  addTo(g, roundedBox(0.72, 0.28, 0.42, 0.05), woodLight, 0, 0.16, 0);
  addTo(g, roundedBox(0.68, 0.22, 0.04, 0.02), grille, 0, 0.16, 0.21);
  addTo(g, roundedBox(0.14, 0.035, 0.008, 0.004), bondeeMat(0xeeeeee), 0, 0.16, 0.235);

  for (const [x, z] of [
    [-0.28, -0.16],
    [0.28, -0.16],
    [-0.28, 0.16],
    [0.28, 0.16],
  ] as const) {
    addTo(g, roundedBox(0.06, 0.04, 0.06, 0.015), black, x, 0.02, z);
  }

  addTo(g, roundedBox(0.05, 0.04, 0.05, 0.015), bondeeMat(0xcccccc, { metalness: 0.7 }), -0.22, 0.32, -0.1);

  const vinyl = new THREE.Group();
  vinyl.name = "gramophone-vinyl";
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.015, 24), black);
  disc.rotation.x = Math.PI / 2;
  disc.castShadow = false;
  vinyl.add(disc);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.018, 16), bondeeMat(0xa8e060));
  label.rotation.x = Math.PI / 2;
  label.castShadow = false;
  vinyl.add(label);
  vinyl.position.set(0, 0.32, 0.02);
  g.add(vinyl);

  const arm = new THREE.Group();
  addTo(arm, roundedBox(0.04, 0.04, 0.18, 0.01), brass, 0, 0, -0.09);
  addTo(arm, roundedBox(0.22, 0.025, 0.025, 0.008), brassBright, 0.11, 0.02, 0.02, 0, -0.35, 0.12);
  arm.position.set(-0.2, 0.34, 0.05);
  g.add(arm);

  addTo(g, roundedBox(0.08, 0.08, 0.2, 0.03), brass, -0.24, 0.38, -0.12, -0.4, 0.5, 0);

  const horn = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const s = 0.12 + i * 0.08;
    addTo(horn, roundedBox(s, s * 0.7, 0.06, 0.03), brassBright, 0, i * 0.05, 0);
  }
  horn.position.set(-0.32, 0.42, -0.22);
  horn.rotation.set(-0.5, 0.4, 0);
  g.add(horn);

  const mouth = new THREE.Object3D();
  mouth.name = "gramophone-horn-mouth";
  mouth.position.set(-0.38, 0.72, -0.28);
  g.add(mouth);

  g.userData.interactKind = "gramophone";
}

function buildRefrigerator(g: THREE.Group) {
  const body = bondeeMat(0xf5f8ff);
  const bodyDark = bondeeMat(0xe8edf5);
  const handle = bondeeMat(0xccccdd, { metalness: 0.35, roughness: 0.35 });
  const seal = bondeeMat(0xd8dde8);

  addTo(g, roundedBox(0.42, 0.92, 0.38, 0.04), body, 0, 0.48, 0);
  addTo(g, roundedBox(0.38, 0.44, 0.02, 0.015), bodyDark, 0, 0.68, 0.2);
  addTo(g, roundedBox(0.38, 0.38, 0.02, 0.015), seal, 0, 0.24, 0.2);
  addTo(g, roundedBox(0.02, 0.18, 0.025, 0.008), handle, 0.16, 0.68, 0.22);
  addTo(g, roundedBox(0.02, 0.12, 0.025, 0.008), handle, 0.16, 0.24, 0.22);
  addTo(g, roundedBox(0.1, 0.04, 0.02, 0.008), bondeeMat(0x444455), 0, 0.88, 0.18);
  addTo(g, roundedBox(0.04, 0.025, 0.025, 0.008), bondeeGlowMat(0x66ccff, 0.4), -0.12, 0.88, 0.18);
}

function buildComputer(g: THREE.Group) {
  const tower = bondeeMat(0x2a2a32);
  const towerAccent = bondeeMat(0x444455);
  const rgb = bondeeGlowMat(0x88ccff, 0.55);

  addTo(g, roundedBox(0.16, 0.34, 0.28, 0.025), tower, 0, 0.19, 0);
  addTo(g, roundedBox(0.12, 0.02, 0.22, 0.008), towerAccent, 0, 0.36, 0.02);
  addTo(g, roundedBox(0.08, 0.06, 0.02, 0.006), rgb, 0.04, 0.22, 0.15);
  addTo(g, roundedBox(0.02, 0.02, 0.02, 0.004), bondeeGlowMat(0x44ff88, 0.8), -0.04, 0.32, 0.14);
  addTo(g, roundedBox(0.04, 0.015, 0.015, 0.004), bondeeMat(0x666677), 0, 0.02, 0.12);
}

function buildMonitor(g: THREE.Group) {
  const frame = bondeeMat(0x222228);
  const bezel = bondeeMat(0x333344);
  const stand = bondeeMat(0x444455);

  addTo(g, roundedBox(0.34, 0.22, 0.03, 0.012), frame, 0, 0.38, 0);
  addTo(g, roundedBox(0.28, 0.16, 0.015, 0.008), bondeeGlowMat(0x99ccff, 0.35), 0, 0.38, 0.018);
  addTo(g, roundedBox(0.02, 0.08, 0.02, 0.006), bezel, 0, 0.38, 0.03);
  addTo(g, roundedBox(0.08, 0.02, 0.06, 0.008), stand, 0, 0.24, 0.02);
  addTo(g, roundedBox(0.14, 0.015, 0.08, 0.006), stand, 0, 0.16, 0.02);
}

function buildSmartphone(g: THREE.Group) {
  const body = bondeeMat(0x1a1a22);
  const screen = bondeeGlowMat(0xaaccff, 0.45);
  const button = bondeeMat(0x666677);

  addTo(g, roundedBox(0.06, 0.11, 0.012, 0.006), body, 0, 0.08, 0);
  addTo(g, roundedBox(0.048, 0.092, 0.006, 0.004), screen, 0, 0.082, 0.004);
  addTo(g, roundedBox(0.012, 0.012, 0.004, 0.002), button, 0, 0.03, 0.004);
  addTo(g, roundedBox(0.008, 0.008, 0.004, 0.002), bondeeMat(0x333344), 0, 0.125, 0.004);
}

function buildWindow(g: THREE.Group) {
  const frame = bondeeMat(BONDEE_PALETTE.trim);
  const frameLight = bondeeMat(BONDEE_PALETTE.wallWhite);
  const glass = bondeeMat(0xb8e8ff, { transparent: true, opacity: 0.5, roughness: 0.08, metalness: 0.12 });
  const sill = bondeeMat(BONDEE_PALETTE.wallWhite);

  addTo(g, roundedBox(0.52, 0.62, 0.06, 0.025), frame, 0, 0.38, 0);
  addTo(g, roundedBox(0.44, 0.54, 0.02, 0.012), frameLight, 0, 0.38, 0.025);
  addTo(g, roundedBox(0.2, 0.24, 0.012, 0.008), glass, -0.1, 0.48, 0.032);
  addTo(g, roundedBox(0.2, 0.24, 0.012, 0.008), glass, 0.1, 0.48, 0.032);
  addTo(g, roundedBox(0.2, 0.2, 0.012, 0.008), glass, -0.1, 0.22, 0.032);
  addTo(g, roundedBox(0.2, 0.2, 0.012, 0.008), glass, 0.1, 0.22, 0.032);
  addTo(g, roundedBox(0.02, 0.54, 0.015, 0.006), frame, 0, 0.38, 0.035);
  addTo(g, roundedBox(0.44, 0.02, 0.04, 0.008), frame, 0, 0.08, 0.04);
  addTo(g, roundedBox(0.5, 0.04, 0.08, 0.015), sill, 0, 0.04, 0.04);
  addTo(g, roundedBox(0.08, 0.06, 0.04, 0.01), bondeeMat(0xffd8b0), 0.14, 0.1, 0.06);
  g.userData.wallMount = true;
}

function buildMailbox(g: THREE.Group) {
  const body = bondeeMat(0x3a5a8a);
  const trim = bondeeMat(0x2a4a72);
  const flag = bondeeMat(0xff6b6b);
  addTo(g, roundedBox(0.22, 0.28, 0.18, 0.03), body, 0, 0.18, 0);
  addTo(g, roundedBox(0.24, 0.06, 0.2, 0.02), trim, 0, 0.34, 0);
  addTo(g, roundedBox(0.04, 0.08, 0.02, 0.01), flag, 0.1, 0.38, 0.02);
  addTo(g, roundedBox(0.04, 0.04, 0.04, 0.01), trim, 0, 0.02, 0);
}

function buildTelephone(g: THREE.Group) {
  const base = bondeeMat(0x2a2a32);
  const handset = bondeeMat(0x1a1a22);
  const accent = bondeeMat(0x3a5a8a);
  const dial = bondeeGlowMat(0xffeedd, 0.35);

  addTo(g, roundedBox(0.18, 0.04, 0.14, 0.008), base, 0, 0.04, 0);
  addTo(g, roundedBox(0.1, 0.04, 0.08, 0.006), base, 0, 0.08, 0);
  addTo(g, roundedBox(0.08, 0.08, 0.04, 0.008), dial, 0, 0.12, 0.02);
  addTo(g, roundedBox(0.02, 0.02, 0.02, 0.004), accent, -0.02, 0.12, 0.04);
  addTo(g, roundedBox(0.02, 0.02, 0.02, 0.004), accent, 0.02, 0.12, 0.04);
  addTo(g, roundedBox(0.06, 0.03, 0.03, 0.006), handset, 0, 0.2, 0.04);
  addTo(g, roundedBox(0.04, 0.08, 0.03, 0.006), handset, 0, 0.28, 0.04);
  addTo(g, roundedBox(0.015, 0.12, 0.015, 0.004), bondeeMat(0x444455), 0, 0.22, 0.02);
}

export function syncRoomFurniture(root: THREE.Group, items: BondeePlacedItem[]) {
  const ids = new Set(items.map((i) => i.id));
  for (let i = root.children.length - 1; i >= 0; i--) {
    const c = root.children[i];
    if (!ids.has(c.userData.placedId as string)) {
      root.remove(c);
      c.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => m.dispose());
        }
      });
    }
  }

  for (const item of items) {
    let node = root.children.find((c) => c.userData.placedId === item.id) as THREE.Group | undefined;
    if (!node) {
      node = buildFurnitureMesh(item.kind);
      node.userData.placedId = item.id;
      root.add(node);
    }
    const { x, z } = gridToWorld(item.gx, item.gz);
    node.position.set(x, 0, z);
    node.rotation.y = (item.rot * Math.PI) / 2;
  }
}
