"use client";

import * as THREE from "three";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import {
  BONDEE_PALETTE,
  bondeeMat,
  bondeeGlowMat,
  roundedBox,
} from "./bondee-mesh-utils";
import type { RoomTheme } from "./bondee-textures";

function add(g: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, ry = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = false;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

/** 천장 + 매립형 조명 — 모든 실내 공간 */
export function buildRoomCeiling(w: number, d: number, cx: number, cz: number, theme: RoomTheme, wallH = 2.52): THREE.Group {
  const g = new THREE.Group();
  g.name = "room-ceiling";

  add(g, roundedBox(w - 0.04, 0.05, d - 0.04, 0.015), bondeeMat(0xffffff), cx, wallH, cz);
  add(g, roundedBox(w - 0.12, 0.025, d - 0.12, 0.008), bondeeMat(0xf8f6f4), cx, wallH - 0.02, cz);

  const crownW = w - 0.08;
  const crownD = d - 0.08;
  for (const [px, pz, rw, rd] of [
    [cx, cz - d / 2 + 0.04, crownW, 0.035],
    [cx, cz + d / 2 - 0.04, crownW, 0.035],
    [cx - w / 2 + 0.04, cz, 0.035, crownD],
    [cx + w / 2 - 0.04, cz, 0.035, crownD],
  ] as const) {
    add(g, roundedBox(rw, 0.045, rd, 0.008), bondeeMat(BONDEE_PALETTE.trim), px, wallH - 0.06, pz);
  }

  const fixture = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.2, 0.04, 16),
    bondeeMat(0xffffff, { roughness: 0.4 })
  );
  fixture.position.set(cx, wallH - 0.08, cz);
  g.add(fixture);

  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(0.12, 16),
    new THREE.MeshBasicMaterial({ color: theme.lightColor, transparent: true, opacity: 0.65 })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(cx, wallH - 0.1, cz);
  glow.name = "room-ceiling-light";
  g.add(glow);

  return g;
}

/** 거실 — TV 벽면, 커튼 박스, 따뜻한 조명 */
function buildLivingBuiltins(w: number, d: number, cx: number, cz: number, theme: RoomTheme): THREE.Group {
  const g = new THREE.Group();
  g.name = "living-builtins";

  const tvWall = add(g, roundedBox(0.08, 0.72, 0.92, 0.02), bondeeMat(0x2a2a32), cx + w / 2 - 0.06, 0.72, cz - 0.1);
  tvWall.name = "tv-wall-niche";
  add(g, roundedBox(0.62, 0.38, 0.02, 0.01), bondeeGlowMat(0x88ccff, 0.35), cx + w / 2 - 0.04, 0.78, cz - 0.1);
  const tvGlow = add(g, roundedBox(0.58, 0.34, 0.01, 0.008), bondeeGlowMat(0xaaccff, 0.22), cx + w / 2 - 0.035, 0.78, cz - 0.095);
  tvGlow.name = "tv-wall-glow";
  add(g, roundedBox(0.7, 0.06, 0.14, 0.015), bondeeMat(BONDEE_PALETTE.woodDark), cx + w / 2 - 0.04, 0.52, cz - 0.1);

  const curtainBox = add(g, roundedBox(0.72, 0.1, 0.08, 0.015), bondeeMat(BONDEE_PALETTE.trim), cx - w / 2 + 0.36, 1.38, cz - d / 2 + 0.06);
  curtainBox.name = "curtain-box";
  const curtainL = add(g, roundedBox(0.28, 0.52, 0.015, 0.008), bondeeMat(theme.curtainColor, { transparent: true, opacity: 0.85 }), cx - w / 2 + 0.2, 1.05, cz - d / 2 + 0.07);
  curtainL.name = "room-curtain";
  const curtainR = add(g, roundedBox(0.28, 0.52, 0.015, 0.008), bondeeMat(theme.curtainColor, { transparent: true, opacity: 0.85 }), cx - w / 2 + 0.5, 1.05, cz - d / 2 + 0.07);
  curtainR.name = "room-curtain";

  const windowGlow = add(g, roundedBox(0.32, 0.48, 0.01, 0.006), bondeeGlowMat(0xfff0c8, 0.18), cx - w / 2 + 0.06, 1.05, cz - d / 2 + 0.04);
  windowGlow.name = "window-sun-glow";

  add(g, roundedBox(w * 0.55, 0.025, d * 0.42, 0.01), bondeeMat(0xffe8d8, { transparent: true, opacity: 0.35 }), cx, 0.04, cz + 0.08);

  return g;
}

/** 침실 — 헤드보드, 협탁, 옷장 */
function buildBedroomBuiltins(w: number, d: number, cx: number, cz: number, theme: RoomTheme): THREE.Group {
  const g = new THREE.Group();
  g.name = "bedroom-builtins";

  add(g, roundedBox(0.78, 0.58, 0.06, 0.02), bondeeMat(BONDEE_PALETTE.wood), cx, 0.52, cz - d / 2 + 0.08);
  add(g, roundedBox(0.62, 0.42, 0.04, 0.015), bondeeMat(theme.wallAccent, { transparent: true, opacity: 0.5 }), cx, 0.58, cz - d / 2 + 0.1);

  for (const sx of [-0.42, 0.42]) {
    add(g, roundedBox(0.22, 0.28, 0.2, 0.025), bondeeMat(BONDEE_PALETTE.wood), cx + sx, 0.18, cz - 0.05);
    add(g, roundedBox(0.08, 0.06, 0.06, 0.01), bondeeGlowMat(0xffe8c0, 0.25), cx + sx, 0.32, cz - 0.02);
  }

  add(g, roundedBox(0.42, 1.65, 0.38, 0.03), bondeeMat(BONDEE_PALETTE.woodDark), cx + w / 2 - 0.28, 0.9, cz + d / 2 - 0.24);
  add(g, roundedBox(0.04, 1.55, 0.32, 0.008), bondeeMat(BONDEE_PALETTE.trim), cx + w / 2 - 0.28, 0.9, cz + d / 2 - 0.22);

  return g;
}

/** 주방 — L자 상·하부장, 싱크, 후드 */
function buildKitchenBuiltins(w: number, d: number, cx: number, cz: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "kitchen-builtins";

  const cab = bondeeMat(0xf5f8ff);
  const counter = bondeeMat(0xe8ece8, { roughness: 0.35 });
  const splash = bondeeMat(0xffffff, { metalness: 0.08, roughness: 0.2 });

  add(g, roundedBox(w * 0.82, 0.72, 0.38, 0.025), cab, cx, 0.38, cz - d / 2 + 0.24);
  add(g, roundedBox(w * 0.82, 0.05, 0.4, 0.012), counter, cx, 0.76, cz - d / 2 + 0.24);
  add(g, roundedBox(w * 0.78, 0.32, 0.02, 0.008), splash, cx, 0.92, cz - d / 2 + 0.08);

  add(g, roundedBox(0.38, 0.72, 0.38, 0.025), cab, cx + w / 2 - 0.24, 0.38, cz - 0.05);
  add(g, roundedBox(0.4, 0.05, 0.4, 0.012), counter, cx + w / 2 - 0.24, 0.76, cz - 0.05);

  add(g, roundedBox(0.28, 0.04, 0.22, 0.01), bondeeMat(0x888899, { metalness: 0.5 }), cx - 0.1, 0.78, cz - d / 2 + 0.24);
  add(g, roundedBox(0.32, 0.18, 0.24, 0.02), bondeeMat(0x555566, { metalness: 0.35 }), cx + 0.15, 1.05, cz - d / 2 + 0.22);

  for (let i = 0; i < 4; i++) {
    add(g, roundedBox(0.04, 0.04, 0.04, 0.008), bondeeMat(BONDEE_PALETTE.trim, { metalness: 0.4 }), cx - w / 2 + 0.2 + i * 0.12, 0.68, cz - d / 2 + 0.42);
  }

  return g;
}

/** 욕실 — 세면대, 변기, 욕조/샤워 */
function buildBathroomBuiltins(w: number, d: number, cx: number, cz: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "bathroom-builtins";

  const tile = bondeeMat(BONDEE_PALETTE.tile, { roughness: 0.45 });
  add(g, roundedBox(w * 0.7, 0.55, 0.02, 0.008), tile, cx, 0.72, cz - d / 2 + 0.05);

  add(g, roundedBox(0.42, 0.08, 0.28, 0.015), bondeeMat(0xffffff), cx - w / 2 + 0.35, 0.72, cz - d / 2 + 0.12);
  add(g, roundedBox(0.08, 0.12, 0.08, 0.012), bondeeMat(0xccccdd, { metalness: 0.55 }), cx - w / 2 + 0.35, 0.82, cz - d / 2 + 0.08);
  const spout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.02, 12),
    bondeeMat(0xccccdd, { metalness: 0.5 })
  );
  spout.rotation.x = Math.PI / 2;
  spout.position.set(cx - w / 2 + 0.35, 0.88, cz - d / 2 + 0.12);
  g.add(spout);

  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.14, 16), bondeeMat(0xffffff));
  bowl.position.set(cx + w / 2 - 0.3, 0.12, cz + d / 2 - 0.28);
  g.add(bowl);
  add(g, roundedBox(0.08, 0.22, 0.06, 0.01), bondeeMat(0xffffff), cx + w / 2 - 0.3, 0.28, cz + d / 2 - 0.32);

  const tub = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.28, 0.38), bondeeMat(0xffffff, { roughness: 0.25 }));
  tub.position.set(cx, 0.18, cz - d / 2 + 0.32);
  g.add(tub);
  add(g, roundedBox(0.68, 0.04, 0.02, 0.008), bondeeMat(0xccccdd, { metalness: 0.4 }), cx, 0.34, cz - d / 2 + 0.14);

  return g;
}

/** 발코니 — 유리 난간, 화분대 */
function buildBalconyBuiltins(w: number, d: number, cx: number, cz: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "balcony-builtins";

  const railH = 0.82;
  for (let i = 0; i < Math.floor(w / 0.22); i++) {
    add(g, roundedBox(0.02, railH, 0.02, 0.004), bondeeMat(BONDEE_PALETTE.trim, { metalness: 0.35 }), cx - w / 2 + 0.12 + i * 0.22, railH / 2 + 0.08, cz + d / 2 - 0.04);
  }
  add(g, roundedBox(w - 0.08, 0.04, 0.03, 0.008), bondeeMat(BONDEE_PALETTE.trim, { metalness: 0.4 }), cx, railH + 0.06, cz + d / 2 - 0.04);
  add(g, roundedBox(w - 0.1, 0.025, 0.04, 0.006), bondeeMat(0x8899aa, { transparent: true, opacity: 0.35 }), cx, railH * 0.55 + 0.08, cz + d / 2 - 0.04);

  add(g, roundedBox(0.52, 0.12, 0.18, 0.02), bondeeMat(0xffc8b0), cx - 0.2, 0.08, cz + d / 2 - 0.22);
  for (let i = 0; i < 3; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), bondeeMat(i % 2 ? 0x7ec898 : 0x98d8a8));
    leaf.name = "plant-leaves";
    leaf.position.set(cx - 0.2 + (i - 1) * 0.1, 0.22, cz + d / 2 - 0.22);
    g.add(leaf);
  }

  return g;
}

/** 현관 — 신발장, 거울 */
function buildEntranceBuiltins(w: number, d: number, cx: number, cz: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "entrance-builtins";

  add(g, roundedBox(0.62, 0.48, 0.28, 0.025), bondeeMat(BONDEE_PALETTE.wood), cx + w / 2 - 0.38, 0.28, cz - d / 2 + 0.18);
  for (let i = 0; i < 3; i++) {
    add(g, roundedBox(0.14, 0.04, 0.08, 0.008), bondeeMat(0x444455), cx + w / 2 - 0.38 - 0.12 + i * 0.12, 0.06, cz - d / 2 + 0.28);
  }

  const mirror = new THREE.Mesh(
    roundedBox(0.22, 0.32, 0.02, 0.008),
    bondeeMat(0xd8e8f8, { metalness: 0.75, roughness: 0.08 })
  );
  mirror.position.set(cx - w / 2 + 0.18, 0.92, cz - d / 2 + 0.06);
  g.add(mirror);

  add(g, roundedBox(w * 0.6, 0.015, 0.12, 0.006), bondeeMat(0xd8cfc4), cx, 0.04, cz + d / 2 - 0.14);

  return g;
}

export function buildRoomTypeProps(room: AptRoom, w: number, d: number, cx: number, cz: number, theme: RoomTheme, wallH = 2.52): THREE.Group {
  const root = new THREE.Group();
  root.name = `room-props-${room.id}`;
  root.add(buildRoomCeiling(w, d, cx, cz, theme, wallH));

  if (room.type === "living" || room.id === "living") {
    root.add(buildLivingBuiltins(w, d, cx, cz, theme));
  } else if (room.type === "bedroom") {
    root.add(buildBedroomBuiltins(w, d, cx, cz, theme));
  } else if (room.type === "kitchen" || room.id === "kitchen") {
    root.add(buildKitchenBuiltins(w, d, cx, cz));
  } else if (room.type === "bathroom") {
    root.add(buildBathroomBuiltins(w, d, cx, cz));
  } else if (room.type === "balcony") {
    root.add(buildBalconyBuiltins(w, d, cx, cz));
  } else if (room.type === "entrance") {
    root.add(buildEntranceBuiltins(w, d, cx, cz));
  }

  return root;
}
