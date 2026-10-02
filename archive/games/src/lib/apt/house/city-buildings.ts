import * as THREE from "three";
import type { CityBuildingMeta, CityBuildingType } from "@/lib/apt/house/city-building-types";
import { terrainHeight } from "@/lib/apt/house/procedural-world";

const TYPES: CityBuildingType[] = ["shop", "cafe", "office", "residential", "clinic"];
const SHOP_NAMES = ["Mo마트", "굿즈샵", "편의점", "서점", "화방", "전자상가", "꽃집", "베이커리"];
const CAFE_NAMES = ["모코모 카페", "브루잉", "라떼하우스", "티타임", "스윗컵"];
const OFFICE_NAMES = ["스타트업 타워", "IT센터", "디자인 스튜디오", "미디어랩"];
const RES_NAMES = ["센트럴 아파트", "힐탑 주택", "리버뷰 맨션", "그린타운"];
const CLINIC_NAMES = ["모코모 의원", "건강센터", "치과", "약국"];

function pick<T>(arr: T[], seed: number, i: number) {
  return arr[(seed + i * 7) % arr.length];
}

function mat(c: number, o?: Partial<THREE.MeshStandardMaterialParameters>) {
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.84, metalness: 0.05, ...o });
}

function buildExteriorMesh(meta: CityBuildingMeta, seed: number): THREE.Group {
  const g = new THREE.Group();
  g.userData.cityBuildingId = meta.id;
  g.userData.cityBuildingType = meta.type;

  const floors = meta.floors;
  const bw = 3.2 + (seed % 3) * 0.4;
  const bd = 3.5 + ((seed + 1) % 4) * 0.3;
  const bh = floors * 1.15;
  const wallColor = {
    shop: 0xd8c8b0,
    cafe: 0xc8b8a8,
    office: 0xa8b8c8,
    residential: 0xd0c8c0,
    clinic: 0xf0e8e8,
  }[meta.type];

  const body = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat(wallColor));
  body.position.y = bh / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(bw + 0.25, 0.18, bd + 0.25),
    mat(meta.type === "shop" || meta.type === "cafe" ? 0x5a4030 : 0x4a4a52)
  );
  roof.position.y = bh + 0.1;
  g.add(roof);

  if (meta.type === "shop" || meta.type === "cafe") {
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(bw + 0.6, 0.08, 1.2),
      mat(meta.type === "cafe" ? 0x6a4030 : 0xe85d4a)
    );
    awning.position.set(0, 2.2, bd / 2 + 0.55);
    g.add(awning);
  }

  const signColor = { shop: 0xe85d4a, cafe: 0x8a5030, office: 0x3a5a8a, residential: 0x5a7a5a, clinic: 0xc85a6a }[meta.type];
  const sign = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.75, 0.45, 0.08), mat(signColor, { emissive: 0x221100, emissiveIntensity: 0.12 }));
  sign.position.set(0, bh * 0.72, bd / 2 + 0.06);
  g.add(sign);

  for (let f = 0; f < floors; f++) {
    for (let w = 0; w < 2; w++) {
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.5, 0.06),
        mat(0x9ec8e8, { emissive: 0x112233, emissiveIntensity: 0.1 + (f === 0 ? 0.08 : 0) })
      );
      win.position.set(-0.65 + w * 1.3, 0.9 + f * 1.1, bd / 2 + 0.04);
      g.add(win);
    }
  }

  const door = new THREE.Mesh(new THREE.BoxGeometry(1, 2.1, 0.12), mat(0x4a3020));
  door.position.set(0, 1.05, bd / 2 + 0.08);
  door.userData.isCityDoor = true;
  door.userData.cityBuildingId = meta.id;
  g.add(door);

  const step = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.5), mat(0x999999));
  step.position.set(0, 0.06, bd / 2 + 0.35);
  g.add(step);

  return g;
}

export function buildEnterableCity(seed: number, plotHalf: number): { group: THREE.Group; buildings: CityBuildingMeta[] } {
  const group = new THREE.Group();
  const buildings: CityBuildingMeta[] = [];
  const count = 22;

  for (let i = 0; i < count; i++) {
    const angle = ((seed + i * 41) % 360) * (Math.PI / 180);
    const r = plotHalf + 12 + ((seed + i * 29) % 32);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    if (Math.abs(x) < plotHalf + 2 && Math.abs(z) < plotHalf + 2) continue;

    const type = TYPES[(seed + i) % TYPES.length];
    const label = {
      shop: pick(SHOP_NAMES, seed, i),
      cafe: pick(CAFE_NAMES, seed, i),
      office: pick(OFFICE_NAMES, seed, i),
      residential: pick(RES_NAMES, seed, i),
      clinic: pick(CLINIC_NAMES, seed, i),
    }[type];

    const meta: CityBuildingMeta = {
      id: `city-${seed}-${i}`,
      type,
      label,
      x,
      z,
      rotY: (seed + i) * 0.19,
      floors: 2 + ((seed + i) % 4),
    };
    buildings.push(meta);

    const building = buildExteriorMesh(meta, seed + i);
    const y = terrainHeight(x, z, seed);
    building.position.set(x, y, z);
    building.rotation.y = meta.rotY;
    group.add(building);
  }

  return { group, buildings };
}
