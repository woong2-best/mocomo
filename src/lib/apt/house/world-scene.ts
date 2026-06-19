"use client";

import * as THREE from "three";
import type { BuildPiece, BuildTool, HouseBuildState, HouseWorldMode } from "@/lib/apt/house/build-types";
import { GRID_UNIT, PLOT_HALF_DEFAULT } from "@/lib/apt/house/build-types";
import { createPieceMesh, disposeObject3D } from "@/lib/apt/house/build-meshes";
import {
  buildNeighborHouses,
  buildRoadNetwork,
  buildSkyDome,
  buildTerrain,
  scatterTrees,
  skyColorForHour,
  sunPositionForHour,
  terrainHeight,
} from "@/lib/apt/house/procedural-world";

export type HouseWorldCallbacks = {
  onBuildChange?: (state: HouseBuildState) => void;
  onModeChange?: (mode: HouseWorldMode) => void;
};

function snapGrid(v: number) {
  return Math.round(v / GRID_UNIT);
}

export class HouseWorldScene {
  private mount: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh;
  private buildRoot = new THREE.Group();
  private plotMarker: THREE.Mesh;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private terrain: THREE.Mesh;
  private raf = 0;
  private disposed = false;
  private clock = new THREE.Clock();

  private state: HouseBuildState;
  private tool: BuildTool = "wall";
  private mode: HouseWorldMode = "explore";
  private rot: 0 | 1 | 2 | 3 = 0;
  private callbacks: HouseWorldCallbacks = {};

  private keys = new Set<string>();
  private camYaw = 0.8;
  private camPitch = 0.55;
  private camDist = 22;
  private camTarget = new THREE.Vector3(0, 1, 0);

  private car = new THREE.Group();
  private carSpeed = 0;
  private carSteer = 0;
  private carAngle = 0;
  private pedestrians: { mesh: THREE.Group; x: number; z: number; a: number; s: number }[] = [];

  constructor(mount: HTMLElement, initial: HouseBuildState) {
    this.mount = mount;
    this.state = { ...initial, pieces: [...initial.pieces] };

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(skyColorForHour(initial.timeOfDay), 40, 120);

    const w = Math.max(mount.clientWidth, 320);
    const h = Math.max(mount.clientHeight, 400);
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 250);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(this.renderer.domElement);

    this.sky = buildSkyDome();
    this.scene.add(this.sky);

    this.scene.add(new THREE.AmbientLight(0xfff8f0, 0.35));
    this.sun = new THREE.DirectionalLight(0xfff4e0, 1.15);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 80;
    this.sun.shadow.camera.left = -40;
    this.sun.shadow.camera.right = 40;
    this.sun.shadow.camera.top = 40;
    this.sun.shadow.camera.bottom = -40;
    this.scene.add(this.sun);

    this.terrain = buildTerrain(this.state.worldSeed);
    this.scene.add(this.terrain);
    this.scene.add(buildRoadNetwork(this.state.worldSeed));
    this.scene.add(buildNeighborHouses(this.state.worldSeed, this.state.plotHalf));
    this.scene.add(scatterTrees(this.state.worldSeed, 48, this.state.plotHalf + 4));

    const plotGeo = new THREE.PlaneGeometry(this.state.plotHalf * 2, this.state.plotHalf * 2);
    plotGeo.rotateX(-Math.PI / 2);
    this.plotMarker = new THREE.Mesh(
      plotGeo,
      new THREE.MeshBasicMaterial({ color: 0xf4a261, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
    );
    this.plotMarker.position.y = terrainHeight(0, 0, this.state.worldSeed) + 0.12;
    this.scene.add(this.plotMarker);

    const border = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(this.state.plotHalf * 2, 0.1, this.state.plotHalf * 2)),
      new THREE.LineBasicMaterial({ color: 0xe85d4a })
    );
    border.position.y = this.plotMarker.position.y + 0.05;
    this.scene.add(border);

    this.scene.add(this.buildRoot);
    this.rebuildPieces();
    this.spawnCar();
    this.spawnPedestrians();
    this.applyTimeOfDay(initial.timeOfDay);

    const canvas = this.renderer.domElement;
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("resize", this.onResize);

    this.updateCamera();
    this.loop();
  }

  setCallbacks(cb: HouseWorldCallbacks) {
    this.callbacks = cb;
  }

  setTool(tool: BuildTool) {
    this.tool = tool;
    if (tool !== "erase") this.mode = "build";
  }

  setMode(mode: HouseWorldMode) {
    this.mode = mode;
    this.callbacks.onModeChange?.(mode);
  }

  getMode() {
    return this.mode;
  }

  getState() {
    return this.state;
  }

  rotatePiece() {
    this.rot = ((this.rot + 1) % 4) as 0 | 1 | 2 | 3;
  }

  loadBuild(state: HouseBuildState) {
    this.state = { ...state, pieces: [...state.pieces] };
    this.rebuildPieces();
    this.applyTimeOfDay(state.timeOfDay);
  }

  private spawnCar() {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.7, 3.6),
      new THREE.MeshStandardMaterial({ color: 0x2a4a7a, metalness: 0.4, roughness: 0.5 })
    );
    body.position.y = 0.85;
    body.castShadow = true;
    this.car.add(body);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.55, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x1a3050, metalness: 0.3, roughness: 0.4 })
    );
    cabin.position.set(0, 1.35, -0.2);
    this.car.add(cabin);

    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    for (const [wx, wz] of [
      [-0.85, 1.2],
      [0.85, 1.2],
      [-0.85, -1.2],
      [0.85, -1.2],
    ]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.22, 12), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.35, wz);
      this.car.add(wheel);
    }

    const headlight = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.2, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffaa, emissiveIntensity: 0.8 })
    );
    headlight.position.set(0, 0.75, 1.85);
    this.car.add(headlight);

    this.car.position.set(-6, terrainHeight(-6, 8, this.state.worldSeed), 8);
    this.carAngle = -Math.PI / 2;
    this.car.rotation.y = this.carAngle;
    this.scene.add(this.car);
  }

  private spawnPedestrians() {
    for (let i = 0; i < 6; i++) {
      const ped = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.25, 0.9, 4, 8),
        new THREE.MeshStandardMaterial({ color: [0x4466aa, 0xaa5544, 0x55aa66, 0x8844aa][i % 4] })
      );
      body.position.y = 0.95;
      body.castShadow = true;
      ped.add(body);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffd8b8 })
      );
      head.position.y = 1.65;
      ped.add(head);

      const angle = (i / 6) * Math.PI * 2;
      const r = 14 + i * 2;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      ped.position.set(x, terrainHeight(x, z, this.state.worldSeed), z);
      this.scene.add(ped);
      this.pedestrians.push({ mesh: ped, x, z, a: angle, s: 0.6 + (i % 3) * 0.2 });
    }
  }

  private updatePedestrians(dt: number) {
    for (const p of this.pedestrians) {
      p.a += dt * p.s * 0.15;
      p.x += Math.cos(p.a) * dt * p.s;
      p.z += Math.sin(p.a) * dt * p.s;
      p.mesh.position.x = p.x;
      p.mesh.position.z = p.z;
      p.mesh.position.y = terrainHeight(p.x, p.z, this.state.worldSeed);
      p.mesh.rotation.y = -p.a;
    }
  }

  private rebuildPieces() {
    while (this.buildRoot.children.length) {
      const c = this.buildRoot.children[0];
      this.buildRoot.remove(c);
      disposeObject3D(c);
    }
    for (const p of this.state.pieces) {
      this.buildRoot.add(createPieceMesh(p, this.state.plotHalf));
    }
  }

  private applyTimeOfDay(hour: number) {
    this.state.timeOfDay = hour;
    const sky = skyColorForHour(hour);
    this.scene.background = new THREE.Color(sky);
    (this.scene.fog as THREE.Fog).color.setHex(sky);
    (this.sky.material as THREE.MeshBasicMaterial).color.setHex(sky);
    const sunPos = sunPositionForHour(hour);
    this.sun.position.copy(sunPos);
    this.sun.intensity = hour >= 6 && hour < 20 ? 1.15 : 0.15;
    this.sun.color.setHex(hour >= 6 && hour < 20 ? 0xfff4e0 : 0x6688cc);
  }

  private inPlot(gx: number, gz: number) {
    const half = Math.floor(this.state.plotHalf);
    return Math.abs(gx) <= half && Math.abs(gz) <= half;
  }

  private pickGround(e: PointerEvent): { gx: number; gz: number; y: number } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.terrain);
    if (!hits.length) return null;
    const p = hits[0].point;
    return { gx: snapGrid(p.x), gz: snapGrid(p.z), y: p.y };
  }

  private onPointerDown = (e: PointerEvent) => {
    if (this.mode !== "build" || e.button !== 0) return;
    const hit = this.pickGround(e);
    if (!hit || !this.inPlot(hit.gx, hit.gz)) return;

    if (this.tool === "erase") {
      const idx = this.state.pieces.findIndex((p) => p.gx === hit.gx && p.gz === hit.gz);
      if (idx >= 0) {
        this.state.pieces.splice(idx, 1);
        this.rebuildPieces();
        this.callbacks.onBuildChange?.(this.state);
      }
      return;
    }

    const existing = this.state.pieces.findIndex((p) => p.gx === hit.gx && p.gz === hit.gz);
    const piece: BuildPiece = {
      id: `p-${Date.now()}`,
      kind: this.tool,
      gx: hit.gx,
      gz: hit.gz,
      gy: 0,
      rot: this.rot,
    };
    if (existing >= 0) this.state.pieces[existing] = piece;
    else this.state.pieces.push(piece);
    this.rebuildPieces();
    this.callbacks.onBuildChange?.(this.state);
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.camDist = Math.max(8, Math.min(45, this.camDist + e.deltaY * 0.02));
  };

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.key.toLowerCase());
    if (e.key === "r" || e.key === "R") this.rotatePiece();
    if (e.key === "Tab") {
      e.preventDefault();
      const next: HouseWorldMode =
        this.mode === "explore" ? "build" : this.mode === "build" ? "drive" : "explore";
      this.setMode(next);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  private updateCamera() {
    if (this.mode === "drive") {
      const behind = new THREE.Vector3(
        this.car.position.x - Math.sin(this.carAngle) * 7,
        this.car.position.y + 4,
        this.car.position.z - Math.cos(this.carAngle) * 7
      );
      this.camera.position.lerp(behind, 0.12);
      this.camera.lookAt(this.car.position.x, this.car.position.y + 1, this.car.position.z);
      return;
    }

    if (this.mode === "explore") {
      const pan = 0.15;
      if (this.keys.has("w")) this.camTarget.z -= pan;
      if (this.keys.has("s")) this.camTarget.z += pan;
      if (this.keys.has("a")) this.camTarget.x -= pan;
      if (this.keys.has("d")) this.camTarget.x += pan;
      if (this.keys.has("q")) this.camYaw -= 0.03;
      if (this.keys.has("e")) this.camYaw += 0.03;
    }

    const x = this.camTarget.x + Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.camDist;
    const y = this.camTarget.y + Math.sin(this.camPitch) * this.camDist;
    const z = this.camTarget.z + Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.camDist;
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.camTarget);
  }

  private updateCar(dt: number) {
    if (this.mode !== "drive") return;
    const accel = this.keys.has("w") ? 1 : this.keys.has("s") ? -0.6 : 0;
    const steerInput = (this.keys.has("a") ? 1 : 0) - (this.keys.has("d") ? 1 : 0);
    this.carSpeed += accel * dt * 8;
    this.carSpeed *= 0.96;
    if (Math.abs(this.carSpeed) > 0.05) {
      this.carSteer = steerInput * 1.8 * Math.sign(this.carSpeed);
      this.carAngle += this.carSteer * dt;
    }
    this.car.position.x += Math.sin(this.carAngle) * this.carSpeed * dt;
    this.car.position.z += Math.cos(this.carAngle) * this.carSpeed * dt;
    this.car.position.y = terrainHeight(this.car.position.x, this.car.position.z, this.state.worldSeed) + 0.05;
    this.car.rotation.y = this.carAngle;
  }

  private tickTime(dt: number) {
    this.state.timeOfDay = (this.state.timeOfDay + dt * 0.4) % 24;
    this.applyTimeOfDay(this.state.timeOfDay);
  }

  private onResize = () => {
    const w = this.mount.clientWidth;
    const h = this.mount.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.updateCar(dt);
    this.updatePedestrians(dt);
    this.updateCamera();
    this.tickTime(dt);
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener("pointerdown", this.onPointerDown);
    canvas.removeEventListener("wheel", this.onWheel);
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m.dispose());
      }
    });
    this.renderer.dispose();
    canvas.remove();
  }
}

export { PLOT_HALF_DEFAULT };
