"use client";

import * as THREE from "three";
import { APT_DEFAULT_FLOOR, APT_LOBBY_FLOOR, APT_PENTHOUSE_FLOOR, APT_TOTAL_FLOORS, APT_VISIBLE_FLOOR_RADIUS } from "@/lib/apt/constants";
import { getRoomsForFloor } from "@/lib/apt/floor-plan-store";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { ChibiAvatarMesh } from "./chibi-avatar";
import {
  createAptRenderer,
  enableAvatarShadows,
  stripShadows,
} from "./scene-perf";
import {
  DOLLHOUSE_ELEVATOR_W,
  DOLLHOUSE_FLOOR_H,
  DOLLHOUSE_UNIT_W,
  PASTEL,
  buildDollhouseShell,
  buildDollhouseUnit,
  buildElevatorShaft,
  buildLobbyEntrance,
  buildPenthouseCap,
  disposeGroup,
} from "./dollhouse-meshes";
import type { BondeeHomeState } from "./types";
import type { FurnitureItem, ResidentAgent, SimulationSnapshot } from "@/lib/apt/simulation/types";

export { APT_DEFAULT_FLOOR, APT_TOTAL_FLOORS } from "@/lib/apt/constants";

const VISIBLE_FLOORS = APT_VISIBLE_FLOOR_RADIUS * 2 + 1;
const FRUSTUM_DEFAULT = 5.8;
const ELEV_STEP_SEC = 0.07;
const SCROLL_EPS = 0.004;
const ELEV_EPS = 0.02;

export type FloorResident = {
  userId: string;
  username: string;
  displayName: string;
  homeFloor: number;
};

function residentsEqual(a: Map<number, FloorResident>, b: Map<number, FloorResident>) {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) {
    const o = b.get(k);
    if (!o || o.userId !== v.userId || o.displayName !== v.displayName) return false;
  }
  return true;
}

export type DollhouseCallbacks = {
  onFloorClick?: (floor: number) => void;
  onRoomClick?: (roomId: string, multi: boolean) => void;
  onSimulationChange?: (snapshot: SimulationSnapshot) => void;
  onFloorScroll?: (floor: number) => void;
  onResidentClick?: (floor: number, resident: FloorResident) => void;
};

export type AptBuildingCallbacks = DollhouseCallbacks;

export class DollhouseBuildingScene {
  private mount: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private building = new THREE.Group();
  private unitsRoot = new THREE.Group();
  private shellRoot = new THREE.Group();
  private elevatorRoot: THREE.Group | null = null;
  private avatar: ChibiAvatarMesh | null = null;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private pointerStart: { x: number; y: number } | null = null;
  private raf = 0;
  private disposed = false;
  private clock = new THREE.Clock();

  private currentFloor = APT_DEFAULT_FLOOR;
  private targetScrollY = 0;
  private scrollY = 0;
  private elevCarY = 0;
  private targetElevY = 0;
  private moving = false;
  private animTargetFloor: number | null = null;
  private elevStepAcc = 0;
  private floorResidents: Map<number, FloorResident> = new Map();
  private homeFloor: number | null = null;
  private lastRangeStart = -1;
  private lastRangeEnd = -1;
  private needsRender = true;
  private paused = false;

  private floorPlans: Record<number, AptRoom[]> = {};
  private bondeeRoom: BondeeHomeState | null = null;
  private visitRoom: BondeeHomeState | null = null;
  private visitHomeFloor: number | null = null;
  private selectedIds: string[] = [];
  private callbacks: DollhouseCallbacks = {};
  private simEnabled = false;
  private frustum = FRUSTUM_DEFAULT;

  constructor(mount: HTMLElement) {
    this.mount = mount;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PASTEL.bg);
    this.scene.fog = new THREE.Fog(PASTEL.bg, 18, 42);

    const aspect = Math.max(mount.clientWidth, 320) / Math.max(mount.clientHeight, 400);
    this.camera = new THREE.OrthographicCamera(
      (-FRUSTUM_DEFAULT * aspect) / 2,
      (FRUSTUM_DEFAULT * aspect) / 2,
      FRUSTUM_DEFAULT / 2,
      -FRUSTUM_DEFAULT / 2,
      0.1,
      80
    );
    this.setCameraPose();

    this.renderer = createAptRenderer(mount);
    mount.appendChild(this.renderer.domElement);

    this.addLights();
    this.building.add(this.unitsRoot);
    this.building.add(this.shellRoot);
    this.scene.add(this.building);

    this.rebuildBuilding();
    this.snapScroll(true);

    const canvas = this.renderer.domElement;
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("resize", this.onResize);
    this.loop();
  }

  private setCameraPose() {
    this.camera.position.set(9, 11, 9);
    this.camera.lookAt(0, 3.5, 0);
  }

  private requestRender() {
    this.needsRender = true;
  }

  private visibleRange() {
    const half = APT_VISIBLE_FLOOR_RADIUS;
    let start = this.currentFloor - half;
    let end = start + VISIBLE_FLOORS - 1;
    if (start < APT_LOBBY_FLOOR) {
      start = APT_LOBBY_FLOOR;
      end = VISIBLE_FLOORS;
    }
    if (end > APT_TOTAL_FLOORS) {
      end = APT_TOTAL_FLOORS;
      start = Math.max(1, end - VISIBLE_FLOORS + 1);
    }
    return { start, end, count: end - start + 1 };
  }

  private floorLocalY(floor: number, rangeStart: number) {
    return (floor - rangeStart) * DOLLHOUSE_FLOOR_H;
  }

  private scrollForFloor(floor: number) {
    const { start } = this.visibleRange();
    const local = this.floorLocalY(floor, start);
    return -local + ((VISIBLE_FLOORS - 1) * DOLLHOUSE_FLOOR_H) / 2;
  }

  private buildUnitForFloor(f: number, start: number) {
    const active = f === this.currentFloor;
    const visited = this.visitHomeFloor === f;
    const room =
      active && this.bondeeRoom && !this.visitHomeFloor
        ? this.bondeeRoom
        : visited && this.visitRoom
          ? this.visitRoom
          : undefined;
    const planRooms = getRoomsForFloor(this.floorPlans, f);
    const resident = this.floorResidents.get(f);
    const detail = active || visited ? "full" : "minimal";
    const unit = buildDollhouseUnit({
      floorIndex: f,
      active,
      visited,
      room,
      rooms: planRooms,
      seed: f * 31 + (this.visitHomeFloor ?? 0),
      resident,
      isHomeFloor: this.homeFloor === f,
      detail,
    });
    stripShadows(unit);
    unit.position.y = this.floorLocalY(f, start);
    unit.userData.floor = f;
    return unit;
  }

  private syncAvatar(unitY: number) {
    if (!this.bondeeRoom || this.visitHomeFloor) {
      if (this.avatar) {
        this.avatar.dispose();
        this.avatar = null;
      }
      return;
    }
    if (!this.avatar) {
      this.avatar = new ChibiAvatarMesh();
      enableAvatarShadows(this.avatar.root);
      this.unitsRoot.add(this.avatar.root);
    }
    this.avatar.rebuild(this.bondeeRoom.avatar, this.bondeeRoom.pose);
    this.avatar.root.position.set(0.2, unitY + 0.08, 0.35);
    this.avatar.root.rotation.y = -0.35;
    this.avatar.root.scale.setScalar(0.85);
  }

  private rebuildBuilding() {
    disposeGroup(this.unitsRoot);
    disposeGroup(this.shellRoot);
    while (this.unitsRoot.children.length) this.unitsRoot.remove(this.unitsRoot.children[0]);
    while (this.shellRoot.children.length) this.shellRoot.remove(this.shellRoot.children[0]);
    if (this.avatar) {
      this.avatar.dispose();
      this.avatar = null;
    }

    const { start, end, count } = this.visibleRange();
    this.lastRangeStart = start;
    this.lastRangeEnd = end;

    for (let f = start; f <= end; f++) {
      const unit = this.buildUnitForFloor(f, start);
      this.unitsRoot.add(unit);
    }

    const activeUnitY = this.floorLocalY(this.currentFloor, start);
    this.syncAvatar(activeUnitY);

    this.shellRoot.add(buildDollhouseShell(count));

    if (start === APT_LOBBY_FLOOR) {
      const lobby = buildLobbyEntrance();
      lobby.position.y = -DOLLHOUSE_FLOOR_H * 0.92;
      this.shellRoot.add(lobby);
    }

    if (end >= APT_PENTHOUSE_FLOOR) {
      const penthouse = buildPenthouseCap();
      penthouse.position.y = count * DOLLHOUSE_FLOOR_H + DOLLHOUSE_FLOOR_H * 0.15;
      this.shellRoot.add(penthouse);
    }

    this.elevatorRoot = buildElevatorShaft(APT_TOTAL_FLOORS, start, count);
    this.shellRoot.add(this.elevatorRoot);

    this.targetElevY = this.floorLocalY(this.currentFloor, start);
    this.elevCarY = this.targetElevY;
    this.updateElevatorCar();
    this.requestRender();
  }

  /** Same visible window — swap active/visited detail without rebuilding all floors */
  private refreshFloorFocus(prevFloor: number) {
    const { start } = this.visibleRange();
    for (const f of new Set([prevFloor, this.currentFloor, this.visitHomeFloor].filter((x) => x != null))) {
      const floorNum = f as number;
      if (floorNum < this.lastRangeStart || floorNum > this.lastRangeEnd) continue;
      const idx = this.unitsRoot.children.findIndex(
        (c) => c.userData.floor === floorNum && c !== this.avatar?.root
      );
      if (idx === -1) continue;
      const old = this.unitsRoot.children[idx];
      this.unitsRoot.remove(old);
      disposeGroup(old);
      const unit = this.buildUnitForFloor(floorNum, start);
      this.unitsRoot.add(unit);
    }
    this.syncAvatar(this.floorLocalY(this.currentFloor, start));
    this.requestRender();
  }

  private updateElevatorCar() {
    const car = this.elevatorRoot?.getObjectByName("elevator-car");
    if (car) car.position.y = this.elevCarY;
  }

  private snapScroll(instant = false) {
    this.targetScrollY = this.scrollForFloor(this.currentFloor);
    if (instant) this.scrollY = this.targetScrollY;
  }

  setCallbacks(cb: DollhouseCallbacks) {
    this.callbacks = cb;
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (!paused) this.requestRender();
  }

  setFloorResidents(residents: FloorResident[], homeFloor: number | null) {
    const next = new Map(residents.map((r) => [r.homeFloor, r]));
    if (this.homeFloor === homeFloor && residentsEqual(this.floorResidents, next)) return;
    this.homeFloor = homeFloor;
    this.floorResidents = next;
    if (this.lastRangeStart >= 0) {
      this.refreshFloorFocus(this.currentFloor);
    } else {
      this.rebuildBuilding();
    }
  }

  private applyFloor(floor: number, lightweight = false) {
    const clamped = Math.min(APT_TOTAL_FLOORS, Math.max(APT_LOBBY_FLOOR, floor));
    if (clamped === this.currentFloor) return;
    const prev = this.currentFloor;
    this.currentFloor = clamped;

    const { start, end } = this.visibleRange();
    const rangeChanged = start !== this.lastRangeStart || end !== this.lastRangeEnd;

    if (lightweight && !rangeChanged && this.lastRangeStart >= 0) {
      this.refreshFloorFocus(prev);
      this.snapScroll();
      this.targetElevY = this.floorLocalY(this.currentFloor, start);
      this.requestRender();
      return;
    }

    if (rangeChanged || this.lastRangeStart < 0) {
      this.rebuildBuilding();
    } else {
      this.refreshFloorFocus(prev);
    }
    this.snapScroll();
    this.requestRender();
  }

  setBondeeRoom(room: BondeeHomeState | null) {
    this.bondeeRoom = room;
    if (this.lastRangeStart >= 0) {
      this.refreshFloorFocus(this.currentFloor);
    } else {
      this.rebuildBuilding();
    }
  }

  setVisitRoom(room: BondeeHomeState | null, homeFloor: number | null) {
    this.visitRoom = room;
    this.visitHomeFloor = homeFloor;
    if (this.lastRangeStart >= 0) {
      this.refreshFloorFocus(this.currentFloor);
    } else {
      this.rebuildBuilding();
    }
  }

  setFloorPlans(plans: Record<number, AptRoom[]>) {
    this.floorPlans = plans;
    this.rebuildBuilding();
  }

  setSelectedRoomIds(ids: string[]) {
    this.selectedIds = ids;
  }

  updateFloorRooms(_floor: number, _rooms: AptRoom[]) {
    /* dollhouse uses bondee room layout */
  }

  getFloor() {
    return this.currentFloor;
  }

  setFloor(floor: number) {
    const clamped = Math.min(APT_TOTAL_FLOORS, Math.max(APT_LOBBY_FLOOR, floor));
    if (clamped === this.currentFloor) return;

    if (Math.abs(clamped - this.currentFloor) <= 1) {
      this.moving = true;
      this.applyFloor(clamped);
      window.setTimeout(() => {
        this.moving = false;
      }, 480);
      return;
    }

    this.moving = true;
    this.animTargetFloor = clamped;
  }

  cancelFloorAnimation() {
    this.animTargetFloor = null;
    this.moving = false;
  }

  setZoom(delta: number) {
    this.frustum = Math.max(3.8, Math.min(7.5, this.frustum * (1 + delta * 0.12)));
    const aspect = this.mount.clientWidth / this.mount.clientHeight;
    this.camera.left = (-this.frustum * aspect) / 2;
    this.camera.right = (this.frustum * aspect) / 2;
    this.camera.top = this.frustum / 2;
    this.camera.bottom = -this.frustum / 2;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  setXray(_enabled: boolean) {
    /* dollhouse is always open cross-section */
  }

  async startSimulation(floor: number, _residents: ResidentAgent[], _furniture: FurnitureItem[]) {
    this.simEnabled = true;
    this.setFloor(floor);
  }

  setSimulationFurniture(_furniture: FurnitureItem[]) {
    /* bondee room drives furniture */
  }

  getSimulationSnapshot(): SimulationSnapshot | null {
    return null;
  }

  private addLights() {
    this.scene.add(new THREE.AmbientLight(0xfff8fc, 0.88));
    const sun = new THREE.DirectionalLight(0xfff0f8, 0.68);
    sun.position.set(6, 14, 8);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xe8f4ff, 0.32);
    fill.position.set(-6, 8, -4);
    this.scene.add(fill);
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

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      this.setZoom(e.deltaY > 0 ? 1 : -1);
      return;
    }
    const steps = Math.max(1, Math.min(8, Math.round(Math.abs(e.deltaY) / 60)));
    const dir = e.deltaY > 0 ? -1 : 1;
    const next = Math.min(
      APT_TOTAL_FLOORS,
      Math.max(APT_LOBBY_FLOOR, this.currentFloor + dir * steps)
    );
    this.callbacks.onFloorScroll?.(next);
  };

  private pick(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hits = this.raycaster.intersectObjects(this.unitsRoot.children, true);
    for (const hit of hits) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj.userData.resident && typeof obj.userData.floor === "number") {
          this.callbacks.onResidentClick?.(
            obj.userData.floor as number,
            obj.userData.resident as FloorResident
          );
          return;
        }
        if (typeof obj.userData.floor === "number") {
          this.callbacks.onFloorClick?.(obj.userData.floor as number);
          return;
        }
        obj = obj.parent;
      }
    }
  }

  private onResize = () => {
    const w = this.mount.clientWidth;
    const h = this.mount.clientHeight;
    if (!w || !h) return;
    const aspect = w / h;
    const frustum = this.frustum;
    this.camera.left = (-frustum * aspect) / 2;
    this.camera.right = (frustum * aspect) / 2;
    this.camera.top = frustum / 2;
    this.camera.bottom = -frustum / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.requestRender();
  };

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    if (this.paused) return;
    const delta = this.clock.getDelta();

    let animating = false;

    if (this.animTargetFloor !== null && this.animTargetFloor !== this.currentFloor) {
      animating = true;
      this.elevStepAcc += delta;
      const target = this.animTargetFloor;
      while (this.elevStepAcc >= ELEV_STEP_SEC && target !== this.currentFloor) {
        this.elevStepAcc -= ELEV_STEP_SEC;
        const dir = Math.sign(target - this.currentFloor);
        this.applyFloor(this.currentFloor + dir, true);
        if (this.currentFloor === target) {
          this.animTargetFloor = null;
          this.moving = false;
          this.refreshFloorFocus(this.currentFloor);
        }
      }
    }

    const scrollDelta = this.targetScrollY - this.scrollY;
    if (Math.abs(scrollDelta) > SCROLL_EPS) {
      animating = true;
      this.scrollY += scrollDelta * 0.12;
      this.building.position.y = this.scrollY;
    }

    const elevDelta = this.targetElevY - this.elevCarY;
    if (Math.abs(elevDelta) > ELEV_EPS) {
      animating = true;
      const elevSpeed = this.moving ? 0.18 : 0.24;
      this.elevCarY += elevDelta * elevSpeed;
      this.updateElevatorCar();
    }

    if (animating) this.needsRender = true;
    if (!this.needsRender) return;
    this.needsRender = false;
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
    canvas.removeEventListener("wheel", this.onWheel);
    disposeGroup(this.unitsRoot);
    disposeGroup(this.shellRoot);
    this.avatar?.dispose();
    this.renderer.dispose();
    canvas.remove();
  }
}

/** Backward-compatible alias */
export const AptBuildingScene = DollhouseBuildingScene;

export function roomsForFloor(plans: Record<number, AptRoom[]>, floor: number) {
  return getRoomsForFloor(plans, floor);
}
