"use client";

import * as THREE from "three";
import { APT_LOBBY_FLOOR } from "@/lib/apt/constants";
import { ChibiAvatarMesh } from "./chibi-avatar";
import {
  DOLLHOUSE_ELEVATOR_W,
  DOLLHOUSE_FLOOR_H,
  DOLLHOUSE_UNIT_D,
  DOLLHOUSE_UNIT_W,
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
  | "enter-elevator"
  | "elevator-ride"
  | "exit-elevator"
  | "to-home"
  | "done";

export type MoveInEntryCallbacks = {
  onPhaseChange?: (phase: MoveInPhase) => void;
  onFloorDisplay?: (floor: number) => void;
  onComplete?: () => void;
};

const PHASE_LABEL: Record<MoveInPhase, string> = {
  "walk-in": "아파트 입구로 들어가는 중…",
  "to-elevator": "엘리베이터로 이동 중…",
  "enter-elevator": "엘리베이터 탑승",
  "elevator-ride": "엘리베이터 상승 중…",
  "exit-elevator": "목적 층 도착",
  "to-home": "내 집 현관으로 이동…",
  done: "입주 완료!",
};

export { PHASE_LABEL as MOVE_IN_PHASE_LABEL };

type PathKeyframe = { t: number; x: number; y: number; z: number; rotY: number };

export class MoveInEntryScene {
  private mount: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private world = new THREE.Group();
  private avatar: ChibiAvatarMesh;
  private elevatorCar: THREE.Object3D | null = null;
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
  private elevDisplayY = 0;
  private walkPhase = 0;

  private readonly path: PathKeyframe[] = [];

  constructor(mount: HTMLElement, homeFloor: number) {
    this.mount = mount;
    this.homeFloor = homeFloor;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PASTEL.bg);
    this.scene.fog = new THREE.Fog(PASTEL.bg, 14, 36);

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
      { t: 5.8, x: 1.55, y: 0, z: 0.15, rotY: -0.55 },
      { t: 6.8, x: 1.55, y: 0.05, z: 0.15, rotY: -0.55 },
      { t: 8.2, x: 1.55, y: this.elevYForFloor(this.homeFloor), z: 0.15, rotY: -0.55 },
      { t: 9.4, x: 0.35, y: this.elevYForFloor(this.homeFloor), z: 0.35, rotY: -0.2 },
      { t: 10.8, x: -0.15, y: this.elevYForFloor(this.homeFloor), z: 0.45, rotY: 0 }
    );
  }

  private elevYForFloor(floor: number) {
    return (floor - APT_LOBBY_FLOOR) * DOLLHOUSE_FLOOR_H;
  }

  private buildWorld() {
    const lobby = buildLobbyEntrance();
    lobby.position.y = -DOLLHOUSE_FLOOR_H * 0.15;
    this.world.add(lobby);

    const shaft = buildElevatorShaft(this.homeFloor, APT_LOBBY_FLOOR, Math.min(8, this.homeFloor));
    this.elevatorCar = shaft.getObjectByName("elevator-car") ?? null;
    this.world.add(shaft);

    const homeUnit = buildDollhouseUnit({
      floorIndex: this.homeFloor,
      active: true,
      visited: false,
      seed: this.homeFloor * 13,
    });
    homeUnit.position.y = this.elevYForFloor(this.homeFloor);
    this.homeUnit = homeUnit;
    this.unitsRoot.add(homeUnit);
    this.world.add(this.unitsRoot);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 10),
      pastelMat(PASTEL.floorWood)
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = false;
    this.world.add(ground);
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
        this.world.position.y = THREE.MathUtils.lerp(0, 0, 1);
        if (t >= 4.2) this.setPhase("to-elevator");
        break;

      case "to-elevator":
        this.applyPath(4.2 + t);
        this.avatar.animateWalk(4.2 + t, true);
        if (t >= 1.6) this.setPhase("enter-elevator");
        break;

      case "enter-elevator":
        this.applyPath(5.8 + Math.min(t, 1));
        this.avatar.animateWalk(t, t < 0.8);
        if (t >= 1.2) this.setPhase("elevator-ride");
        break;

      case "elevator-ride": {
        const rideDur = Math.min(6, 2 + this.homeFloor / 180);
        const u = Math.min(1, t / rideDur);
        const eased = u * u * (3 - 2 * u);
        const floorF = APT_LOBBY_FLOOR + (this.homeFloor - APT_LOBBY_FLOOR) * eased;
        this.displayFloor = Math.max(APT_LOBBY_FLOOR, Math.round(floorF));
        this.callbacks.onFloorDisplay?.(this.displayFloor);

        const targetY = this.elevYForFloor(floorF);
        const visualCarY = Math.min(targetY, DOLLHOUSE_FLOOR_H * 5.5);
        this.elevDisplayY = visualCarY;
        if (this.elevatorCar) this.elevatorCar.position.y = visualCarY;
        this.avatar.root.position.set(1.55, visualCarY + 0.05, 0.15);
        this.avatar.root.rotation.y = -0.55;
        this.avatar.animateWalk(t, false);

        if (this.homeUnit) {
          this.homeUnit.position.y = this.elevYForFloor(floorF);
          this.homeUnit.visible = floorF >= this.homeFloor * 0.85;
        }

        this.camera.position.set(8, visualCarY + 5.5, 8);
        this.camera.lookAt(1.2, visualCarY + 1.5, 0);

        if (u >= 1) {
          this.displayFloor = this.homeFloor;
          this.callbacks.onFloorDisplay?.(this.homeFloor);
          if (this.homeUnit) {
            this.homeUnit.position.y = this.elevYForFloor(this.homeFloor);
            this.homeUnit.visible = true;
          }
          this.setPhase("exit-elevator");
        }
        break;
      }

      case "exit-elevator":
        this.applyPath(8.2 + t * 0.6);
        this.avatar.animateWalk(t, t < 1);
        if (t >= 1.4) this.setPhase("to-home");
        break;

      case "to-home":
        this.applyPath(9.4 + t * 0.75);
        this.avatar.animateWalk(9.4 + t, true);
        this.camera.position.set(8, this.elevYForFloor(this.homeFloor) + 6, 8);
        this.camera.lookAt(0, this.elevYForFloor(this.homeFloor) + 2.5, 0);
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
    this.walkPhase += dt;
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
