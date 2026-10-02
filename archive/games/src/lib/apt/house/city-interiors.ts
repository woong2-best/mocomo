import * as THREE from "three";
import type { CityBuildingType } from "@/lib/apt/house/city-building-types";

const mat = (c: number, o?: Partial<THREE.MeshStandardMaterialParameters>) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.82, metalness: 0.06, ...o });

export function buildCityInterior(type: CityBuildingType, label: string, floorY: number): THREE.Group {
  const root = new THREE.Group();
  root.name = "city-interior";
  const w = 10;
  const d = 8;
  const h = 3.2;

  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), mat(0xc8b8a0));
  floor.position.set(0, floorY, 0);
  floor.receiveShadow = true;
  root.add(floor);

  const wallMat = mat(0xf2ece4);
  const walls: [number, number, number, number, number, number][] = [
    [w, h, 0.15, 0, floorY + h / 2, -d / 2],
    [w, h, 0.15, 0, floorY + h / 2, d / 2],
    [0.15, h, d, -w / 2, floorY + h / 2, 0],
    [0.15, h, d, w / 2, floorY + h / 2, 0],
  ];
  for (const [ww, hh, dd, x, y, z] of walls) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, dd), wallMat);
    wall.position.set(x, y, z);
    wall.castShadow = true;
    root.add(wall);
  }

  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), mat(0xfaf8f4));
  ceiling.position.set(0, floorY + h, 0);
  root.add(ceiling);

  root.add(new THREE.AmbientLight(0xfff8f0, 0.6));
  const light = new THREE.PointLight(0xfff0d8, 1.4, 18);
  light.position.set(0, floorY + h - 0.4, 0);
  root.add(light);

  const exitDoor = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.12), mat(0x5c4030));
  exitDoor.position.set(0, floorY + 1.1, d / 2 - 0.05);
  exitDoor.userData.isCityExit = true;
  root.add(exitDoor);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 0.5, 0.08),
    mat(0xe85d4a, { emissive: 0x441100, emissiveIntensity: 0.15 })
  );
  sign.position.set(0, floorY + h - 0.35, -d / 2 + 0.1);
  root.add(sign);

  if (type === "shop") {
    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1, 0.7), mat(0x6a5040));
    counter.position.set(-2, floorY + 0.55, -1);
    root.add(counter);
    for (let i = 0; i < 4; i++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 0.4), mat(0x8a7a68));
      shelf.position.set(2.5, floorY + 1, -2.5 + i * 1.2);
      root.add(shelf);
      const goods = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.25), mat([0xe85d4a, 0x4a7ae8, 0x4ae88a, 0xe8c84a][i]));
      goods.position.set(2.5, floorY + 1.6, -2.5 + i * 1.2);
      root.add(goods);
    }
  } else if (type === "cafe") {
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4, 1.1, 0.8), mat(0x4a3020));
    counter.position.set(-2.5, floorY + 0.6, 0);
    root.add(counter);
    const machine = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.5), mat(0x333333, { metalness: 0.5 }));
    machine.position.set(-3.5, floorY + 1.1, 0);
    root.add(machine);
    for (let i = 0; i < 3; i++) {
      const table = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 1.1), mat(0x7a5a3a));
      table.position.set(1 + (i % 2) * 2, floorY + 0.75, -1.5 + Math.floor(i / 2) * 2);
      root.add(table);
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.45), mat(0x5a4a3a));
      chair.position.set(1 + (i % 2) * 2, floorY + 0.4, -0.8 + Math.floor(i / 2) * 2);
      root.add(chair);
    }
  } else if (type === "office") {
    for (let i = 0; i < 4; i++) {
      const desk = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.75, 0.7), mat(0x9a9aa8));
      desk.position.set(-2.5 + (i % 2) * 3, floorY + 0.4, -2 + Math.floor(i / 2) * 2.5);
      root.add(desk);
      const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.06), mat(0x1a1a2a, { emissive: 0x223355, emissiveIntensity: 0.3 }));
      monitor.position.set(-2.5 + (i % 2) * 3, floorY + 0.95, -2 + Math.floor(i / 2) * 2.5);
      root.add(monitor);
    }
    const meeting = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 1.2), mat(0x6a5a4a));
    meeting.position.set(2, floorY + 0.75, 1.5);
    root.add(meeting);
  } else if (type === "residential") {
    const mail = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.2, 0.35), mat(0x888888, { metalness: 0.4 }));
    mail.position.set(-3, floorY + 0.7, -2);
    root.add(mail);
    const sofa = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.8), mat(0x6a5a8a));
    sofa.position.set(2, floorY + 0.35, 1);
    root.add(sofa);
    const elevator = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 1.2), mat(0xb0b0b8, { metalness: 0.35 }));
    elevator.position.set(3.5, floorY + 1.3, -2);
    root.add(elevator);
  } else {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 2.8), mat(0xf0f0f8));
    bed.position.set(-2, floorY + 0.35, 0);
    root.add(bed);
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.75, 0.6), mat(0xf5f5f5));
    desk.position.set(2.5, floorY + 0.4, -1);
    root.add(desk);
  }

  root.userData.floorY = floorY;
  root.userData.interiorW = w;
  root.userData.interiorD = d;
  root.userData.label = label;
  return root;
}

export function disposeCityInterior(g: THREE.Group) {
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => m.dispose());
    }
  });
}
