"use client";

import * as THREE from "three";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { itemWorldPos } from "./home-floor-meshes";
import type { BondeeFurnitureKind, BondeePlacedItem } from "./types";
import { bondeeMat } from "./bondee-mesh-utils";

const MAX_PER_KIND = 64;

/** Low-poly proxy sizes (w, h, d) for instanced LOD */
const PROXY: Record<BondeeFurnitureKind, { size: [number, number, number]; color: number }> = {
  sofa: { size: [0.88, 0.36, 0.48], color: 0xffb8c8 },
  bed: { size: [0.78, 0.28, 0.95], color: 0xe8e0ff },
  tv_stand: { size: [0.62, 0.5, 0.28], color: 0xfaf8f5 },
  coffee_table: { size: [0.5, 0.24, 0.34], color: 0xe8d4bc },
  bookshelf: { size: [0.92, 1.0, 0.3], color: 0xe8d4bc },
  floor_lamp: { size: [0.22, 0.9, 0.22], color: 0xfff0d8 },
  plant: { size: [0.2, 0.42, 0.2], color: 0x98d8a8 },
  desk: { size: [0.64, 0.42, 0.38], color: 0xe8d4bc },
  treadmill: { size: [0.52, 0.5, 0.92], color: 0x666677 },
  ac: { size: [0.28, 0.68, 0.22], color: 0xffffff },
  clock: { size: [0.12, 0.22, 0.12], color: 0xffffff },
  rug: { size: [0.82, 0.03, 0.62], color: 0xc8a882 },
  washer: { size: [0.38, 0.48, 0.38], color: 0xffffff },
  hoop: { size: [0.32, 0.72, 0.32], color: 0xff6633 },
  shelf_small: { size: [0.38, 0.52, 0.22], color: 0xe8d4bc },
  gramophone: { size: [0.72, 0.78, 0.42], color: 0xd4a84b },
  refrigerator: { size: [0.42, 0.92, 0.38], color: 0xf5f8ff },
  computer: { size: [0.16, 0.34, 0.28], color: 0x2a2a32 },
  monitor: { size: [0.34, 0.38, 0.08], color: 0x222228 },
  smartphone: { size: [0.06, 0.12, 0.02], color: 0x1a1a22 },
  window: { size: [0.52, 0.62, 0.08], color: 0xfaf8f5 },
  mailbox: { size: [0.22, 0.38, 0.18], color: 0x3a5a8a },
  telephone: { size: [0.18, 0.32, 0.14], color: 0x2a2a32 },
  acoustic_guitar: { size: [0.32, 0.42, 0.22], color: 0xe8d4bc },
  electric_guitar: { size: [0.32, 0.42, 0.22], color: 0x2a2a32 },
  bass_guitar: { size: [0.38, 0.44, 0.24], color: 0x2a2a32 },
  violin: { size: [0.18, 0.52, 0.08], color: 0xe8d4bc },
  cello: { size: [0.22, 0.62, 0.1], color: 0xe8d4bc },
  harp: { size: [0.28, 0.58, 0.32], color: 0xf5e6d3 },
  piano: { size: [0.48, 0.22, 0.32], color: 0x1a1a1a },
  upright_piano: { size: [0.38, 0.78, 0.32], color: 0x1a1a1a },
  grand_piano: { size: [0.72, 0.28, 0.48], color: 0x1a1a1a },
  synthesizer: { size: [0.52, 0.28, 0.22], color: 0x3a3a48 },
  marimba: { size: [0.58, 0.32, 0.28], color: 0xe8d4bc },
  drum_set: { size: [0.48, 0.48, 0.38], color: 0xcccccc },
  timpani: { size: [0.72, 0.22, 0.18], color: 0xc87840 },
  xylophone: { size: [0.58, 0.32, 0.28], color: 0xffaa66 },
  accordion: { size: [0.22, 0.32, 0.14], color: 0xcc3344 },
  pan_flute: { size: [0.22, 0.28, 0.06], color: 0xc8a882 },
  ocarina: { size: [0.14, 0.12, 0.2], color: 0x88c8e8 },
  saxophone: { size: [0.18, 0.48, 0.12], color: 0xd4a84b },
  trumpet: { size: [0.18, 0.22, 0.22], color: 0xe8c868 },
  french_horn: { size: [0.28, 0.28, 0.22], color: 0xd4a84b },
};

const _matrix = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);

/**
 * Batched InstancedMesh furniture — one draw call per kind.
 * Used for tower neighbor floors & distant LOD.
 */
export function buildInstancedFurnitureGroup(
  items: BondeePlacedItem[],
  rooms: AptRoom[],
  itemScale = 0.68
): THREE.Group {
  const root = new THREE.Group();
  root.name = "furniture-instances";

  const buckets = new Map<BondeeFurnitureKind, { item: BondeePlacedItem; room: AptRoom }[]>();
  for (const item of items) {
    if (item.studioAssetId) continue;
    const room = rooms.find((r) => r.id === item.roomId);
    if (!room) continue;
    const list = buckets.get(item.kind) ?? [];
    list.push({ item, room });
    buckets.set(item.kind, list);
  }

  for (const [kind, list] of buckets) {
    const spec = PROXY[kind];
    if (!spec || list.length === 0) continue;

    const [w, h, d] = spec.size;
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = bondeeMat(spec.color);
    const count = Math.min(list.length, MAX_PER_KIND);
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.name = `inst-${kind}`;
    mesh.frustumCulled = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    for (let i = 0; i < count; i++) {
      const { item, room } = list[i];
      const p = itemWorldPos(item, room);
      _pos.set(p.x, 0.06 + h / 2, p.z);
      _quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (item.rot * Math.PI) / 2);
      _scale.setScalar(itemScale);
      _matrix.compose(_pos, _quat, _scale);
      mesh.setMatrixAt(i, _matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    root.add(mesh);
  }

  return root;
}

export function disposeInstancedFurnitureGroup(group: THREE.Object3D) {
  group.traverse((o) => {
    if (o instanceof THREE.InstancedMesh) {
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => m.dispose());
    }
  });
}
