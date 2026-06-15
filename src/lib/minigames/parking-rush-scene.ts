"use client";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { CarState, Obstacle, ParkingLevel, ParkingSpot, VehicleTypeId } from "./parking-rush-logic";
import { VEHICLE_SPECS } from "./parking-rush-logic";

export type SceneCar = {
  userId: string;
  car: CarState;
  vehicleId: VehicleTypeId;
  isLocal: boolean;
  parked?: boolean;
  spotId?: string;
};

function worldX(x: number) {
  return x;
}
function worldZ(y: number) {
  return y;
}

function lowPolyCar(spec: (typeof VEHICLE_SPECS)[VehicleTypeId], color: string): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(spec.length, 0.9, spec.width),
    new THREE.MeshLambertMaterial({ color })
  );
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(spec.length * 0.55, 0.55, spec.width * 0.85),
    new THREE.MeshLambertMaterial({ color: "#1e293b" })
  );
  cabin.position.set(spec.length * 0.05, 1.05, 0);
  cabin.castShadow = true;
  g.add(cabin);

  const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 8);
  const wheelMat = new THREE.MeshLambertMaterial({ color: "#0f172a" });
  const wx = spec.wheelbase / 2;
  const wz = spec.width / 2 - 0.15;
  for (const [x, z] of [
    [wx, wz],
    [wx, -wz],
    [-wx, wz],
    [-wx, -wz],
  ] as const) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.28, z);
    g.add(w);
  }

  const lightMat = new THREE.MeshBasicMaterial({ color: "#fef08a" });
  const tailMat = new THREE.MeshBasicMaterial({ color: "#ef4444" });
  const headL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.2), lightMat);
  headL.position.set(spec.length / 2 - 0.05, 0.45, spec.width / 2 - 0.35);
  const headR = headL.clone();
  headR.position.z = -spec.width / 2 + 0.35;
  const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.18), tailMat);
  tailL.position.set(-spec.length / 2 + 0.05, 0.45, spec.width / 2 - 0.35);
  const tailR = tailL.clone();
  tailR.position.z = -spec.width / 2 + 0.35;
  g.add(headL, headR, tailL, tailR);

  return g;
}

function addObstacleMesh(parent: THREE.Group, o: Obstacle) {
  let mesh: THREE.Mesh;
  const h = o.kind === "fence" ? 0.8 : o.kind === "cone" ? 0.7 : o.kind === "pillar" ? 2.5 : 1.2;
  const color = o.color ?? "#64748b";
  if (o.kind === "cone") {
    mesh = new THREE.Mesh(new THREE.ConeGeometry(o.w, h, 6), new THREE.MeshLambertMaterial({ color }));
  } else {
    mesh = new THREE.Mesh(
      new THREE.BoxGeometry(o.w, h, o.h),
      new THREE.MeshLambertMaterial({ color })
    );
  }
  mesh.position.set(worldX(o.x), h / 2, worldZ(o.y));
  mesh.rotation.y = o.angle ?? 0;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
}

function addSpotMesh(parent: THREE.Group, spot: ParkingSpot, highlight: boolean) {
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(spot.w, spot.h),
    new THREE.MeshBasicMaterial({
      color: highlight ? "#4ade80" : "#334155",
      transparent: true,
      opacity: highlight ? 0.45 : 0.25,
      side: THREE.DoubleSide,
    })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.rotation.z = spot.angle;
  plane.position.set(worldX(spot.x), 0.02, worldZ(spot.y));
  parent.add(plane);

  const line = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(spot.w, spot.h)),
    new THREE.LineBasicMaterial({ color: highlight ? "#86efac" : "#64748b" })
  );
  line.rotation.x = -Math.PI / 2;
  line.rotation.z = spot.angle;
  line.position.set(worldX(spot.x), 0.03, worldZ(spot.y));
  parent.add(line);
}

export class ParkingRushScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private mount: HTMLElement;
  private raf = 0;
  private carMeshes = new Map<string, THREE.Group>();
  private levelGroup = new THREE.Group();
  private carsGroup = new THREE.Group();
  private localUserId: string | null = null;
  private cameraOffset = new THREE.Vector3(0, 6, 10);
  private zoom = 1;

  constructor(mount: HTMLElement) {
    this.mount = mount;
    const w = mount.clientWidth || 640;
    const h = mount.clientHeight || 480;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    mount.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#0f172a");
    this.scene.fog = new THREE.Fog("#0f172a", 35, 90);

    this.camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 200);
    this.camera.position.set(21, 18, 48);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 45;

    const amb = new THREE.AmbientLight(0xffffff, 0.55);
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(20, 40, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    this.scene.add(amb, sun);

    this.scene.add(this.levelGroup, this.carsGroup);
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
    window.addEventListener("resize", this.onResize);
  }

  loadLevel(level: ParkingLevel, localSpotId?: string) {
    while (this.levelGroup.children.length) this.levelGroup.remove(this.levelGroup.children[0]!);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(level.bounds.w, level.bounds.h),
      new THREE.MeshLambertMaterial({ color: level.groundColor })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(level.bounds.w / 2, 0, level.bounds.h / 2);
    ground.receiveShadow = true;
    this.levelGroup.add(ground);

    const grid = new THREE.GridHelper(Math.max(level.bounds.w, level.bounds.h), 20, level.accentColor, "#1e293b");
    grid.position.set(level.bounds.w / 2, 0.01, level.bounds.h / 2);
    this.levelGroup.add(grid);

    for (const w of level.walls) addObstacleMesh(this.levelGroup, w);
    for (const o of level.obstacles) addObstacleMesh(this.levelGroup, o);
    for (const s of level.parkingSpots) addSpotMesh(this.levelGroup, s, s.id === localSpotId);

    const sky = new THREE.Mesh(
      new THREE.BoxGeometry(level.bounds.w + 10, 8, 1),
      new THREE.MeshLambertMaterial({ color: "#475569" })
    );
    sky.position.set(level.bounds.w / 2, 4, -1);
    this.levelGroup.add(sky);
  }

  setLocalUser(userId: string | null) {
    this.localUserId = userId;
  }

  setZoom(delta: number) {
    this.zoom = Math.max(0.6, Math.min(1.6, this.zoom + delta));
  }

  updateCars(cars: SceneCar[]) {
    const seen = new Set<string>();
    for (const c of cars) {
      seen.add(c.userId);
      let mesh = this.carMeshes.get(c.userId);
      const spec = VEHICLE_SPECS[c.vehicleId];
      const color = c.isLocal ? spec.color : "#94a3b8";
      if (!mesh) {
        mesh = lowPolyCar(spec, color);
        this.carMeshes.set(c.userId, mesh);
        this.carsGroup.add(mesh);
      }
      mesh.position.set(worldX(c.car.x), 0, worldZ(c.car.y));
      mesh.rotation.y = -c.car.angle + Math.PI / 2;

      if (c.isLocal) {
        const target = new THREE.Vector3(worldX(c.car.x), 0, worldZ(c.car.y));
        const off = this.cameraOffset.clone().multiplyScalar(this.zoom);
        off.applyAxisAngle(new THREE.Vector3(0, 1, 0), -c.car.angle + Math.PI / 2);
        const camPos = target.clone().add(off);
        this.camera.position.lerp(camPos, 0.12);
        this.controls.target.lerp(target, 0.15);
      }
    }
    for (const [id, mesh] of this.carMeshes) {
      if (!seen.has(id)) {
        this.carsGroup.remove(mesh);
        this.carMeshes.delete(id);
      }
    }
  }

  private onResize = () => {
    const w = this.mount.clientWidth;
    const h = this.mount.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private loop() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.loop);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
