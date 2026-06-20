"use client";

import * as THREE from "three";
import { APT_DEFAULT_FLOOR, APT_LOBBY_FLOOR, APT_PENTHOUSE_FLOOR, APT_TOTAL_FLOORS, APT_VISIBLE_FLOOR_RADIUS } from "@/lib/apt/constants";
import { getRoomsForFloor } from "@/lib/apt/floor-plan-store";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { ChibiAvatarMesh } from "./chibi-avatar";
import {
  createAptRenderer,
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
import { DEFAULT_CHIBI_AVATAR } from "./types";
import type { FurnitureItem, ResidentAgent, SimulationSnapshot } from "@/lib/apt/simulation/types";

export { APT_DEFAULT_FLOOR, APT_TOTAL_FLOORS } from "@/lib/apt/constants";

const VISIBLE_FLOORS = APT_VISIBLE_FLOOR_RADIUS * 2 + 1;
const FRUSTUM_DEFAULT = 5.8;
const SCROLL_EPS = 0.002;
const MIN_RIDE_SEC = 0.85;
const MAX_RIDE_SEC = 18;
const SEC_PER_FLOOR = 0.34;
const WALK_TO_ELEVATOR_SEC = 0.75;
const ENTER_ELEVATOR_SEC = 0.55;
const EXIT_ELEVATOR_SEC = 0.75;
const AVATAR_SCALE = 0.88;

type ElevatorRide = {
  from: number;
  to: number;
  elapsed: number;
  duration: number;
};

type RidePhase = "pre-walk" | "pre-enter" | "riding" | "post-exit";

function easeInOutQuint(t: number) {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

function rideDurationSec(from: number, to: number) {
  const d = Math.abs(to - from);
  if (d < 0.01) return MIN_RIDE_SEC;
  return Math.min(MAX_RIDE_SEC, Math.max(MIN_RIDE_SEC, MIN_RIDE_SEC * 0.65 + d * SEC_PER_FLOOR));
}

export type FloorResident = {
  userId: string;
  username: string;
  displayName: string;
  homeFloor: number;
  doorOpen: boolean;
};

function residentsEqual(a: Map<number, FloorResident>, b: Map<number, FloorResident>) {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) {
    const o = b.get(k);
    if (!o || o.userId !== v.userId || o.displayName !== v.displayName || o.doorOpen !== v.doorOpen) {
      return false;
    }
  }
  return true;
}

export type DollhouseCallbacks = {
  onFloorClick?: (floor: number) => void;
  onRoomClick?: (roomId: string, multi: boolean) => void;
  onSimulationChange?: (snapshot: SimulationSnapshot) => void;
  onFloorScroll?: (floor: number) => void;
  onResidentClick?: (floor: number, resident: FloorResident) => void;
  /** Fired as the elevator passes each floor during a ride */
  onFloorDisplay?: (floor: number) => void;
  onRideStart?: () => void;
  onRideEnd?: () => void;
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
  private virtualFloor = APT_DEFAULT_FLOOR;
  private lastDisplayedFloor = APT_DEFAULT_FLOOR;
  private elevatorRide: ElevatorRide | null = null;
  private ridePhase: RidePhase | null = null;
  private ridePhaseTime = 0;
  private avatarWalkPhase = 0;
  private targetScrollY = 0;
  private scrollY = 0;
  private elevCarY = 0;
  private moving = false;
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

  constructor(mount: HTMLElement, initialFloor = APT_DEFAULT_FLOOR) {
    this.mount = mount;
    this.currentFloor = Math.min(APT_TOTAL_FLOORS, Math.max(APT_LOBBY_FLOOR, initialFloor));
    this.virtualFloor = this.currentFloor;
    this.lastDisplayedFloor = this.currentFloor;

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

  private visibleRange(centerFloor = this.currentFloor) {
    const half = APT_VISIBLE_FLOOR_RADIUS;
    let start = centerFloor - half;
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

  private scrollForVirtualFloor(vf: number) {
    const { start } = this.visibleRange(Math.round(vf));
    const local = (vf - start) * DOLLHOUSE_FLOOR_H;
    return -local + ((VISIBLE_FLOORS - 1) * DOLLHOUSE_FLOOR_H) / 2;
  }

  private elevatorYForVirtualFloor(vf: number) {
    const { start } = this.visibleRange(Math.round(vf));
    return (vf - start) * DOLLHOUSE_FLOOR_H;
  }

  private scrollForFloor(floor: number) {
    return this.scrollForVirtualFloor(floor);
  }

  private buildUnitForFloor(f: number, start: number) {
    const active = f === this.currentFloor;
    const viewingVisit = this.visitHomeFloor != null;
    const revealInterior = active && (!viewingVisit || f === this.visitHomeFloor);

    const room =
      revealInterior && viewingVisit && this.visitRoom
        ? this.visitRoom
        : revealInterior && this.bondeeRoom
          ? this.bondeeRoom
          : undefined;

    const planRooms = getRoomsForFloor(this.floorPlans, f);
    const resident = this.floorResidents.get(f);
    const detail = revealInterior ? "full" : "opaque";

    const unit = buildDollhouseUnit({
      floorIndex: f,
      active,
      visited: revealInterior,
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

  private shaftX() {
    return DOLLHOUSE_UNIT_W / 2 + DOLLHOUSE_ELEVATOR_W / 2 + 0.15;
  }

  private avatarLocalYForFloor(floor: number) {
    const { start } = this.visibleRange(Math.round(floor));
    return this.floorLocalY(Math.round(floor), start);
  }

  private easeSmooth(u: number) {
    return u * u * (3 - 2 * u);
  }

  private ensureAvatar() {
    const config = this.bondeeRoom?.avatar ?? DEFAULT_CHIBI_AVATAR;
    const pose = this.bondeeRoom?.pose ?? "stand";
    if (!this.avatar) {
      this.avatar = new ChibiAvatarMesh();
      this.avatar.root.scale.setScalar(AVATAR_SCALE);
      this.avatar.root.name = "floor-avatar";
      this.building.add(this.avatar.root);
    }
    this.avatar.rebuild(config, pose);
    this.avatar.root.visible = true;
  }

  private hideAvatar() {
    if (!this.avatar) return;
    this.avatar.dispose();
    this.building.remove(this.avatar.root);
    this.avatar = null;
  }

  private setAvatarPose(x: number, y: number, z: number, rotY: number) {
    if (!this.avatar) return;
    this.avatar.root.position.set(x, y, z);
    this.avatar.root.rotation.y = rotY;
  }

  private lerpAvatarOnFloor(
    floor: number,
    from: { x: number; z: number; rotY: number },
    to: { x: number; z: number; rotY: number },
    u: number,
    moving: boolean
  ) {
    const eased = this.easeSmooth(u);
    const localY = this.avatarLocalYForFloor(floor);
    this.setAvatarPose(
      THREE.MathUtils.lerp(from.x, to.x, eased),
      localY + 0.02,
      THREE.MathUtils.lerp(from.z, to.z, eased),
      THREE.MathUtils.lerp(from.rotY, to.rotY, eased)
    );
    this.avatar?.animateWalk(this.avatarWalkPhase, moving);
  }

  private syncAvatarInElevator() {
    if (!this.avatar) return;
    const sx = this.shaftX();
    this.setAvatarPose(sx, this.elevCarY + 0.05, 0.15, -0.55);
    this.avatar.animateWalk(this.avatarWalkPhase, false);
    const sway = Math.sin(this.avatarWalkPhase * 4) * 0.012;
    this.avatar.root.position.y = this.elevCarY + 0.05 + sway;
  }

  private tickAvatarPhases(delta: number): boolean {
    const ride = this.elevatorRide;
    if (!ride || !this.ridePhase || !this.avatar) return false;

    this.ridePhaseTime += delta;
    this.avatarWalkPhase += delta;
    const sx = this.shaftX();
    const fromFloor = Math.round(ride.from);
    const toFloor = Math.round(ride.to);

    if (this.ridePhase === "pre-walk" || this.ridePhase === "pre-enter") {
      this.virtualFloor = ride.from;
      this.elevCarY = this.elevatorYForVirtualFloor(ride.from);
      this.scrollY = this.scrollForVirtualFloor(ride.from);
      this.targetScrollY = this.scrollY;
      this.building.position.y = this.scrollY;
    } else if (this.ridePhase === "post-exit") {
      this.virtualFloor = ride.to;
      this.elevCarY = this.elevatorYForVirtualFloor(ride.to);
      this.scrollY = this.scrollForVirtualFloor(ride.to);
      this.targetScrollY = this.scrollY;
      this.building.position.y = this.scrollY;
    }

    switch (this.ridePhase) {
      case "pre-walk": {
        const u = Math.min(1, this.ridePhaseTime / WALK_TO_ELEVATOR_SEC);
        this.lerpAvatarOnFloor(
          fromFloor,
          { x: -0.15, z: 0.42, rotY: 0.1 },
          { x: sx - 0.12, z: 0.2, rotY: -0.45 },
          u,
          u < 0.92
        );
        if (u >= 1) {
          this.ridePhase = "pre-enter";
          this.ridePhaseTime = 0;
        }
        break;
      }
      case "pre-enter": {
        const u = Math.min(1, this.ridePhaseTime / ENTER_ELEVATOR_SEC);
        const localY = this.avatarLocalYForFloor(fromFloor);
        const eased = this.easeSmooth(u);
        this.setAvatarPose(
          THREE.MathUtils.lerp(sx - 0.12, sx, eased),
          localY + 0.02 + eased * 0.03,
          THREE.MathUtils.lerp(0.2, 0.15, eased),
          THREE.MathUtils.lerp(-0.45, -0.55, eased)
        );
        this.avatar.animateWalk(this.ridePhaseTime, u < 0.7);
        if (u >= 1) {
          this.ridePhase = "riding";
          this.ridePhaseTime = 0;
          this.syncAvatarInElevator();
        }
        break;
      }
      case "post-exit": {
        const u = Math.min(1, this.ridePhaseTime / EXIT_ELEVATOR_SEC);
        this.lerpAvatarOnFloor(
          toFloor,
          { x: sx, z: 0.15, rotY: -0.55 },
          { x: -0.1, z: 0.4, rotY: 0.05 },
          u,
          u < 0.85
        );
        if (u >= 1) {
          this.ridePhase = null;
          this.ridePhaseTime = 0;
          this.completeElevatorRide();
        }
        break;
      }
      default:
        break;
    }

    this.updateElevatorCar();
    return true;
  }

  private rebuildBuilding() {
    disposeGroup(this.unitsRoot);
    disposeGroup(this.shellRoot);
    while (this.unitsRoot.children.length) this.unitsRoot.remove(this.unitsRoot.children[0]);
    while (this.shellRoot.children.length) this.shellRoot.remove(this.shellRoot.children[0]);
    if (!this.elevatorRide && !this.ridePhase) {
      this.hideAvatar();
    }

    const { start, end, count } = this.visibleRange();
    this.lastRangeStart = start;
    this.lastRangeEnd = end;

    for (let f = start; f <= end; f++) {
      const unit = this.buildUnitForFloor(f, start);
      this.unitsRoot.add(unit);
    }

    const activeUnitY = this.floorLocalY(this.currentFloor, start);
    if (this.ridePhase) {
      if (this.ridePhase === "riding" || this.ridePhase === "pre-enter") {
        this.syncAvatarInElevator();
      } else if (this.ridePhase === "pre-walk") {
        this.lerpAvatarOnFloor(
          Math.round(this.elevatorRide?.from ?? this.currentFloor),
          { x: -0.15, z: 0.42, rotY: 0.1 },
          { x: this.shaftX() - 0.12, z: 0.2, rotY: -0.45 },
          Math.min(1, this.ridePhaseTime / WALK_TO_ELEVATOR_SEC),
          true
        );
      } else if (this.ridePhase === "post-exit") {
        this.lerpAvatarOnFloor(
          Math.round(this.elevatorRide?.to ?? this.currentFloor),
          { x: this.shaftX(), z: 0.15, rotY: -0.55 },
          { x: -0.1, z: 0.4, rotY: 0.05 },
          Math.min(1, this.ridePhaseTime / EXIT_ELEVATOR_SEC),
          true
        );
      }
    } else if (!this.elevatorRide) {
      this.hideAvatar();
    }
    void activeUnitY;

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

    this.elevCarY = this.elevatorYForVirtualFloor(this.virtualFloor);
    this.scrollY = this.scrollForVirtualFloor(this.virtualFloor);
    this.targetScrollY = this.scrollY;
    this.building.position.y = this.scrollY;
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
        (c) => c.userData.floor === floorNum && c.name !== "floor-avatar"
      );
      if (idx === -1) continue;
      const old = this.unitsRoot.children[idx];
      this.unitsRoot.remove(old);
      disposeGroup(old);
      const unit = this.buildUnitForFloor(floorNum, start);
      this.unitsRoot.add(unit);
    }
    if (this.ridePhase === "riding") {
      this.syncAvatarInElevator();
    }
    this.requestRender();
  }

  private updateElevatorCar() {
    const car = this.elevatorRoot?.getObjectByName("elevator-car") as THREE.Group | undefined;
    if (!car) return;
    car.position.y = this.elevCarY;
    const shaftX = (this.elevatorRoot?.userData.shaftX as number | undefined) ?? 0;
    if (this.elevatorRide) {
      const phase = this.elevatorRide.elapsed * 9;
      car.position.x = shaftX + Math.sin(phase) * 0.004;
      car.rotation.z = Math.sin(phase * 0.7) * 0.006;
    } else {
      car.position.x = shaftX;
      car.rotation.z = THREE.MathUtils.lerp(car.rotation.z, 0, 0.12);
    }

    const panel = car.getObjectByName("elevator-floor-panel");
    if (panel && this.elevatorRide) {
      panel.scale.y = 1 + Math.sin(this.elevatorRide.elapsed * 12) * 0.05;
    } else if (panel) {
      panel.scale.y = THREE.MathUtils.lerp(panel.scale.y, 1, 0.15);
    }
  }

  private syncRideVisuals() {
    this.elevCarY = this.elevatorYForVirtualFloor(this.virtualFloor);
    this.scrollY = this.scrollForVirtualFloor(this.virtualFloor);
    this.targetScrollY = this.scrollY;
    this.building.position.y = this.scrollY;
    this.updateElevatorCar();
    if (this.ridePhase === "riding") {
      this.syncAvatarInElevator();
    }
  }

  private onDisplayedFloorChange(prevFloor: number, nextFloor: number) {
    if (nextFloor === this.lastDisplayedFloor) return;
    this.lastDisplayedFloor = nextFloor;
    this.currentFloor = nextFloor;

    const prevRange = this.visibleRange(prevFloor);
    const nextRange = this.visibleRange(nextFloor);
    const rangeChanged =
      prevRange.start !== nextRange.start || prevRange.end !== nextRange.end;

    if (rangeChanged) {
      this.rebuildBuilding();
    } else {
      this.refreshFloorFocus(prevFloor);
    }
    this.callbacks.onFloorDisplay?.(nextFloor);
  }

  private startElevatorRide(to: number) {
    const from = this.virtualFloor;
    if (Math.abs(to - from) < 0.001) return;

    this.elevatorRide = {
      from,
      to,
      elapsed: 0,
      duration: rideDurationSec(from, to),
    };
    this.ridePhase = "pre-walk";
    this.ridePhaseTime = 0;
    this.avatarWalkPhase = 0;
    this.ensureAvatar();
    this.moving = true;
    this.callbacks.onRideStart?.();
    this.requestRender();
  }

  private retargetElevatorRide(to: number) {
    const from = this.virtualFloor;
    if (Math.abs(to - from) < 0.001) {
      this.completeElevatorRide();
      return;
    }
    this.elevatorRide = {
      from,
      to,
      elapsed: 0,
      duration: rideDurationSec(from, to),
    };
    if (this.ridePhase === "post-exit") {
      this.ridePhase = "riding";
      this.ridePhaseTime = 0;
    } else if (!this.ridePhase) {
      this.ridePhase = "pre-walk";
      this.ridePhaseTime = 0;
      this.avatarWalkPhase = 0;
      this.ensureAvatar();
    }
    this.moving = true;
    this.requestRender();
  }

  private tickElevatorRide(delta: number): boolean {
    const ride = this.elevatorRide;
    if (!ride || this.ridePhase !== "riding") return false;

    ride.elapsed += delta;
    this.avatarWalkPhase += delta;
    const t = Math.min(1, ride.elapsed / ride.duration);
    const eased = easeInOutQuint(t);
    const prevDisplayed = this.lastDisplayedFloor;
    this.virtualFloor = ride.from + (ride.to - ride.from) * eased;

    const displayed = Math.min(
      APT_TOTAL_FLOORS,
      Math.max(APT_LOBBY_FLOOR, Math.round(this.virtualFloor))
    );
    if (displayed !== prevDisplayed) {
      this.onDisplayedFloorChange(prevDisplayed, displayed);
    }

    this.syncRideVisuals();
    this.syncAvatarInElevator();

    if (t >= 1) {
      this.ridePhase = "post-exit";
      this.ridePhaseTime = 0;
      return true;
    }
    return true;
  }

  private completeElevatorRide() {
    const target = this.elevatorRide?.to ?? this.virtualFloor;
    this.elevatorRide = null;
    this.ridePhase = null;
    this.ridePhaseTime = 0;
    this.virtualFloor = target;

    const prev = this.lastDisplayedFloor;
    const rounded = Math.min(APT_TOTAL_FLOORS, Math.max(APT_LOBBY_FLOOR, Math.round(target)));
    if (rounded !== prev) {
      this.onDisplayedFloorChange(prev, rounded);
    } else {
      this.currentFloor = rounded;
      this.refreshFloorFocus(prev);
    }

    this.syncRideVisuals();
    this.hideAvatar();
    this.moving = false;
    this.callbacks.onFloorDisplay?.(rounded);
    this.callbacks.onRideEnd?.();
    this.requestRender();
  }

  private snapScroll(instant = false) {
    this.targetScrollY = this.scrollForVirtualFloor(this.virtualFloor);
    if (instant) {
      this.scrollY = this.targetScrollY;
      this.building.position.y = this.scrollY;
    }
  }

  isRiding() {
    return this.elevatorRide !== null || this.moving;
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

  setBondeeRoom(room: BondeeHomeState | null) {
    this.bondeeRoom = room;
    if (this.avatar && room) {
      this.avatar.rebuild(room.avatar, room.pose ?? "stand");
    }
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
    if (this.elevatorRide) {
      if (Math.abs(clamped - this.elevatorRide.to) < 0.001) return;
      this.retargetElevatorRide(clamped);
      return;
    }
    if (Math.abs(clamped - this.virtualFloor) < 0.001) return;
    this.startElevatorRide(clamped);
  }

  cancelFloorAnimation() {
    if (!this.elevatorRide) return;
    const target = this.elevatorRide.to;
    this.virtualFloor = target;
    this.ridePhase = null;
    this.ridePhaseTime = 0;
    this.completeElevatorRide();
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
    const delta = Math.min(0.05, this.clock.getDelta());

    let animating = false;

    if (
      this.ridePhase === "pre-walk" ||
      this.ridePhase === "pre-enter" ||
      this.ridePhase === "post-exit"
    ) {
      animating = this.tickAvatarPhases(delta) || animating;
    } else if (this.elevatorRide && this.ridePhase === "riding") {
      animating = this.tickElevatorRide(delta) || animating;
    } else if (this.elevatorRide) {
      animating = true;
    } else {
      const scrollDelta = this.targetScrollY - this.scrollY;
      if (Math.abs(scrollDelta) > SCROLL_EPS) {
        animating = true;
        this.scrollY += scrollDelta * 0.14;
        this.building.position.y = this.scrollY;
      }
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
    this.hideAvatar();
    this.renderer.dispose();
    canvas.remove();
  }
}

/** Backward-compatible alias */
export const AptBuildingScene = DollhouseBuildingScene;

export function roomsForFloor(plans: Record<number, AptRoom[]>, floor: number) {
  return getRoomsForFloor(plans, floor);
}
