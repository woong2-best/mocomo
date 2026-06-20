"use client";

import * as THREE from "three";
import { APT_DEFAULT_FLOOR, APT_LOBBY_FLOOR, APT_TOTAL_FLOORS } from "@/lib/apt/constants";
import { DollhouseBuildingScene, type DollhouseCallbacks, type FloorResident } from "@/lib/apt/bondee/dollhouse-scene";
import { IsometricHomeScene, type IsometricHomeCallbacks } from "@/lib/apt/bondee/isometric-home-scene";
import { PASTEL } from "@/lib/apt/bondee/dollhouse-meshes";
import { enableBondeeRenderer } from "@/lib/apt/bondee/bondee-mesh-utils";
import { cappedPixelRatio } from "@/lib/apt/bondee/scene-perf";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import type { BondeeHomeState, ChibiAvatarConfig } from "@/lib/apt/bondee/types";
import { DEFAULT_CHIBI_AVATAR } from "@/lib/apt/bondee/types";
import type { AptSceneEmbed } from "./apt-scene-embed";
import { buildCorridorFloor, type CorridorDoorSlot } from "./corridor-meshes";
import { CorridorWalkController } from "./corridor-walk-controller";
import { UnifiedCameraController } from "./unified-camera-controller";
import type { AptWorldMode, DoorState } from "./world-types";

export type UnifiedWorldCallbacks = DollhouseCallbacks & {
  onModeChange?: (mode: AptWorldMode) => void;
  onNearHomeDoor?: (canEnter: boolean, doorState: DoorState) => void;
};

export class UnifiedAptWorldScene {
  private mount: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private cameraCtrl: UnifiedCameraController;
  private buildingSlot = new THREE.Group();
  private corridorSlot = new THREE.Group();
  private interiorSlot = new THREE.Group();
  private building!: DollhouseBuildingScene;
  private interior!: IsometricHomeScene;
  private corridorMesh: THREE.Group | null = null;
  private corridorWalk: CorridorWalkController | null = null;
  private corridorDoors: CorridorDoorSlot[] = [];
  private mode: AptWorldMode = "district";
  private homeFloor: number;
  private homeState: BondeeHomeState;
  private avatarConfig: ChibiAvatarConfig;
  private doorOpen = true;
  private raf = 0;
  private disposed = false;
  private clock = new THREE.Clock();
  private needsRender = true;
  private paused = false;
  private transitionToInterior = 0;
  private callbacks: UnifiedWorldCallbacks = {};

  constructor(
    mount: HTMLElement,
    opts: {
      homeFloor?: number;
      rooms: AptRoom[];
      homeState: BondeeHomeState;
      doorOpen?: boolean;
    }
  ) {
    this.mount = mount;
    this.homeFloor = opts.homeFloor ?? APT_DEFAULT_FLOOR;
    this.doorOpen = opts.doorOpen ?? true;
    this.homeState = opts.homeState;
    this.avatarConfig = opts.homeState.avatar ?? DEFAULT_CHIBI_AVATAR;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PASTEL.bg);
    this.scene.fog = new THREE.Fog(PASTEL.bg, 14, 55);

    const aspect = Math.max(mount.clientWidth, 320) / Math.max(mount.clientHeight, 400);
    this.cameraCtrl = new UnifiedCameraController(aspect);

    this.renderer = new THREE.WebGLRenderer({
      antialias: window.devicePixelRatio <= 1.25,
      alpha: false,
      powerPreference: "high-performance",
    });
    enableBondeeRenderer(this.renderer);
    this.renderer.setPixelRatio(cappedPixelRatio());
    this.renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(this.renderer.domElement);

    this.scene.add(this.buildingSlot);
    this.scene.add(this.corridorSlot);
    this.scene.add(this.interiorSlot);
    this.corridorSlot.visible = false;
    this.interiorSlot.visible = false;

    const embedBase: Omit<AptSceneEmbed, "attachRoot"> = {
      sharedRenderer: this.renderer,
      parentScene: this.scene,
      externalLoop: true,
    };

    this.building = new DollhouseBuildingScene(mount, this.homeFloor, {
      ...embedBase,
      attachRoot: this.buildingSlot,
    });

    this.interior = new IsometricHomeScene(mount, opts.rooms, opts.homeState, {
      ...embedBase,
      attachRoot: this.interiorSlot,
    });

    this.cameraCtrl.attach(this.renderer.domElement);
    window.addEventListener("resize", this.onResize);
    this.loop();
    this.callbacks.onModeChange?.("district");
  }

  getMode() {
    return this.mode;
  }

  getBuilding() {
    return this.building;
  }

  getInterior() {
    return this.interior;
  }

  getCorridorWalk() {
    return this.corridorWalk;
  }

  updateHomeState(state: BondeeHomeState) {
    this.homeState = state;
    this.avatarConfig = state.avatar ?? DEFAULT_CHIBI_AVATAR;
    this.interior.setState(state);
  }

  private buildingCallbacks: DollhouseCallbacks = {};

  setCallbacks(cb: UnifiedWorldCallbacks) {
    this.callbacks = { ...this.callbacks, ...cb };
    this.syncBuildingCallbacks();
  }

  applyBuildingCallbacks(cb: DollhouseCallbacks) {
    this.buildingCallbacks = { ...this.buildingCallbacks, ...cb };
    this.syncBuildingCallbacks();
  }

  private syncBuildingCallbacks() {
    this.building.setCallbacks({
      ...this.buildingCallbacks,
      ...this.callbacks,
      onCorridorEnter: (floor) => this.enterCorridor(floor),
    });
  }

  setInteriorCallbacks(cb: IsometricHomeCallbacks) {
    this.interior.setCallbacks(cb);
  }

  setDoorOpen(open: boolean) {
    this.doorOpen = open;
    const home = this.corridorDoors.find((d) => d.isHome);
    if (home) {
      home.state = open ? "open" : "closed";
      this.corridorWalk?.setDoorState(home.unitIndex, open ? "open" : "closed");
    }
  }

  setPaused(v: boolean) {
    this.paused = v;
    this.building.setPaused(v);
    this.interior.setPaused(v);
  }

  /** 단지 전체 보기 */
  showDistrict() {
    this.building.setPaused(false);
    this.setMode("district");
  }

  /** 타워 층 뷰 */
  showTower() {
    this.building.setPaused(false);
    this.setMode("tower");
  }

  /** 엘리베이터로 층 이동 */
  goToFloor(floor: number) {
    this.building.setPaused(false);
    this.setMode("elevator");
    this.building.setFloor(floor);
  }

  /** 복도에서 집 현관문 입장 */
  tryEnterHome() {
    if (this.mode !== "corridor" || !this.corridorWalk?.canEnterHome()) return false;
    this.beginInteriorTransition();
    return true;
  }

  /** 집에서 복도로 나가기 */
  exitToCorridor() {
    this.interior.detachInput(this.renderer.domElement);
    this.cameraCtrl.setEnabled(true);
    this.cameraCtrl.attach(this.renderer.domElement);
    this.interiorSlot.visible = false;
    this.corridorSlot.visible = true;
    this.buildingSlot.visible = false;
    this.setMode("corridor");
    this.cameraCtrl.followObject(this.corridorWalk!.avatar.root);
  }

  private setMode(mode: AptWorldMode, opts?: { skipCamera?: boolean }) {
    this.mode = mode;
    this.callbacks.onModeChange?.(mode);
    if (!opts?.skipCamera) this.cameraCtrl.setMode(mode);
    if (mode === "interior") {
      this.cameraCtrl.setEnabled(false);
      this.cameraCtrl.detach(this.renderer.domElement);
      this.interior.attachInput(this.renderer.domElement);
    } else {
      this.interior.detachInput(this.renderer.domElement);
      this.cameraCtrl.setEnabled(mode !== "elevator");
      this.cameraCtrl.attach(this.renderer.domElement);
    }
    this.syncLayerVisibility();
    this.needsRender = true;
  }

  private syncLayerVisibility() {
    const m = this.mode;
    this.buildingSlot.visible = m === "district" || m === "tower" || m === "elevator";
    this.corridorSlot.visible = m === "corridor";
    this.interiorSlot.visible = m === "interior" || this.transitionToInterior > 0;
    if (m === "corridor" && this.corridorWalk) {
      this.cameraCtrl.followObject(this.corridorWalk.avatar.root);
    }
  }

  private enterCorridor(floor: number) {
    this.building.setPaused(true);
    if (this.corridorMesh) {
      this.corridorSlot.remove(this.corridorMesh);
      this.corridorMesh = null;
    }
    this.corridorMesh = buildCorridorFloor(floor, 1, 3);
    this.corridorDoors = (this.corridorMesh.userData.doors as CorridorDoorSlot[]) ?? [];
    const home = this.corridorDoors.find((d) => d.isHome);
    if (home) {
      home.state = this.doorOpen ? "open" : "closed";
    }
    this.corridorSlot.add(this.corridorMesh);
    this.corridorSlot.position.copy(this.buildingSlot.position);

    const elevHall = this.corridorMesh.getObjectByName("elevator-hall");

    this.corridorWalk = new CorridorWalkController(this.avatarConfig, "stand");
    this.corridorWalk.avatar.rebuild(this.avatarConfig, "stand");
    this.corridorWalk.bindElevatorHall(this.corridorMesh.getObjectByName("elevator-hall") ?? null);
    this.corridorWalk.setDoors(
      this.corridorDoors.map((d) => ({
        pivot: d.pivot,
        led: d.led,
        state: d.state,
        isHome: d.isHome,
        bell: d.bell,
        knocker: d.knocker,
        unitIndex: d.unitIndex,
      }))
    );
    this.corridorSlot.add(this.corridorWalk.root);

    const buildingPos = this.buildingSlot.position;
    const exterior = new THREE.Vector3(buildingPos.x - 8, buildingPos.y + 12, buildingPos.z + 10);
    const through = new THREE.Vector3(buildingPos.x - 2.5, buildingPos.y + 2.2, buildingPos.z + 1.5);
    const interior = new THREE.Vector3(buildingPos.x - 0.8, buildingPos.y + 1.8, buildingPos.z + 2.8);
    this.cameraCtrl.flyThroughWall(exterior, through, interior, 1.35);

    this.setMode("corridor", { skipCamera: true });
    this.buildingSlot.visible = false;
  }

  private beginInteriorTransition() {
    this.transitionToInterior = 1;
    this.interiorSlot.visible = true;
    this.interiorSlot.position.copy(this.corridorSlot.position);
    this.interiorSlot.position.x += 2.2;

    const homeDoor = this.corridorDoors.find((d) => d.isHome);
    const doorWorld = new THREE.Vector3();
    if (homeDoor) {
      homeDoor.pivot.getWorldPosition(doorWorld);
    } else {
      doorWorld.copy(this.corridorSlot.position).add(new THREE.Vector3(2.2, 1.4, 0));
    }
    const exterior = this.cameraCtrl.camera.position.clone();
    const through = doorWorld.clone().add(new THREE.Vector3(-0.3, 0.2, 0.5));
    const interior = this.interiorSlot.position.clone().add(new THREE.Vector3(0, 1.6, 0.8));
    this.cameraCtrl.flyThroughWall(exterior, through, interior, 1.15);

    window.setTimeout(() => {
      this.transitionToInterior = 0;
      this.corridorSlot.visible = false;
      this.setMode("interior");
    }, 1200);
  }

  private onResize = () => {
    const w = this.mount.clientWidth;
    const h = this.mount.clientHeight;
    if (!w || !h) return;
    this.cameraCtrl.resize(w, h);
    this.renderer.setSize(w, h);
    this.needsRender = true;
  };

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    if (this.paused) return;

    const dt = Math.min(0.05, this.clock.getDelta());
    let anim = false;

    if (this.mode === "interior") {
      anim = this.interior.tickFrame() || anim;
    } else {
      if (this.buildingSlot.visible) anim = this.building.tickFrame() || anim;
      if (this.mode === "corridor" && this.corridorWalk) {
        anim = this.corridorWalk.tick(dt) || anim;
        const canEnter = this.corridorWalk.canEnterHome();
        const home = this.corridorDoors.find((d) => d.isHome);
        this.callbacks.onNearHomeDoor?.(canEnter, home?.state ?? "closed");
      }
      anim = this.cameraCtrl.tick(dt) || anim;
    }

    if (anim || this.needsRender || this.transitionToInterior > 0) {
      this.needsRender = false;
      if (this.mode === "interior") {
        this.renderer.render(this.scene, this.interior.getActiveRenderCamera());
      } else {
        this.renderer.render(this.scene, this.cameraCtrl.camera);
      }
    }
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    this.cameraCtrl.detach(this.renderer.domElement);
    this.corridorWalk?.dispose();
    this.building.dispose();
    this.interior.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

export type { FloorResident };
