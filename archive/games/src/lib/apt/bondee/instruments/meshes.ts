"use client";

import * as THREE from "three";
import type { InstrumentKind } from "./types";
import {
  addTo,
  bondeeMat,
  roundedBox,
  shadowizeGroup,
  BONDEE_PALETTE,
} from "../bondee-mesh-utils";

const PROTOTYPES = new Map<InstrumentKind, THREE.Group>();

function emitter(parent: THREE.Object3D, y = 0.5) {
  const e = new THREE.Object3D();
  e.name = "instrument-sound-emitter";
  e.position.y = y;
  parent.add(e);
}

function buildGuitar(g: THREE.Group, electric: boolean, bass: boolean) {
  const bodyColor = electric ? 0x2a2a32 : BONDEE_PALETTE.wood;
  const body = bondeeMat(bodyColor, electric ? { metalness: 0.2 } : {});
  const neck = bondeeMat(BONDEE_PALETTE.woodDark);
  const fret = bondeeMat(0xcccccc, { metalness: 0.5 });
  const w = bass ? 0.38 : 0.32;
  const h = bass ? 0.1 : 0.08;
  addTo(g, roundedBox(w, h, 0.22, 0.04), body, 0, 0.18, 0);
  addTo(g, roundedBox(0.06, 0.04, 0.28, 0.015), neck, 0, 0.28, -0.18, -0.35, 0, 0);
  addTo(g, roundedBox(0.04, 0.025, 0.04, 0.008), fret, 0, 0.38, -0.32);
  if (electric) {
    addTo(g, roundedBox(0.12, 0.06, 0.04, 0.015), bondeeMat(0x888899, { metalness: 0.6 }), 0, 0.16, 0.02);
    for (const x of [-0.08, 0.08]) {
      addTo(g, roundedBox(0.04, 0.04, 0.02, 0.008), bondeeMat(0x555566), x, 0.14, 0.1);
    }
  } else {
    addTo(g, roundedBox(0.08, 0.02, 0.02, 0.005), bondeeMat(BONDEE_PALETTE.wood), 0, 0.14, 0.12);
  }
  for (let i = 0; i < 4; i++) {
    addTo(g, roundedBox(0.003, 0.003, 0.42, 0.001), bondeeMat(0xdddddd), -0.015 + i * 0.01, 0.3, -0.1);
  }
  emitter(g, 0.35);
}

function buildBowed(g: THREE.Group, cello: boolean) {
  const wood = bondeeMat(BONDEE_PALETTE.wood);
  const dark = bondeeMat(BONDEE_PALETTE.woodDark);
  const scale = cello ? 1.35 : 1;
  addTo(g, roundedBox(0.14 * scale, 0.22 * scale, 0.06 * scale, 0.025), wood, 0, 0.28 * scale, 0);
  addTo(g, roundedBox(0.02, 0.32 * scale, 0.02, 0.008), dark, 0, 0.48 * scale, 0, 0.1, 0, 0);
  addTo(g, roundedBox(0.18 * scale, 0.04, 0.08 * scale, 0.02), wood, 0, 0.12 * scale, 0);
  addTo(g, roundedBox(0.003, 0.38 * scale, 0.003, 0.001), bondeeMat(0xeeeeee), 0.04, 0.42 * scale, 0);
  addTo(g, roundedBox(0.04, 0.02, 0.02, 0.005), dark, 0, 0.58 * scale, 0);
  emitter(g, 0.5 * scale);
}

function buildHarp(g: THREE.Group) {
  const wood = bondeeMat(BONDEE_PALETTE.wood);
  const gold = bondeeMat(0xd4a84b, { metalness: 0.45 });
  addTo(g, roundedBox(0.08, 0.52, 0.06, 0.03), wood, 0, 0.3, 0, 0, 0, -0.15);
  addTo(g, roundedBox(0.06, 0.04, 0.28, 0.02), wood, 0, 0.04, 0.08);
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    addTo(g, roundedBox(0.002, 0.42, 0.002, 0.001), gold, -0.12 + t * 0.24, 0.28, 0.02);
  }
  emitter(g, 0.55);
}

function buildPiano(g: THREE.Group, variant: "piano" | "upright" | "grand") {
  const black = bondeeMat(0x1a1a1a);
  const white = bondeeMat(0xfaf8f5);
  const wood = bondeeMat(BONDEE_PALETTE.woodDark);
  if (variant === "grand") {
    addTo(g, roundedBox(0.72, 0.12, 0.48, 0.04), black, 0, 0.1, 0);
    addTo(g, roundedBox(0.68, 0.06, 0.42, 0.03), white, 0, 0.18, 0);
    addTo(g, roundedBox(0.52, 0.08, 0.32, 0.03), black, 0.1, 0.14, -0.08, 0, -0.2, 0);
    addTo(g, roundedBox(0.08, 0.22, 0.08, 0.02), wood, -0.28, 0.22, -0.18);
    for (let i = 0; i < 10; i++) {
      addTo(g, roundedBox(0.055, 0.04, 0.02, 0.005), white, -0.3 + i * 0.06, 0.2, 0.08);
    }
  } else if (variant === "upright") {
    addTo(g, roundedBox(0.38, 0.72, 0.32, 0.04), black, 0, 0.4, 0);
    addTo(g, roundedBox(0.34, 0.08, 0.28, 0.02), white, 0, 0.12, 0.02);
    addTo(g, roundedBox(0.3, 0.04, 0.02, 0.01), wood, 0, 0.76, 0);
    for (let i = 0; i < 8; i++) {
      addTo(g, roundedBox(0.035, 0.03, 0.015, 0.005), white, -0.12 + i * 0.035, 0.14, 0.12);
    }
  } else {
    addTo(g, roundedBox(0.48, 0.14, 0.32, 0.04), black, 0, 0.1, 0);
    addTo(g, roundedBox(0.44, 0.05, 0.28, 0.02), white, 0, 0.16, 0);
    addTo(g, roundedBox(0.06, 0.18, 0.06, 0.02), wood, -0.2, 0.2, -0.1);
    for (let i = 0; i < 8; i++) {
      addTo(g, roundedBox(0.045, 0.035, 0.015, 0.005), white, -0.16 + i * 0.045, 0.14, 0.1);
    }
  }
  emitter(g, variant === "upright" ? 0.78 : 0.28);
}

function buildSynth(g: THREE.Group) {
  const body = bondeeMat(0x3a3a48);
  const key = bondeeMat(0xf0f0f0);
  const accent = bondeeMat(0xff88cc, { emissive: new THREE.Color(0xff44aa), emissiveIntensity: 0.25 });
  addTo(g, roundedBox(0.52, 0.08, 0.22, 0.03), body, 0, 0.12, 0);
  addTo(g, roundedBox(0.48, 0.03, 0.18, 0.01), key, 0, 0.18, 0);
  for (let i = 0; i < 6; i++) {
    addTo(g, roundedBox(0.04, 0.04, 0.04, 0.01), accent, -0.2 + i * 0.08, 0.22, -0.02);
  }
  addTo(g, roundedBox(0.12, 0.04, 0.04, 0.01), bondeeMat(0x222228), 0.18, 0.22, 0.04);
  emitter(g, 0.28);
}

function buildMarimbaOrXylophone(g: THREE.Group, xylophone: boolean) {
  const frame = bondeeMat(BONDEE_PALETTE.wood);
  const bars = xylophone
    ? [0xff8888, 0xffaa66, 0xffdd44, 0xa8e060, 0x88ddff, 0xaa88ff]
    : [BONDEE_PALETTE.wood, BONDEE_PALETTE.woodDark, 0xdfc9a8, BONDEE_PALETTE.wood, BONDEE_PALETTE.woodDark, 0xdfc9a8];
  addTo(g, roundedBox(0.58, 0.06, 0.28, 0.02), frame, 0, 0.12, 0);
  for (let i = 0; i < 8; i++) {
    const w = 0.48 - i * 0.04;
    addTo(g, roundedBox(w, 0.025, 0.06, 0.008), bondeeMat(bars[i % bars.length]), 0, 0.2, -0.08 + i * 0.022);
  }
  for (const x of [-0.26, 0.26]) {
    addTo(g, roundedBox(0.04, 0.22, 0.04, 0.01), frame, x, 0.22, 0);
  }
  emitter(g, 0.32);
}

function buildDrumSet(g: THREE.Group) {
  const metal = bondeeMat(0xcccccc, { metalness: 0.65, roughness: 0.35 });
  const drum = bondeeMat(0x2a2a32);
  const skin = bondeeMat(0xf5e6d3);
  const addDrum = (x: number, z: number, r: number, h: number) => {
    addTo(g, new THREE.CylinderGeometry(r, r * 0.95, h, 16), drum, x, h / 2 + 0.02, z);
    addTo(g, new THREE.CylinderGeometry(r * 0.92, r * 0.92, 0.015, 16), skin, x, h + 0.02, z);
    addTo(g, new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.02, 16), metal, x, h + 0.03, z);
  };
  addDrum(0, 0, 0.14, 0.12);
  addDrum(-0.18, 0.08, 0.1, 0.08);
  addDrum(0.18, 0.06, 0.11, 0.09);
  addDrum(-0.08, -0.12, 0.16, 0.1);
  addDrum(0.12, -0.14, 0.08, 0.06);
  addTo(g, new THREE.CylinderGeometry(0.14, 0.14, 0.012, 16), metal, 0.22, 0.38, -0.08);
  addTo(g, roundedBox(0.02, 0.32, 0.02, 0.005), metal, 0, 0.18, 0);
  emitter(g, 0.42);
}

function buildTimpani(g: THREE.Group) {
  const copper = bondeeMat(0xc87840, { metalness: 0.55, roughness: 0.4 });
  const skin = bondeeMat(0xf0e0c8);
  for (let i = 0; i < 4; i++) {
    const x = -0.24 + i * 0.16;
    const r = 0.08 + i * 0.015;
    addTo(g, new THREE.CylinderGeometry(r, r * 0.85, 0.14, 16), copper, x, 0.1, 0);
    addTo(g, new THREE.CylinderGeometry(r * 0.9, r * 0.9, 0.012, 16), skin, x, 0.18, 0);
  }
  emitter(g, 0.28);
}

function buildAccordion(g: THREE.Group) {
  const red = bondeeMat(0xcc3344);
  const black = bondeeMat(0x1a1a1a);
  const key = bondeeMat(0xfaf8f5);
  addTo(g, roundedBox(0.22, 0.28, 0.12, 0.03), red, 0, 0.2, 0);
  for (let i = 0; i < 5; i++) {
    addTo(g, roundedBox(0.18, 0.02, 0.1, 0.005), black, 0, 0.08 + i * 0.05, 0);
  }
  addTo(g, roundedBox(0.14, 0.06, 0.04, 0.015), key, 0.16, 0.18, 0);
  addTo(g, roundedBox(0.08, 0.1, 0.04, 0.015), key, -0.16, 0.18, 0);
  emitter(g, 0.32);
}

function buildPanFlute(g: THREE.Group) {
  const bamboo = bondeeMat(0xc8a882);
  const bind = bondeeMat(0x8a6040);
  for (let i = 0; i < 8; i++) {
    const h = 0.12 + i * 0.04;
    addTo(g, new THREE.CylinderGeometry(0.012, 0.012, h, 8), bamboo, -0.1 + i * 0.028, h / 2 + 0.08, 0);
  }
  addTo(g, roundedBox(0.22, 0.02, 0.04, 0.005), bind, 0, 0.1, 0);
  emitter(g, 0.35);
}

function buildOcarina(g: THREE.Group) {
  const clay = bondeeMat(0x88c8e8);
  const hole = bondeeMat(0x1a1a1a);
  addTo(g, roundedBox(0.12, 0.08, 0.18, 0.04), clay, 0, 0.12, 0);
  addTo(g, new THREE.CylinderGeometry(0.015, 0.015, 0.06, 8), clay, 0.06, 0.18, 0, 0, 0, -0.5);
  for (const [x, y] of [[-0.02, 0.14], [0.02, 0.14], [0, 0.16], [-0.03, 0.12], [0.03, 0.12]] as const) {
    addTo(g, new THREE.CylinderGeometry(0.008, 0.008, 0.02, 8), hole, x, y, 0.06);
  }
  emitter(g, 0.22);
}

function buildSaxophone(g: THREE.Group) {
  const brass = bondeeMat(0xd4a84b, { metalness: 0.58, roughness: 0.32 });
  addTo(g, roundedBox(0.06, 0.08, 0.04, 0.015), brass, 0, 0.12, 0);
  addTo(g, roundedBox(0.04, 0.22, 0.04, 0.015), brass, 0, 0.28, 0, 0.15, 0, 0);
  addTo(g, roundedBox(0.08, 0.06, 0.06, 0.02), brass, 0.04, 0.38, 0.02, 0, 0.8, 0.3);
  addTo(g, roundedBox(0.12, 0.04, 0.08, 0.015), brass, 0.08, 0.42, 0.06, 0, 0.5, 0.2);
  emitter(g, 0.45);
}

function buildTrumpet(g: THREE.Group) {
  const brass = bondeeMat(0xe8c868, { metalness: 0.62, roughness: 0.28 });
  addTo(g, roundedBox(0.04, 0.04, 0.18, 0.01), brass, 0, 0.14, -0.06);
  addTo(g, roundedBox(0.06, 0.06, 0.06, 0.02), brass, 0, 0.16, 0.02, 0, 0.6, 0);
  addTo(g, roundedBox(0.1, 0.04, 0.04, 0.015), brass, 0.06, 0.18, 0.06, 0, 0.4, 0.3);
  emitter(g, 0.22);
}

function buildFrenchHorn(g: THREE.Group) {
  const brass = bondeeMat(0xd4a84b, { metalness: 0.55, roughness: 0.35 });
  addTo(g, new THREE.TorusGeometry(0.12, 0.025, 8, 20), brass, 0, 0.22, 0, Math.PI / 2, 0, 0);
  addTo(g, roundedBox(0.04, 0.04, 0.22, 0.01), brass, 0.1, 0.22, -0.08, 0, -0.3, 0);
  addTo(g, roundedBox(0.06, 0.04, 0.06, 0.015), brass, 0.14, 0.2, 0.04);
  addTo(g, roundedBox(0.04, 0.12, 0.04, 0.01), brass, -0.06, 0.12, 0);
  emitter(g, 0.28);
}

function buildInstrumentPrototype(kind: InstrumentKind): THREE.Group {
  const g = new THREE.Group();
  g.userData.kind = kind;
  g.userData.interactKind = "instrument";

  switch (kind) {
    case "acoustic_guitar":
      buildGuitar(g, false, false);
      break;
    case "electric_guitar":
      buildGuitar(g, true, false);
      break;
    case "bass_guitar":
      buildGuitar(g, true, true);
      break;
    case "violin":
      buildBowed(g, false);
      break;
    case "cello":
      buildBowed(g, true);
      break;
    case "harp":
      buildHarp(g);
      break;
    case "piano":
      buildPiano(g, "piano");
      break;
    case "upright_piano":
      buildPiano(g, "upright");
      break;
    case "grand_piano":
      buildPiano(g, "grand");
      break;
    case "synthesizer":
      buildSynth(g);
      break;
    case "marimba":
      buildMarimbaOrXylophone(g, false);
      break;
    case "xylophone":
      buildMarimbaOrXylophone(g, true);
      break;
    case "drum_set":
      buildDrumSet(g);
      break;
    case "timpani":
      buildTimpani(g);
      break;
    case "accordion":
      buildAccordion(g);
      break;
    case "pan_flute":
      buildPanFlute(g);
      break;
    case "ocarina":
      buildOcarina(g);
      break;
    case "saxophone":
      buildSaxophone(g);
      break;
    case "trumpet":
      buildTrumpet(g);
      break;
    case "french_horn":
      buildFrenchHorn(g);
      break;
  }

  shadowizeGroup(g, false);
  return g;
}

function cloneNode(src: THREE.Object3D): THREE.Object3D {
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
  src.children.forEach((c) => g.add(cloneNode(c)));
  return g;
}

export function buildInstrumentMesh(kind: InstrumentKind): THREE.Group {
  let proto = PROTOTYPES.get(kind);
  if (!proto) {
    proto = buildInstrumentPrototype(kind);
    PROTOTYPES.set(kind, proto);
  }
  const root = new THREE.Group();
  root.userData.kind = kind;
  root.userData.interactKind = "instrument";
  proto.children.forEach((c) => root.add(cloneNode(c)));
  return root;
}
