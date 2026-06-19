"use client";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  SCALE,
  buildFloorGroup,
  disposeGroup,
} from "@/lib/apt/building-from-plan";
import { APT_DEFAULT_FLOOR, APT_TOTAL_FLOORS, FLOOR_HEIGHT } from "@/lib/apt/constants";
import { getRoomsForFloor } from "@/lib/apt/floor-plan-store";
import { PLAN_H, PLAN_W, type AptRoom } from "@/lib/apt/floor-plan-types";
import { AptSimulationLayer } from "@/lib/apt/simulation/simulation-layer";
import type { FurnitureItem, ResidentAgent, SimulationSnapshot } from "@/lib/apt/simulation/types";

export { APT_DEFAULT_FLOOR, APT_TOTAL_FLOORS } from "@/lib/apt/constants";

const MIN_DISTANCE = 5;
const MAX_DISTANCE = 55;
const BUILDING_H = APT_TOTAL_FLOORS * FLOOR_HEIGHT;

type FloorRefs = {
  group: THREE.Group;
  shellMats: THREE.MeshStandardMaterial[];
};

export type AptBuildingCallbacks = {
  onFloorClick?: (floor: number) => void;
  onRoomClick?: (roomId: string, multi: boolean) => void;
  onSimulationChange?: (snapshot: SimulationSnapshot) => void;
};

export class AptBuildingScene {
  private mount: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private building = new THREE.Group();
  private towerGroup = new THREE.Group();
  private towerMats: THREE.MeshStandardMaterial[] = [];
  private detailRef: FloorRefs | null = null;
  private raycastTargets: THREE.Object3D[] = [];
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private focusTarget = new THREE.Vector3();
  private pointerStart: { x: number; y: number } | null = null;
  private raf = 0;
  private disposed = false;

  private currentFloor = APT_DEFAULT_FLOOR;
  private targetBuildingY = 0;
  private xrayMode = false;
  private xrayTarget = 0;
  private xrayCurrent = 0;

  private floorPlans: Record<number, AptRoom[]> = {};
  private selectedIds: string[] = [];
  private callbacks: AptBuildingCallbacks = {};
  private simulation: AptSimulationLayer;
  private clock = new THREE.Clock();
  private simEnabled = false;

  constructor(mount: HTMLElement) {
    this.mount = mount;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);
    this.scene.fog = new THREE.Fog(0xffffff, 50, BUILDING_H + 90);

    const w = Math.max(mount.clientWidth, 320);
    const h = Math.max(mount.clientHeight, 400);
    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.1, BUILDING_H + 120);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.enableRotate = true;
    this.controls.minDistance = MIN_DISTANCE;
    this.controls.maxDistance = MAX_DISTANCE;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minPolarAngle = 0.2;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    this.renderer.domElement.style.cursor = "grab";
    this.controls.addEventListener("start", () => {
      this.renderer.domElement.style.cursor = "grabbing";
    });
    this.controls.addEventListener("end", () => {
      this.renderer.domElement.style.cursor = "grab";
    });

    this.initFloorPlans();
    this.addLights();
    this.addGround();
    this.buildTowerShell();
    this.rebuildDetailFloor();
    this.scene.add(this.building);
    this.simulation = new AptSimulationLayer(this.building);
    this.simulation.setOnChange((snap) => this.callbacks.onSimulationChange?.(snap));

    this.targetBuildingY = this.floorToBuildingY(this.currentFloor);
    this.building.position.y = this.targetBuildingY;
    this.snapCameraToFloor(true);

    const canvas = this.renderer.domElement;
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    window.addEventListener("resize", this.onResize);
    this.loop();
  }

  private initFloorPlans() {
    this.floorPlans = {};
  }

  private roomsFor(floor: number) {
    return getRoomsForFloor(this.floorPlans, floor);
  }

  setCallbacks(cb: AptBuildingCallbacks) {
    this.callbacks = cb;
  }

  async startSimulation(
    floor: number,
    residents: ResidentAgent[],
    furniture: FurnitureItem[]
  ) {
    const rooms = this.roomsFor(floor);
    await this.simulation.bootstrap(floor, rooms, residents, furniture);
    this.simEnabled = true;
  }

  setSimulationFurniture(furniture: FurnitureItem[]) {
    this.simulation.setFurniture(furniture);
  }

  getSimulationSnapshot() {
    return this.simulation.getSnapshot();
  }

  setFloorPlans(plans: Record<number, AptRoom[]>) {
    this.floorPlans = plans;
    this.rebuildDetailFloor();
  }

  setSelectedRoomIds(ids: string[]) {
    this.selectedIds = ids;
    this.rebuildDetailFloor();
  }

  updateFloorRooms(floor: number, rooms: AptRoom[]) {
    this.floorPlans[floor] = rooms;
    if (floor === this.currentFloor) this.rebuildDetailFloor();
    if (this.simEnabled && floor === this.currentFloor) {
      this.simulation.updateContext(floor, rooms);
    }
  }

  getFloor() {
    return this.currentFloor;
  }

  setFloor(floor: number) {
    const clamped = Math.min(APT_TOTAL_FLOORS, Math.max(1, floor));
    if (clamped === this.currentFloor) return;
    this.currentFloor = clamped;
    this.targetBuildingY = this.floorToBuildingY(clamped);
    this.rebuildDetailFloor();
    if (this.simEnabled) {
      this.simulation.updateContext(clamped, this.roomsFor(clamped));
    }
  }

  /** 운전 게임과 동일 — 시선 고정 상태에서 거리만 조절 */
  setZoom(delta: number) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    if (offset.lengthSq() < 0.01) return;
    const dist = Math.max(
      this.controls.minDistance,
      Math.min(this.controls.maxDistance, offset.length() * (1 - delta * 0.12))
    );
    this.camera.position.copy(this.controls.target).add(offset.normalize().multiplyScalar(dist));
  }

  setXray(enabled: boolean) {
    this.xrayMode = enabled;
    this.xrayTarget = enabled ? 1 : 0;
  }

  private floorToBuildingY(floor: number) {
    return -(floor - 1) * FLOOR_HEIGHT;
  }

  private floorFocusY() {
    return (
      this.building.position.y +
      (this.currentFloor - 1) * FLOOR_HEIGHT +
      FLOOR_HEIGHT * 0.45
    );
  }

  private snapCameraToFloor(instant = false) {
    const focusY = this.floorFocusY();
    this.focusTarget.set(0, focusY, 0);
    if (instant) {
      this.controls.target.copy(this.focusTarget);
      this.camera.position.set(9.5, focusY + 8, 11.5);
      return;
    }
    const prev = this.controls.target.clone();
    this.controls.target.copy(this.focusTarget);
    this.camera.position.add(this.controls.target.clone().sub(prev));
  }

  private addLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.92));
    const sun = new THREE.DirectionalLight(0xffffff, 0.95);
    sun.position.set(10, 18, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xf0f0f0, 0.45);
    fill.position.set(-8, 10, -6);
    this.scene.add(fill);
  }

  private addGround() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.03;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private towerEdges: THREE.LineSegments[] = [];

  private buildTowerShell() {
    const w = PLAN_W * SCALE;
    const d = PLAN_H * SCALE;
    const geo = new THREE.BoxGeometry(w, FLOOR_HEIGHT * 0.82, d);
    this.towerMats = [];
    this.towerEdges = [];

    for (let f = 1; f <= APT_TOTAL_FLOORS; f++) {
      const active = f === this.currentFloor;
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: active ? 0.92 : 0.42,
        roughness: 0.25,
        metalness: 0,
      });
      this.towerMats.push(mat);
      const slab = new THREE.Mesh(geo, mat);
      slab.position.y = (f - 1) * FLOOR_HEIGHT + FLOOR_HEIGHT * 0.45;
      slab.userData.floor = f;
      this.towerGroup.add(slab);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: active ? 1 : 0.65,
        })
      );
      edges.position.copy(slab.position);
      edges.userData.floor = f;
      this.towerEdges.push(edges);
      this.towerGroup.add(edges);
    }
    this.building.add(this.towerGroup);
    this.syncRaycastTargets();
  }

  private rebuildDetailFloor() {
    if (this.detailRef) {
      this.building.remove(this.detailRef.group);
      disposeGroup(this.detailRef.group);
      this.detailRef = null;
    }

    const floorIndex = this.currentFloor;
    const rooms = this.roomsFor(floorIndex);
    const built = buildFloorGroup(rooms, {
      selectedIds: this.selectedIds,
      floorIndex,
    });
    built.group.position.y = (floorIndex - 1) * FLOOR_HEIGHT;
    this.detailRef = built;
    this.building.add(built.group);
    this.updateTowerHighlight();
    this.syncRaycastTargets();
  }

  private updateTowerHighlight() {
    for (let i = 0; i < this.towerMats.length; i++) {
      const f = i + 1;
      const active = f === this.currentFloor;
      const mat = this.towerMats[i];
      mat.color.setHex(0xffffff);
      mat.opacity = active ? 0.92 : 0.38;
      const edge = this.towerEdges[i];
      if (edge) {
        (edge.material as THREE.LineBasicMaterial).opacity = active ? 1 : 0.55;
      }
    }
    const hl = this.detailRef?.group.getObjectByName("floor-highlight") as THREE.Mesh | undefined;
    if (hl) (hl.material as THREE.MeshBasicMaterial).opacity = 0.18;
  }

  private syncRaycastTargets() {
    this.raycastTargets = [
      ...this.towerGroup.children,
      ...(this.detailRef ? [this.detailRef.group] : []),
    ];
  }

  private applyXray() {
    const t = this.xrayCurrent;
    if (this.detailRef) {
      for (const mat of this.detailRef.shellMats) {
        const base = mat.userData.exterior ? 0.82 : 0.65;
        mat.opacity = THREE.MathUtils.lerp(base, 0.1, t);
        mat.depthWrite = t < 0.55;
      }
    }
    for (const mat of this.towerMats) {
      const base = 0.38;
      mat.opacity = THREE.MathUtils.lerp(base, 0.06, t);
    }
  }

  private onPointerDown = (e: PointerEvent) => {
    if (e.button === 0) this.pointerStart = { x: e.clientX, y: e.clientY };
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.pointerStart) return;
    const moved = Math.hypot(e.clientX - this.pointerStart.x, e.clientY - this.pointerStart.y);
    if (moved < 6) this.pick(e);
    this.pointerStart = null;
  };

  private pick(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hits = this.raycaster.intersectObjects(this.raycastTargets, true);
    if (!hits.length) return;

    let obj: THREE.Object3D | null = hits[0].object;
    while (obj) {
      if (obj.userData.roomId) {
        this.callbacks.onRoomClick?.(obj.userData.roomId as string, e.shiftKey);
        return;
      }
      if (obj.userData.floor) {
        this.callbacks.onFloorClick?.(obj.userData.floor as number);
        return;
      }
      obj = obj.parent;
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

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);

    this.building.position.y += (this.targetBuildingY - this.building.position.y) * 0.09;
    this.xrayCurrent += (this.xrayTarget - this.xrayCurrent) * 0.1;

    const focusY = this.floorFocusY();
    const prevTarget = this.controls.target.clone();
    this.focusTarget.set(0, focusY, 0);
    this.controls.target.lerp(this.focusTarget, 0.14);
    this.camera.position.add(this.controls.target.clone().sub(prevTarget));

    this.controls.update();
    this.applyXray();
    if (this.simEnabled) this.simulation.tick(dt);

    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener("pointerdown", this.onPointerDown);
    canvas.removeEventListener("pointerup", this.onPointerUp);
    canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.controls.dispose();
    this.simulation.dispose();
    if (this.detailRef) disposeGroup(this.detailRef.group);
    this.towerGroup.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m.dispose());
      }
      if (o instanceof THREE.LineSegments) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    this.renderer.dispose();
    canvas.remove();
  }
}

export { PLAN_W, PLAN_H, SCALE };
