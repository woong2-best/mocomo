import * as THREE from "three";
import { WORLD_SIZE } from "@/lib/apt/house/build-types";

function noise2(x: number, z: number, seed: number) {
  const s = seed * 0.001;
  return (
    Math.sin(x * 0.08 + s) * Math.cos(z * 0.07 + s * 2) * 0.6 +
    Math.sin(x * 0.15 + z * 0.11 + s) * 0.3 +
    Math.cos(x * 0.04 - z * 0.09) * 0.2
  );
}

export function terrainHeight(x: number, z: number, seed: number) {
  const n = noise2(x, z, seed);
  const dist = Math.sqrt(x * x + z * z);
  const falloff = Math.max(0, 1 - dist / (WORLD_SIZE * 0.45));
  return n * 2.2 * falloff;
}

export function buildTerrain(seed: number): THREE.Mesh {
  const seg = 64;
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, terrainHeight(x, z, seed));
  }
  geo.computeVertexNormals();

  const colors: number[] = [];
  const cLow = new THREE.Color(0x4a8f3f);
  const cMid = new THREE.Color(0x5fa84e);
  const cHigh = new THREE.Color(0x7aaa5c);
  for (let i = 0; i < pos.count; i++) {
    const h = pos.getY(i);
    const t = Math.min(1, Math.max(0, (h + 0.5) / 3));
    const c = cLow.clone().lerp(t < 0.5 ? cMid : cHigh, t);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 })
  );
  mesh.receiveShadow = true;
  mesh.name = "terrain";
  return mesh;
}

export function buildRoadNetwork(seed: number): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.95 });
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xcccc66, roughness: 0.9 });

  const roads: [number, number, number, number][] = [
    [-WORLD_SIZE * 0.35, 0, WORLD_SIZE * 0.35, 6],
    [0, -WORLD_SIZE * 0.3, 8, WORLD_SIZE * 0.6],
    [WORLD_SIZE * 0.15, 0, 5, WORLD_SIZE * 0.4],
  ];

  for (const [cx, cz, w, d] of roads) {
    const y = terrainHeight(cx, cz, seed) + 0.06;
    const road = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), mat);
    road.position.set(cx, y, cz);
    road.receiveShadow = true;
    g.add(road);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(w * 0.04, 0.11, d * 0.9), lineMat);
    stripe.position.set(cx, y + 0.01, cz);
    g.add(stripe);
  }
  return g;
}

export function buildNeighborHouses(seed: number, plotHalf: number): THREE.Group {
  const g = new THREE.Group();
  const offsets = [
    [plotHalf + 8, plotHalf + 6],
    [-(plotHalf + 10), plotHalf + 4],
    [plotHalf + 5, -(plotHalf + 9)],
    [-(plotHalf + 7), -(plotHalf + 8)],
    [plotHalf + 12, -2],
    [-8, plotHalf + 11],
  ];

  offsets.forEach(([ox, oz], i) => {
    const h = terrainHeight(ox, oz, seed);
    const house = new THREE.Group();
    const w = 4 + (seed % 3) + (i % 2);
    const d = 5 + (i % 3);
    const wallMat = new THREE.MeshStandardMaterial({
      color: [0xd4c4a8, 0xc8b8a0, 0xe0d4c0, 0xb8a890][i % 4],
      roughness: 0.85,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, 2.6, d), wallMat);
    body.position.y = 1.3;
    body.castShadow = true;
    house.add(body);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(w, d) * 0.72, 1.6, 4),
      new THREE.MeshStandardMaterial({ color: 0x6b3030, roughness: 0.8 })
    );
    roof.position.y = 3.4;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    house.add(roof);

    const winMat = new THREE.MeshStandardMaterial({ color: 0x9ec8e8, emissive: 0x223344, emissiveIntensity: 0.15 });
    for (let wi = 0; wi < 2; wi++) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.08), winMat);
      win.position.set(-1 + wi * 2, 1.6, d / 2 + 0.05);
      house.add(win);
    }

    house.position.set(ox, h, oz);
    house.rotation.y = (seed + i) * 0.3;
    g.add(house);
  });
  return g;
}

export function scatterTrees(seed: number, count: number, excludeRadius: number): THREE.Group {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d2e });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d7a3a });

  for (let i = 0; i < count; i++) {
    const a = ((seed + i * 137) % 360) * (Math.PI / 180);
    const r = excludeRadius + 8 + ((seed + i * 53) % 40);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.abs(x) < excludeRadius && Math.abs(z) < excludeRadius) continue;

    const y = terrainHeight(x, z, seed);
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 1.6, 6), trunkMat);
    trunk.position.y = 0.8;
    trunk.castShadow = true;
    tree.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.9 + (i % 3) * 0.15, 8, 8), leafMat);
    crown.position.y = 2.1;
    crown.castShadow = true;
    tree.add(crown);
    tree.position.set(x, y, z);
    g.add(tree);
  }
  return g;
}

export function buildSkyDome(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(200, 32, 16);
  const mat = new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide });
  return new THREE.Mesh(geo, mat);
}

export function skyColorForHour(hour: number): number {
  if (hour >= 6 && hour < 8) return 0xffb88a;
  if (hour >= 8 && hour < 17) return 0x87ceeb;
  if (hour >= 17 && hour < 20) return 0xff8866;
  return 0x0a1628;
}

export function sunPositionForHour(hour: number): THREE.Vector3 {
  const t = ((hour - 6) / 12) * Math.PI;
  const y = Math.max(0.15, Math.sin(t)) * 40;
  const x = Math.cos(t) * 35;
  return new THREE.Vector3(x, y, 20);
}
