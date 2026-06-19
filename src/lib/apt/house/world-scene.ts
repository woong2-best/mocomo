"use client";

import * as THREE from "three";
import type { BuildPiece, BuildTool, HouseBuildState, HouseWorldMode, OutdoorActivity } from "@/lib/apt/house/build-types";
import { canEnterInterior, GRID_UNIT, PLOT_HALF_DEFAULT } from "@/lib/apt/house/build-types";
import { buildEnterableCity } from "@/lib/apt/house/city-buildings";
import type { CityBuildingMeta } from "@/lib/apt/house/city-building-types";
import { buildCityInterior, disposeCityInterior } from "@/lib/apt/house/city-interiors";
import { createPieceMesh, disposeObject3D } from "@/lib/apt/house/build-meshes";
import { buildInteriorScene, disposeInterior, type InteriorBounds } from "@/lib/apt/house/interior-scene";
import { OutdoorAvatarController } from "@/lib/apt/house/outdoor-avatar";
import { RemotePlayersLayer, type RemoteWorldPlayer } from "@/lib/apt/house/remote-players-layer";
import {
  buildNeighborHouses,
  buildRoadNetwork,
  buildSidewalks,
  buildSkyDome,
  buildStreetLamps,
  buildTerrain,
  scatterTrees,
  skyColorForHour,
  sunPositionForHour,
  terrainHeight,
} from "@/lib/apt/house/procedural-world";

export type HouseWorldInit = {
  state: HouseBuildState;
  vrmUrl?: string;
  readOnly?: boolean;
  visitLabel?: string;
};

export type HouseWorldCallbacks = {
  onBuildChange?: (state: HouseBuildState) => void;
  onModeChange?: (mode: HouseWorldMode) => void;
  onActivityChange?: (activity: OutdoorActivity) => void;
  onInteriorChange?: (inside: boolean) => void;
  onPositionChange?: (pos: { x: number; z: number; mode: HouseWorldMode; activity: OutdoorActivity }) => void;
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
  private outdoorRoot = new THREE.Group();
  private buildRoot = new THREE.Group();
  private cityRoot = new THREE.Group();
  private interiorRoot: THREE.Group | null = null;
  private cityInteriorRoot: THREE.Group | null = null;
  private plotMarker: THREE.Mesh;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private terrain: THREE.Mesh;
  private raf = 0;
  private disposed = false;
  private clock = new THREE.Clock();
  private readOnly: boolean;
  private visitLabel?: string;

  private state: HouseBuildState;
  private tool: BuildTool = "wall";
  private mode: HouseWorldMode = "explore";
  private rot: 0 | 1 | 2 | 3 = 0;
  private callbacks: HouseWorldCallbacks = {};
  private interiorBounds: InteriorBounds | null = null;
  private interiorCam = { x: 0, z: 0, yaw: 0 };
  private cityBuildings: CityBuildingMeta[] = [];
  private activeCityBuilding: CityBuildingMeta | null = null;
  private cityInteriorCam = { x: 0, z: 0, yaw: 0 };

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
  private avatar: OutdoorAvatarController | null = null;
  private remotePlayers: RemotePlayersLayer;
  private emitPosTimer = 0;

  constructor(mount: HTMLElement, init: HouseWorldInit) {
    this.mount = mount;
    this.state = { ...init.state, pieces: [...init.state.pieces] };
    this.readOnly = !!init.readOnly;
    this.visitLabel = init.visitLabel;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(skyColorForHour(init.state.timeOfDay), 40, 150);

    const w = Math.max(mount.clientWidth, 320);
    const h = Math.max(mount.clientHeight, 400);
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 300);

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
    this.sun.shadow.camera.far = 95;
    this.sun.shadow.camera.left = -55;
    this.sun.shadow.camera.right = 55;
    this.sun.shadow.camera.top = 55;
    this.sun.shadow.camera.bottom = -55;
    this.scene.add(this.sun);

    const seed = this.state.worldSeed;
    this.terrain = buildTerrain(seed);
    this.outdoorRoot.add(this.terrain);
    this.outdoorRoot.add(buildRoadNetwork(seed));
    this.outdoorRoot.add(buildSidewalks(seed));

    const city = buildEnterableCity(seed, this.state.plotHalf);
    this.cityBuildings = city.buildings;
    this.cityRoot.add(city.group);
    this.outdoorRoot.add(this.cityRoot);

    this.outdoorRoot.add(buildNeighborHouses(seed, this.state.plotHalf));
    this.outdoorRoot.add(buildStreetLamps(seed));
    this.outdoorRoot.add(scatterTrees(seed, 72, this.state.plotHalf + 4));
    this.scene.add(this.outdoorRoot);

    this.remotePlayers = new RemotePlayersLayer(this.outdoorRoot);

    const plotGeo = new THREE.PlaneGeometry(this.state.plotHalf * 2, this.state.plotHalf * 2);
    plotGeo.rotateX(-Math.PI / 2);
    this.plotMarker = new THREE.Mesh(
      plotGeo,
      new THREE.MeshBasicMaterial({
        color: this.readOnly ? 0x4a7ae8 : 0xf4a261,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
      })
    );
    this.plotMarker.position.y = terrainHeight(0, 0, seed) + 0.12;
    this.outdoorRoot.add(this.plotMarker);

    this.outdoorRoot.add(this.buildRoot);
    this.rebuildPieces();
    this.spawnCar();
    this.spawnPedestrians();
    this.applyTimeOfDay(init.state.timeOfDay);

    if (init.vrmUrl && !this.readOnly) {
      this.avatar = new OutdoorAvatarController(init.vrmUrl, seed, this.state.plotHalf);
      void this.avatar.load().then(() => {
        if (!this.disposed && this.avatar) this.outdoorRoot.add(this.avatar.root);
      });
    }

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
    if (this.readOnly) return;
    this.tool = tool;
    if (tool !== "erase") this.setMode("build");
  }

  setMode(mode: HouseWorldMode) {
    if (mode === "build" && this.readOnly) return;
    if (mode === "interior" && !canEnterInterior(this.state.pieces)) return;
    if (mode === "interior") this.enterHomeInterior();
    else if (mode === "city_interior") return;
    else if (this.mode === "interior" || this.mode === "city_interior") this.exitAllInteriors();
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
    if (this.readOnly) return;
    this.rot = ((this.rot + 1) % 4) as 0 | 1 | 2 | 3;
  }

  syncRemotePlayers(players: RemoteWorldPlayer[]) {
    this.remotePlayers.sync(players, (x, z) => terrainHeight(x, z, this.state.worldSeed));
  }

  loadVisitBuild(state: HouseBuildState, label: string) {
    this.state = { ...state, pieces: [...state.pieces] };
    this.visitLabel = label;
    this.readOnly = true;
    this.rebuildPieces();
    (this.plotMarker.material as THREE.MeshBasicMaterial).color.setHex(0x4a7ae8);
  }

  private enterHomeInterior() {
    if (this.interiorRoot) return;
    const groundY = terrainHeight(0, 0, this.state.worldSeed);
    this.interiorRoot = buildInteriorScene(this.state.pieces, groundY);
    this.interiorBounds = this.interiorRoot.userData.bounds as InteriorBounds;
    this.scene.add(this.interiorRoot);
    this.outdoorRoot.visible = false;
    this.interiorCam.x = this.interiorBounds.centerX;
    this.interiorCam.z = this.interiorBounds.centerZ;
    this.mode = "interior";
    this.callbacks.onInteriorChange?.(true);
    this.callbacks.onModeChange?.("interior");
  }

  private enterCityInterior(meta: CityBuildingMeta) {
    this.exitAllInteriors();
    const groundY = terrainHeight(meta.x, meta.z, this.state.worldSeed) + 0.1;
    this.cityInteriorRoot = buildCityInterior(meta.type, meta.label, groundY);
    this.activeCityBuilding = meta;
    this.scene.add(this.cityInteriorRoot);
    this.outdoorRoot.visible = false;
    this.cityInteriorCam.x = 0;
    this.cityInteriorCam.z = 0;
    this.mode = "city_interior";
    this.callbacks.onInteriorChange?.(true);
    this.callbacks.onModeChange?.("city_interior");
  }

  private exitAllInteriors() {
    if (this.interiorRoot) {
      this.scene.remove(this.interiorRoot);
      disposeInterior(this.interiorRoot);
      this.interiorRoot = null;
      this.interiorBounds = null;
    }
    if (this.cityInteriorRoot) {
      this.scene.remove(this.cityInteriorRoot);
      disposeCityInterior(this.cityInteriorRoot);
      this.cityInteriorRoot = null;
      this.activeCityBuilding = null;
    }
    this.outdoorRoot.visible = true;
    this.callbacks.onInteriorChange?.(false);
  }

  private spawnCar() {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.7, 3.6),
      new THREE.MeshStandardMaterial({ color: 0x2a4a7a, metalness: 0.4, roughness: 0.5 })
    );
    body.position.y = 0.85;
    body.castShadow = true;
    this.car.add(body);
    this.car.position.set(-6, terrainHeight(-6, 8, this.state.worldSeed), 8);
    this.carAngle = -Math.PI / 2;
    this.car.rotation.y = this.carAngle;
    this.outdoorRoot.add(this.car);
  }

  private spawnPedestrians() {
    for (let i = 0; i < 12; i++) {
      const ped = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.25, 0.9, 4, 8),
        new THREE.MeshStandardMaterial({ color: [0x4466aa, 0xaa5544, 0x55aa66][i % 3] })
      );
      body.position.y = 0.95;
      body.castShadow = true;
      ped.add(body);
      const angle = (i / 12) * Math.PI * 2;
      const r = 18 + i;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      ped.position.set(x, terrainHeight(x, z, this.state.worldSeed), z);
      this.outdoorRoot.add(ped);
      this.pedestrians.push({ mesh: ped, x, z, a: angle, s: 0.5 + (i % 3) * 0.12 });
    }
  }

  private updatePedestrians(dt: number) {
    for (const p of this.pedestrians) {
      p.a += dt * p.s * 0.1;
      p.x += Math.cos(p.a) * dt * p.s;
      p.z += Math.sin(p.a) * dt * p.s;
      p.mesh.position.set(p.x, terrainHeight(p.x, p.z, this.state.worldSeed), p.z);
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
    this.sun.position.copy(sunPositionForHour(hour));
    this.sun.intensity = hour >= 6 && hour < 20 ? 1.15 : 0.15;
  }

  private inPlot(gx: number, gz: number) {
    const half = Math.floor(this.state.plotHalf);
    return Math.abs(gx) <= half && Math.abs(gz) <= half;
  }

  private setPointer(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  private findCityBuilding(id: string) {
    return this.cityBuildings.find((b) => b.id === id) ?? null;
  }

  private onPointerDown = (e: PointerEvent) => {
    this.setPointer(e);

    if (this.mode === "city_interior") {
      const hits = this.raycaster.intersectObjects(this.cityInteriorRoot?.children ?? [], true);
      for (const h of hits) {
        let o: THREE.Object3D | null = h.object;
        while (o) {
          if (o.userData.isCityExit) {
            this.exitAllInteriors();
            this.mode = "explore";
            this.callbacks.onModeChange?.("explore");
            return;
          }
          o = o.parent;
        }
      }
      return;
    }

    if (this.mode === "build" && !this.readOnly && e.button === 0) {
      const hits = this.raycaster.intersectObject(this.terrain);
      if (!hits.length) return;
      const p = hits[0].point;
      const gx = snapGrid(p.x);
      const gz = snapGrid(p.z);
      if (!this.inPlot(gx, gz)) return;
      if (this.tool === "erase") {
        const idx = this.state.pieces.findIndex((x) => x.gx === gx && x.gz === gz);
        if (idx >= 0) {
          this.state.pieces.splice(idx, 1);
          this.rebuildPieces();
          this.callbacks.onBuildChange?.(this.state);
        }
        return;
      }
      const existing = this.state.pieces.findIndex((x) => x.gx === gx && x.gz === gz);
      const piece: BuildPiece = { id: `p-${Date.now()}`, kind: this.tool, gx, gz, gy: 0, rot: this.rot };
      if (existing >= 0) this.state.pieces[existing] = piece;
      else this.state.pieces.push(piece);
      this.rebuildPieces();
      this.callbacks.onBuildChange?.(this.state);
      return;
    }

    if (this.mode === "explore" || this.mode === "avatar") {
      const targets = [...this.buildRoot.children, ...this.cityRoot.children];
      const hits = this.raycaster.intersectObjects(targets, true);
      for (const h of hits) {
        let o: THREE.Object3D | null = h.object;
        while (o) {
          if (o.userData.isCityDoor && o.userData.cityBuildingId) {
            const meta = this.findCityBuilding(o.userData.cityBuildingId as string);
            if (meta) this.enterCityInterior(meta);
            return;
          }
          if (o.userData.isDoor && canEnterInterior(this.state.pieces)) {
            this.enterHomeInterior();
            return;
          }
          o = o.parent;
        }
      }
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.camDist = Math.max(8, Math.min(48, this.camDist + e.deltaY * 0.02));
  };

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.key.toLowerCase());
    if (e.key === "r" || e.key === "R") this.rotatePiece();
    if (e.key === "e" || e.key === "E") {
      if (this.mode === "interior" || this.mode === "city_interior") {
        this.exitAllInteriors();
        this.mode = "explore";
        this.callbacks.onModeChange?.("explore");
      } else if (canEnterInterior(this.state.pieces)) {
        this.enterHomeInterior();
      }
    }
    if (e.key === "f" || e.key === "F") {
      if (this.mode === "interior" || this.mode === "city_interior") {
        this.exitAllInteriors();
        this.mode = "explore";
        this.callbacks.onModeChange?.("explore");
      }
    }
    if (e.key === "Tab") {
      e.preventDefault();
      if (this.mode === "interior" || this.mode === "city_interior") return;
      const order: HouseWorldMode[] = this.readOnly
        ? ["explore", "drive"]
        : ["explore", "build", "drive", "avatar"];
      const idx = order.indexOf(this.mode);
      this.setMode(order[(idx + 1) % order.length]);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  private updateInteriorCamera(dt: number, floorY: number, bounds: { minX: number; maxX: number; minZ: number; maxZ: number }) {
    const speed = 2.8 * dt;
    const fwd = (this.keys.has("w") ? 1 : 0) - (this.keys.has("s") ? 1 : 0);
    const str = (this.keys.has("d") ? 1 : 0) - (this.keys.has("a") ? 1 : 0);
    const cam = this.mode === "city_interior" ? this.cityInteriorCam : this.interiorCam;
    if (fwd || str) {
      cam.x += str * speed;
      cam.z -= fwd * speed;
      cam.yaw = Math.atan2(-str, -fwd);
    }
    const m = 0.45;
    cam.x = THREE.MathUtils.clamp(cam.x, bounds.minX + m, bounds.maxX - m);
    cam.z = THREE.MathUtils.clamp(cam.z, bounds.minZ + m, bounds.maxZ - m);
    const eyeH = floorY + 1.65;
    this.camera.position.set(cam.x, eyeH, cam.z + 0.01);
    this.camera.lookAt(cam.x + Math.sin(cam.yaw) * 2, eyeH - 0.1, cam.z + Math.cos(cam.yaw) * 2);
  }

  private updateCamera() {
    if (this.mode === "interior" && this.interiorBounds && this.interiorRoot) {
      const floorY = this.interiorRoot.userData.floorY as number;
      this.updateInteriorCamera(0.016, floorY, this.interiorBounds);
      return;
    }
    if (this.mode === "city_interior" && this.cityInteriorRoot) {
      const floorY = this.cityInteriorRoot.userData.floorY as number;
      const w = this.cityInteriorRoot.userData.interiorW as number;
      const d = this.cityInteriorRoot.userData.interiorD as number;
      this.updateInteriorCamera(0.016, floorY, { minX: -w / 2, maxX: w / 2, minZ: -d / 2, maxZ: d / 2 });
      return;
    }
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
    if (this.mode === "avatar" && this.avatar?.isReady()) {
      const pos = this.avatar.getPosition();
      const y = terrainHeight(pos.x, pos.z, this.state.worldSeed);
      this.camera.position.lerp(new THREE.Vector3(pos.x - Math.sin(pos.rotY) * 5, y + 2.8, pos.z - Math.cos(pos.rotY) * 5), 0.1);
      this.camera.lookAt(pos.x, y + 1.4, pos.z);
      return;
    }
    if (this.mode === "explore") {
      const pan = 0.15;
      if (this.keys.has("w")) this.camTarget.z -= pan;
      if (this.keys.has("s")) this.camTarget.z += pan;
      if (this.keys.has("a")) this.camTarget.x -= pan;
      if (this.keys.has("d")) this.camTarget.x += pan;
      if (this.keys.has("q")) this.camYaw -= 0.03;
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

  private emitPosition(dt: number) {
    this.emitPosTimer += dt;
    if (this.emitPosTimer < 0.35) return;
    this.emitPosTimer = 0;
    let x = this.camTarget.x;
    let z = this.camTarget.z;
    const act = this.avatar?.getActivity() ?? "idle";
    if (this.mode === "avatar" && this.avatar?.isReady()) {
      const p = this.avatar.getPosition();
      x = p.x;
      z = p.z;
    }
    this.callbacks.onPositionChange?.({ x, z, mode: this.mode, activity: act });
  }

  private tickTime(dt: number) {
    if (this.mode === "interior" || this.mode === "city_interior") return;
    this.state.timeOfDay = (this.state.timeOfDay + dt * 0.25) % 24;
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

    if (this.mode === "interior" || this.mode === "city_interior") {
      const floorY =
        this.mode === "city_interior"
          ? (this.cityInteriorRoot?.userData.floorY as number) ?? 0
          : (this.interiorRoot?.userData.floorY as number) ?? 0;
      const bounds =
        this.mode === "city_interior"
          ? { minX: -5, maxX: 5, minZ: -4, maxZ: 4 }
          : this.interiorBounds!;
      if (bounds) this.updateInteriorCamera(dt, floorY, bounds);
    } else {
      this.updateCar(dt);
      this.updatePedestrians(dt);
      if (this.avatar) {
        this.avatar.update(dt, this.keys, this.mode === "avatar");
        this.callbacks.onActivityChange?.(this.avatar.getActivity());
      }
      this.updateCamera();
      this.tickTime(dt);
      this.emitPosition(dt);
    }

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
    this.avatar?.dispose();
    this.remotePlayers.dispose();
    if (this.interiorRoot) disposeInterior(this.interiorRoot);
    if (this.cityInteriorRoot) disposeCityInterior(this.cityInteriorRoot);
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
