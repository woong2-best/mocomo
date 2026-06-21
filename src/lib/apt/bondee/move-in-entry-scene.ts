"use client";

import * as THREE from "three";
import { APT_LOBBY_FLOOR } from "@/lib/apt/constants";
import { ChibiAvatarMesh } from "./chibi-avatar";
import {
  DOLLHOUSE_ELEVATOR_W,
  DOLLHOUSE_FLOOR_H,
  PASTEL,
  buildDollhouseUnit,
  buildElevatorShaft,
  buildLobbyEntrance,
  disposeGroup,
  pastelMat,
} from "./dollhouse-meshes";
import { DEFAULT_CHIBI_AVATAR } from "./types";
import { createAptRenderer, stripShadows } from "./scene-perf";

export type MoveInPhase =
  | "walk-in"
  | "to-elevator"
  | "doors-opening-lobby"
  | "enter-elevator"
  | "doors-closing"
  | "elevator-ride"
  | "doors-opening"
  | "exit-elevator"
  | "to-home"
  | "done";

export type MoveInEntryCallbacks = {
  onPhaseChange?: (phase: MoveInPhase) => void;
  onFloorDisplay?: (floor: number) => void;
  onDoorProgress?: (closed: number) => void;
  onComplete?: () => void;
};

const PHASE_LABEL: Record<MoveInPhase, string> = {
  "walk-in": "아파트 입구로 들어가는 중…",
  "to-elevator": "엘리베이터 앞으로 이동 중…",
  "doors-opening-lobby": "엘리베이터 문이 열립니다",
  "enter-elevator": "엘리베이터 탑승",
  "doors-closing": "문이 닫히는 중…",
  "elevator-ride": "엘리베이터 상승 중…",
  "doors-opening": "목적 층 도착 · 문이 열립니다",
  "exit-elevator": "엘리베이터에서 내리는 중…",
  "to-home": "내 집 현관으로 이동…",
  done: "입주 완료!",
};

export { PHASE_LABEL as MOVE_IN_PHASE_LABEL };

type PathKeyframe = { t: number; x: number; y: number; z: number; rotY: number };

const DOOR_OPEN_LEFT = -DOLLHOUSE_ELEVATOR_W * 0.21;
const DOOR_OPEN_RIGHT = DOLLHOUSE_ELEVATOR_W * 0.21;
const DOOR_CLOSED_LEFT = -0.03;
const DOOR_CLOSED_RIGHT = 0.03;

function easeInOutQuint(t: number) {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

function moveInRideDurationSec(from: number, to: number) {
  const d = Math.abs(to - from);
  if (d <= 1) return 2.5;
  return Math.min(14, Math.max(4, 2.8 + d * 0.022));
}

export class MoveInEntryScene {
  private mount: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private world = new THREE.Group();
  private buildingScroll = new THREE.Group();
  private avatar: ChibiAvatarMesh;
  private elevatorCar: THREE.Group | null = null;
  private doorLeft: THREE.Object3D | null = null;
  private doorRight: THREE.Object3D | null = null;
  private shaftMarkers = new THREE.Group();
  private unitsRoot = new THREE.Group();
  private homeUnit: THREE.Group | null = null;
  private raf = 0;
  private disposed = false;
  private clock = new THREE.Clock();
  private callbacks: MoveInEntryCallbacks = {};

  private homeFloor: number;
  private phase: MoveInPhase = "walk-in";
  private phaseTime = 0;
  private displayFloor = APT_LOBBY_FLOOR;
  private lastTickFloor = APT_LOBBY_FLOOR;
  private doorClosed = 1;
  private rideDuration = 6;
  private shaftX = 1.9;

  private readonly path: PathKeyframe[] = [];

  constructor(mount: HTMLElement, homeFloor: number) {
    this.mount = mount;
    this.homeFloor = homeFloor;
    this.rideDuration = moveInRideDurationSec(APT_LOBBY_FLOOR, homeFloor);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PASTEL.bg);
    this.scene.fog = new THREE.Fog(PASTEL.bg, 80, 260);

    const aspect = Math.max(mount.clientWidth, 320) / Math.max(mount.clientHeight, 400);
    const frustum = 6.2;
    this.camera = new THREE.OrthographicCamera(
      (-frustum * aspect) / 2,
      (frustum * aspect) / 2,
      frustum / 2,
      -frustum / 2,
      0.1,
      80
    );
    this.camera.position.set(8, 6, 8);
    this.camera.lookAt(0, 2.5, 0);

    this.renderer = createAptRenderer(mount);
    mount.appendChild(this.renderer.domElement);

    this.addLights();
    this.buildWorld();
    stripShadows(this.world);
    this.buildPath();

    this.avatar = new ChibiAvatarMesh();
    this.avatar.rebuild(DEFAULT_CHIBI_AVATAR, "stand");
    this.avatar.root.scale.setScalar(0.9);
    this.world.add(this.avatar.root);
    this.scene.add(this.world);

    this.applyPath(0);
    this.setDoorProgress(1);
    this.callbacks.onFloorDisplay?.(APT_LOBBY_FLOOR);
    window.addEventListener("resize", this.onResize);
    this.callbacks.onPhaseChange?.("walk-in");
    this.loop();
  }

  setCallbacks(cb: MoveInEntryCallbacks) {
    this.callbacks = cb;
  }

  private buildPath() {
    this.path.push(
      { t: 0, x: -5.2, y: 0, z: 1.4, rotY: 0.15 },
      { t: 2.8, x: -1.2, y: 0, z: 0.9, rotY: 0.05 },
      { t: 4.2, x: 0.15, y: 0, z: 0.55, rotY: -0.1 },
      { t: 5.8, x: this.shaftX, y: 0.05, z: 0.15, rotY: -0.55 },
      { t: 6.8, x: this.shaftX, y: 0.05, z: 0.15, rotY: -0.55 },
      { t: 8.2, x: this.shaftX, y: 0.05, z: 0.15, rotY: -0.55 },
      { t: 9.4, x: 0.35, y: 0.05, z: 0.35, rotY: -0.2 },
      { t: 10.8, x: -0.15, y: 0.05, z: 0.45, rotY: 0 }
    );
  }

  private elevYForFloor(floor: number) {
    return (floor - APT_LOBBY_FLOOR) * DOLLHOUSE_FLOOR_H;
  }

  private buildShaftMarkers(shaftX: number) {
    this.shaftMarkers.name = "shaft-markers";
    for (let i = 0; i < 28; i++) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(DOLLHOUSE_ELEVATOR_W * 0.88, 0.025, 0.025),
        pastelMat(PASTEL.shellTrim)
      );
      line.position.set(shaftX, i * DOLLHOUSE_FLOOR_H, DOLLHOUSE_ELEVATOR_W * 0.43);
      this.shaftMarkers.add(line);
    }
    this.buildingScroll.add(this.shaftMarkers);
  }

  private buildWorld() {
    const lobby = buildLobbyEntrance();
    lobby.position.y = -DOLLHOUSE_FLOOR_H * 0.15;
    this.buildingScroll.add(lobby);

    const shaft = buildElevatorShaft(this.homeFloor, APT_LOBBY_FLOOR, Math.min(8, this.homeFloor));
    this.shaftX = (shaft.userData.shaftX as number | undefined) ?? 1.9;
    this.buildShaftMarkers(this.shaftX);
    this.buildingScroll.add(shaft);

    const car = shaft.getObjectByName("elevator-car") as THREE.Group | undefined;
    this.elevatorCar = car ?? null;
    if (car) {
      shaft.remove(car);
      car.position.set(this.shaftX, 0, 0);
      this.world.add(car);
      const left = car.getObjectByName("elevator-door-left");
      const right = car.getObjectByName("elevator-door-right");
      this.doorLeft = left === undefined ? null : left;
      this.doorRight = right === undefined ? null : right;
    }

    const homeUnit = buildDollhouseUnit({
      floorIndex: this.homeFloor,
      active: true,
      visited: false,
      seed: this.homeFloor * 13,
    });
    homeUnit.position.y = this.elevYForFloor(this.homeFloor);
    this.homeUnit = homeUnit;
    this.unitsRoot.add(homeUnit);
    this.buildingScroll.add(this.unitsRoot);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 10),
      pastelMat(PASTEL.floorWood)
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = false;
    this.world.add(ground);
    this.world.add(this.buildingScroll);
  }

  private addLights() {
    this.scene.add(new THREE.AmbientLight(0xfff8fc, 0.88));
    const sun = new THREE.DirectionalLight(0xfff0f8, 0.68);
    sun.position.set(6, 12, 8);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xe8f4ff, 0.35);
    fill.position.set(-5, 6, -4);
    this.scene.add(fill);
  }

  private setPhase(next: MoveInPhase) {
    if (this.phase === next) return;
    this.phase = next;
    this.phaseTime = 0;
    this.callbacks.onPhaseChange?.(next);
    if (next === "done") this.callbacks.onComplete?.();
  }

  private setDoorProgress(closed: number) {
    this.doorClosed = THREE.MathUtils.clamp(closed, 0, 1);
    this.callbacks.onDoorProgress?.(this.doorClosed);
    if (this.doorLeft) {
      this.doorLeft.position.x = THREE.MathUtils.lerp(DOOR_OPEN_LEFT, DOOR_CLOSED_LEFT, this.doorClosed);
    }
    if (this.doorRight) {
      this.doorRight.position.x = THREE.MathUtils.lerp(DOOR_OPEN_RIGHT, DOOR_CLOSED_RIGHT, this.doorClosed);
    }
  }

  private animateDoors(fromClosed: number, toClosed: number, t: number, duration: number) {
    const u = Math.min(1, t / duration);
    const eased = u * u * (3 - 2 * u);
    this.setDoorProgress(THREE.MathUtils.lerp(fromClosed, toClosed, eased));
  }

  private tickDisplayFloor(floor: number) {
    const clamped = Math.max(APT_LOBBY_FLOOR, Math.min(this.homeFloor, Math.round(floor)));
    if (clamped === this.lastTickFloor) return;
    this.lastTickFloor = clamped;
    this.displayFloor = clamped;
    this.callbacks.onFloorDisplay?.(clamped);
  }

  private syncRideVisuals(floorF: number) {
    this.buildingScroll.position.y = -this.elevYForFloor(floorF);
    this.shaftMarkers.position.y = -(floorF - APT_LOBBY_FLOOR) * DOLLHOUSE_FLOOR_H * 0.35;

    if (this.elevatorCar) {
      this.elevatorCar.position.y = 0;
      const wobble = this.phase === "elevator-ride" ? Math.sin(this.phaseTime * 14) * 0.004 : 0;
      this.elevatorCar.position.x = this.shaftX + wobble;
      this.elevatorCar.rotation.z = wobble * 0.8;
    }

    if (this.homeUnit) {
      this.homeUnit.visible = floorF >= this.homeFloor * 0.82;
    }

    this.camera.position.set(this.shaftX + 6.5, 5.8, 6.5);
    this.camera.lookAt(this.shaftX, 1.4, 0);
  }

  private avatarInCar() {
    this.avatar.root.position.set(this.shaftX, 0.05, 0.15);
    this.avatar.root.rotation.y = -0.55;
  }

  private applyPath(globalT: number) {
    const path = this.path;
    if (path.length === 0) return;
    if (globalT <= path[0].t) {
      const p = path[0];
      this.avatar.root.position.set(p.x, p.y, p.z);
      this.avatar.root.rotation.y = p.rotY;
      return;
    }
    if (globalT >= path[path.length - 1].t) {
      const p = path[path.length - 1];
      this.avatar.root.position.set(p.x, p.y, p.z);
      this.avatar.root.rotation.y = p.rotY;
      return;
    }
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      if (globalT >= a.t && globalT <= b.t) {
        const u = (globalT - a.t) / (b.t - a.t);
        const ease = u * u * (3 - 2 * u);
        this.avatar.root.position.set(
          THREE.MathUtils.lerp(a.x, b.x, ease),
          THREE.MathUtils.lerp(a.y, b.y, ease),
          THREE.MathUtils.lerp(a.z, b.z, ease)
        );
        this.avatar.root.rotation.y = THREE.MathUtils.lerp(a.rotY, b.rotY, ease);
        return;
      }
    }
  }

  private updatePhase(dt: number) {
    this.phaseTime += dt;
    const t = this.phaseTime;

    switch (this.phase) {
      case "walk-in":
        this.applyPath(t);
        this.avatar.animateWalk(t, true);
        if (t >= 4.2) this.setPhase("to-elevator");
        break;

      case "to-elevator":
        this.applyPath(4.2 + t);
        this.avatar.animateWalk(4.2 + t, true);
        this.setDoorProgress(1);
        if (t >= 1.6) this.setPhase("doors-opening-lobby");
        break;

      case "doors-opening-lobby":
        this.animateDoors(1, 0, t, 0.75);
        this.applyPath(5.8);
        this.avatar.animateWalk(t, false);
        if (t >= 0.75) this.setPhase("enter-elevator");
        break;

      case "enter-elevator":
        this.setDoorProgress(0);
        this.applyPath(5.8 + Math.min(t, 1));
        this.avatar.animateWalk(t, t < 0.85);
        if (t >= 1.1) this.setPhase("doors-closing");
        break;

      case "doors-closing":
        this.animateDoors(0, 1, t, 0.85);
        this.avatarInCar();
        this.avatar.animateWalk(t, false);
        this.tickDisplayFloor(APT_LOBBY_FLOOR);
        this.syncRideVisuals(APT_LOBBY_FLOOR);
        if (t >= 0.85) this.setPhase("elevator-ride");
        break;

      case "elevator-ride": {
        const u = Math.min(1, t / this.rideDuration);
        const eased = easeInOutQuint(u);
        const floorF = APT_LOBBY_FLOOR + (this.homeFloor - APT_LOBBY_FLOOR) * eased;
        this.tickDisplayFloor(floorF);
        this.setDoorProgress(1);
        this.avatarInCar();
        this.avatar.animateWalk(t, false);
        this.syncRideVisuals(floorF);

        if (u >= 1) {
          this.tickDisplayFloor(this.homeFloor);
          this.syncRideVisuals(this.homeFloor);
          this.setPhase("doors-opening");
        }
        break;
      }

      case "doors-opening":
        this.animateDoors(1, 0, t, 0.85);
        this.tickDisplayFloor(this.homeFloor);
        this.avatarInCar();
        this.avatar.animateWalk(t, false);
        this.syncRideVisuals(this.homeFloor);
        if (t >= 0.85) this.setPhase("exit-elevator");
        break;

      case "exit-elevator":
        this.setDoorProgress(0);
        this.buildingScroll.position.y = -this.elevYForFloor(this.homeFloor);
        if (this.elevatorCar) this.elevatorCar.position.y = 0;
        this.applyPath(8.2 + t * 0.6);
        this.avatar.animateWalk(t, t < 1);
        this.camera.position.set(8, 6, 8);
        this.camera.lookAt(0, 2.5, 0);
        if (t >= 1.4) this.setPhase("to-home");
        break;

      case "to-home":
        this.buildingScroll.position.y = -this.elevYForFloor(this.homeFloor);
        this.applyPath(9.4 + t * 0.75);
        this.avatar.animateWalk(9.4 + t, true);
        this.camera.position.set(8, 6, 8);
        this.camera.lookAt(0, 2.5, 0);
        if (t >= 1.6) this.setPhase("done");
        break;

      case "done":
        this.avatar.animateWalk(t, false);
        break;
    }
  }

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    this.updatePhase(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private onResize = () => {
    const w = this.mount.clientWidth;
    const h = this.mount.clientHeight;
    if (!w || !h) return;
    const aspect = w / h;
    const frustum = 6.2;
    this.camera.left = (-frustum * aspect) / 2;
    this.camera.right = (frustum * aspect) / 2;
    this.camera.top = frustum / 2;
    this.camera.bottom = -frustum / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    this.avatar.dispose();
    disposeGroup(this.world);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
