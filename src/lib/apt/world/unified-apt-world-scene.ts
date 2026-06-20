"use client";

import * as THREE from "three";
import type { FloorOccupant } from "@/actions/apt";
import { APT_DEFAULT_FLOOR, APT_LOBBY_FLOOR, APT_TOTAL_FLOORS } from "@/lib/apt/constants";
import { DollhouseBuildingScene, type DollhouseCallbacks, type FloorResident } from "@/lib/apt/bondee/dollhouse-scene";
import { IsometricHomeScene, type IsometricHomeCallbacks } from "@/lib/apt/bondee/isometric-home-scene";
import { PASTEL } from "@/lib/apt/bondee/dollhouse-meshes";
import { enableBondeeRenderer } from "@/lib/apt/bondee/bondee-mesh-utils";
import { cappedPixelRatio } from "@/lib/apt/bondee/scene-perf";
import {
  applyDayNightToScene,
  createSceneLighting,
  DayNightTicker,
  type SceneLightingRefs,
} from "@/lib/apt/day-night-environment";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import type { BondeeHomeState, ChibiAvatarConfig } from "@/lib/apt/bondee/types";
import { DEFAULT_CHIBI_AVATAR } from "@/lib/apt/bondee/types";
import type { AptSceneEmbed } from "./apt-scene-embed";
import { AptVisitSystem, type VisitTarget } from "./apt-visit-system";
import { resolveAptWorldVrmUrl } from "./apt-world-avatar";
import { disposeAptTextureAtlas } from "@/lib/apt/bondee/apt-texture-atlas";
import { AptWorldPerfManager, cullGroupByDistance } from "./apt-lod-manager";
import {
  buildCorridorFromPlan,
  type CorridorDoorSlot,
  findCorridorInteractables,
} from "./corridor-meshes";
import { buildCorridorGhosts } from "./corridor-mp-ghosts";
import { CorridorWalkController } from "./corridor-walk-controller";
import {
  buildElevatorHallInterior,
  updateElevatorFloorDisplay,
} from "./elevator-hall-interior";
import { buildLobbyParkingLevel } from "./lobby-parking-mesh";
import { LobbyWalkController } from "./lobby-walk-controller";
import { StairClimbController } from "./stair-climb-controller";
import {
  buildDistrictComplex,
  megaFloorToWorldY,
  type MegatowerFacade,
} from "./megatower-facade";
import { UnifiedCameraController } from "./unified-camera-controller";
import type { AptWorldMode, DoorState } from "./world-types";

export type UnifiedWorldCallbacks = DollhouseCallbacks & {
  onModeChange?: (mode: AptWorldMode) => void;
  onNearHomeDoor?: (canEnter: boolean, doorState: DoorState) => void;
  onVisitMessage?: (msg: string) => void;
  onVisitPhase?: (phase: string) => void;
  onVisitClear?: () => void;
};

export class UnifiedAptWorldScene {
  private mount: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private cameraCtrl: UnifiedCameraController;
  private districtSlot = new THREE.Group();
  private buildingSlot = new THREE.Group();
  private lobbySlot = new THREE.Group();
  private corridorSlot = new THREE.Group();
  private interiorSlot = new THREE.Group();
  private building!: DollhouseBuildingScene;
  private interior!: IsometricHomeScene;
  private districtComplex: ReturnType<typeof buildDistrictComplex> | null = null;
  private megafacade: MegatowerFacade | null = null;
  private lobbyMesh: THREE.Group | null = null;
  private lobbyWalk: LobbyWalkController | null = null;
  private corridorMesh: THREE.Group | null = null;
  private corridorWalk: CorridorWalkController | null = null;
  private corridorGhosts: THREE.Group | null = null;
  private corridorDoors: CorridorDoorSlot[] = [];
  private elevInterior: THREE.Group | null = null;
  private visitSystem = new AptVisitSystem();
  private mode: AptWorldMode = "district";
  private homeFloor: number;
  private homeRooms: AptRoom[];
  private homeState: BondeeHomeState;
  private avatarConfig: ChibiAvatarConfig;
  private vrmUrl: string | null = null;
  private doorOpen = true;
  private currentCorridorFloor = APT_DEFAULT_FLOOR;
  private floorOccupants: FloorOccupant[] = [];
  private ownUserId: string | null = null;
  private raf = 0;
  private disposed = false;
  private clock = new THREE.Clock();
  private needsRender = true;
  private paused = false;
  private transitionToInterior = 0;
  private callbacks: UnifiedWorldCallbacks = {};
  private pointer = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();
  private animPhase = 0;
  private visitToastCooldown = 0;
  private perf = new AptWorldPerfManager();
  private stairClimb = new StairClimbController();
  private stairTargetFloor = APT_DEFAULT_FLOOR;
  private focalPoint = new THREE.Vector3();
  private dayNight = new DayNightTicker();
  private sceneLighting!: SceneLightingRefs;

  constructor(
    mount: HTMLElement,
    opts: {
      homeFloor?: number;
      rooms: AptRoom[];
      homeState: BondeeHomeState;
      doorOpen?: boolean;
      userId?: string | null;
    }
  ) {
    this.mount = mount;
    this.homeFloor = opts.homeFloor ?? APT_DEFAULT_FLOOR;
    this.homeRooms = opts.rooms;
    this.doorOpen = opts.doorOpen ?? true;
    this.homeState = opts.homeState;
    this.avatarConfig = opts.homeState.avatar ?? DEFAULT_CHIBI_AVATAR;
    this.ownUserId = opts.userId ?? null;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PASTEL.bg);
    this.scene.fog = new THREE.Fog(PASTEL.bg, 14, 95);
    this.sceneLighting = createSceneLighting(this.scene);

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

    this.scene.add(this.districtSlot);
    this.scene.add(this.buildingSlot);
    this.scene.add(this.lobbySlot);
    this.scene.add(this.corridorSlot);
    this.scene.add(this.interiorSlot);

    this.districtComplex = buildDistrictComplex(this.homeFloor);
    this.megafacade = this.districtComplex.main;
    this.districtSlot.add(this.districtComplex.root);
    this.perf.registerCullRoot(this.districtSlot);
    for (const lod of this.districtComplex.sideLods) this.perf.registerLod(lod);

    const embedBase: Omit<AptSceneEmbed, "attachRoot"> = {
      sharedRenderer: this.renderer,
      parentScene: this.scene,
      externalLoop: true,
    };

    this.building = new DollhouseBuildingScene(mount, this.homeFloor, {
      ...embedBase,
      attachRoot: this.buildingSlot,
    });
    this.buildingSlot.visible = false;

    this.interior = new IsometricHomeScene(mount, opts.rooms, opts.homeState, {
      ...embedBase,
      attachRoot: this.interiorSlot,
    });

    this.cameraCtrl.attach(this.renderer.domElement);
    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("resize", this.onResize);
    this.syncLayerVisibility();
    this.loop();
    const { lighting } = this.dayNight.tick();
    applyDayNightToScene(this.scene, this.sceneLighting, lighting, this.renderer);
    this.callbacks.onModeChange?.("district");
    void resolveAptWorldVrmUrl().then((url) => {
      this.vrmUrl = url;
    });
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

  getLobbyWalk() {
    return this.lobbyWalk;
  }

  getVisitSystem() {
    return this.visitSystem;
  }

  isVisiting() {
    return this.visitSystem.isVisiting();
  }

  exitVisit() {
    if (!this.visitSystem.isVisiting()) return;
    this.clearVisit();
    if (this.mode === "interior") {
      this.interiorSlot.visible = false;
      this.interior.detachInput(this.renderer.domElement);
    }
    this.enterCorridor(this.homeFloor);
    this.callbacks.onVisitMessage?.("방문 종료 — 내 집 층 복도로 이동");
  }

  corridorUseElevator() {
    if (this.mode !== "corridor" || !this.corridorWalk?.getNearElevator()) return;
    this.building.setPaused(false);
    this.setMode("elevator");
    this.corridorWalk.avatar.setAction("elevator_idle");
    this.callbacks.onVisitMessage?.("엘리베이터 — 우측 패널에서 목적 층을 선택하세요");
  }

  updateHomeState(state: BondeeHomeState) {
    this.homeState = state;
    this.avatarConfig = state.avatar ?? DEFAULT_CHIBI_AVATAR;
    this.corridorWalk?.avatar.rebuild(this.avatarConfig);
    this.lobbyWalk?.avatar.rebuild(this.avatarConfig);
    if (!this.visitSystem.isVisiting()) {
      this.interior.setState(state);
    }
  }

  updateHomeRooms(rooms: AptRoom[]) {
    this.homeRooms = rooms;
    if (!this.visitSystem.isVisiting()) {
      this.interior.setRooms(rooms);
    }
  }

  setFloorOccupants(occupants: FloorOccupant[]) {
    this.floorOccupants = occupants;
    if (this.mode === "corridor") this.refreshCorridorGhosts();
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
      onFloorDisplay: (f) => {
        this.callbacks.onFloorDisplay?.(f);
        this.syncElevatorDisplays(f);
      },
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

  showDistrict() {
    this.visitSystem.clearVisit();
    this.building.setPaused(true);
    this.setMode("district");
  }

  showTower() {
    this.building.setPaused(false);
    this.setMode("tower");
  }

  showLobby() {
    if (this.mode === "interior") {
      this.interior.detachInput(this.renderer.domElement);
      this.interiorSlot.visible = false;
    }
    this.enterLobby();
  }

  goToFloor(floor: number, opts?: { force?: boolean }) {
    const clamped = Math.min(APT_TOTAL_FLOORS, Math.max(APT_LOBBY_FLOOR, floor));
    const atFloor =
      !this.building.isRiding() && Math.abs(this.building.getFloor() - clamped) < 0.01;

    if (clamped === APT_LOBBY_FLOOR && (opts?.force || this.mode === "district" || atFloor)) {
      this.enterLobby();
      return;
    }

    if (atFloor) {
      if (opts?.force) {
        this.enterCorridor(clamped);
        return;
      }
      this.building.setPaused(false);
      this.setMode("tower");
      return;
    }

    this.building.setPaused(false);
    this.setMode("elevator");
    this.building.setFloor(clamped);
  }

  /** HUD 「내 집」— 복도까지 이동 (같은 층이어도 진입) */
  goToMyHome() {
    this.clearVisit();
    if (this.mode === "interior" && !this.visitSystem.isVisiting()) return;

    if (this.mode === "interior") {
      this.interior.detachInput(this.renderer.domElement);
      this.interiorSlot.visible = false;
    }

    if (this.mode === "district") {
      this.flyToFloorFromDistrict(this.homeFloor);
      return;
    }

    this.goToFloor(this.homeFloor, { force: true });
  }

  /** 이웃 집 방문 — 복도→현관→내부 동일 흐름 */
  startVisit(target: VisitTarget) {
    this.visitSystem.startVisit(target);
    this.interior.setRooms(target.rooms);
    this.interior.setState(target.homeState);
    this.goToFloor(target.homeFloor);
  }

  clearVisit() {
    this.visitSystem.clearVisit();
    this.interior.setRooms(this.homeRooms);
    this.interior.setState(this.homeState);
    this.callbacks.onVisitClear?.();
  }

  knockOrBell() {
    if (this.visitSystem.isVisiting()) {
      const phase = this.visitSystem.getPhase();
      if (phase === "idle" || phase === "denied") {
        this.visitSystem.knock();
        this.corridorWalk?.knockOrBell("knock");
      } else if (phase === "waiting") {
        this.visitSystem.ringBell();
        this.corridorWalk?.knockOrBell("bell");
      }
      return;
    }
    this.corridorWalk?.knockOrBell("knock");
  }

  tryEnterHome() {
    if (this.mode !== "corridor" || !this.corridorWalk) return false;

    if (this.visitSystem.isVisiting()) {
      if (!this.visitSystem.canEnter()) return false;
      if (!this.corridorWalk.canEnterHome()) return false;
      this.beginInteriorTransition(true);
      return true;
    }

    if (!this.corridorWalk.canEnterHome()) return false;
    this.beginInteriorTransition(false);
    return true;
  }

  interactCorridorProp() {
    if (this.mode !== "corridor" || !this.corridorMesh || !this.corridorWalk) return;
    const avatar = this.corridorWalk.root.position;
    for (const prop of findCorridorInteractables(this.corridorMesh)) {
      const p = new THREE.Vector3();
      prop.getWorldPosition(p);
      if (avatar.distanceTo(p) > 1.6) continue;
      const kind = prop.userData.interact as string;
      if (kind === "cctv") this.callbacks.onVisitMessage?.("CCTV — 복도 실시간 모니터링");
      else if (kind === "fire-extinguisher") this.callbacks.onVisitMessage?.("소화기 — 비상 시 사용");
      else if (kind === "sign") this.callbacks.onVisitMessage?.(`${this.currentCorridorFloor}층 복도 안내`);
      break;
    }
  }

  exitToCorridor() {
    this.interior.detachInput(this.renderer.domElement);
    this.cameraCtrl.setEnabled(true);
    this.cameraCtrl.attach(this.renderer.domElement);
    this.interiorSlot.visible = false;
    this.corridorSlot.visible = true;
    this.buildingSlot.visible = false;
    this.districtSlot.visible = false;
    this.lobbySlot.visible = false;
    this.setMode("corridor");
    this.cameraCtrl.followObject(this.corridorWalk!.avatar.root);
  }

  /** 단지에서 층 클릭 → 외벽 관통 → 복도 */
  flyToFloorFromDistrict(floor: number) {
    if (floor === APT_LOBBY_FLOOR) {
      this.enterLobby();
      return;
    }
    this.currentCorridorFloor = floor;
    const y = megaFloorToWorldY(floor);
    const ext = new THREE.Vector3(-6, y + 8, 12);
    const thru = new THREE.Vector3(-2.8, y + 2.5, 4);
    const inner = new THREE.Vector3(-0.8, y + 1.8, 2.8);
    this.cameraCtrl.flyThroughWall(ext, thru, inner, 1.5);
    window.setTimeout(() => this.enterCorridor(floor), 1400);
  }

  private enterLobby() {
    this.stairClimb.cancel();
    if (this.lobbyMesh) {
      this.lobbySlot.remove(this.lobbyMesh);
      this.lobbyMesh = null;
    }
    this.lobbyWalk?.dispose();
    this.lobbyWalk = null;

    this.lobbyMesh = buildLobbyParkingLevel();
    this.lobbySlot.add(this.lobbyMesh);

    const elevInt = buildElevatorHallInterior(APT_LOBBY_FLOOR);
    const lobbyElev = this.lobbyMesh.getObjectByName("lobby-elevator-hall");
    if (lobbyElev) lobbyElev.add(elevInt);
    this.elevInterior = elevInt;

    this.lobbyWalk = new LobbyWalkController(this.avatarConfig, this.vrmUrl);
    const bounds = this.lobbyMesh.userData.walkBounds as {
      minX: number;
      maxX: number;
      minZ: number;
      maxZ: number;
    };
    if (bounds) this.lobbyWalk.setBounds(bounds);
    this.lobbyWalk.bindElevatorHall(this.lobbyMesh.getObjectByName("lobby-elevator-hall") ?? null);
    this.lobbySlot.add(this.lobbyWalk.root);

    this.building.setPaused(true);
    this.setMode("lobby");
    this.cameraCtrl.followObject(this.lobbyWalk.avatar.root, new THREE.Vector3(0, 1.5, 2.8));
  }

  lobbyUseElevator() {
    if (this.mode !== "lobby") return;
    this.goToFloor(this.homeFloor, { force: true });
  }

  lobbyUseStairs() {
    if (this.mode !== "lobby" || !this.lobbyWalk || this.stairClimb.active) return;
    const target =
      this.homeFloor > APT_LOBBY_FLOOR
        ? Math.min(this.homeFloor, APT_TOTAL_FLOORS)
        : Math.min(APT_LOBBY_FLOOR + 1, APT_TOTAL_FLOORS);
    this.stairTargetFloor = target;
    this.stairClimb.start(APT_LOBBY_FLOOR, target);
    this.lobbyWalk.setClimbingStairs(true);
    this.callbacks.onVisitMessage?.(`계단 — ${target}층으로 올라갑니다`);
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
    this.districtSlot.visible = m === "district";
    this.buildingSlot.visible = m === "tower" || m === "elevator";
    this.lobbySlot.visible = m === "lobby";
    this.corridorSlot.visible = m === "corridor";
    this.interiorSlot.visible = m === "interior" || this.transitionToInterior > 0;

    if (m === "corridor" && this.corridorWalk) {
      this.cameraCtrl.followObject(this.corridorWalk.avatar.root);
    } else if (m === "lobby" && this.lobbyWalk) {
      this.cameraCtrl.followObject(this.lobbyWalk.avatar.root, new THREE.Vector3(0, 1.5, 2.8));
    } else if (m === "district" || m === "tower") {
      this.cameraCtrl.clearFollow();
    }
  }

  private syncElevatorDisplays(floor: number) {
    if (this.elevInterior) updateElevatorFloorDisplay(this.elevInterior, floor);
    if (this.corridorMesh) {
      const hall = this.corridorMesh.getObjectByName("elevator-hall");
      if (hall) updateElevatorFloorDisplay(hall, floor);
    }
    this.building.getBuildingGroup()?.traverse((o) => {
      if (o.name === "elevator-hall-interior" || o.name === "elevator-floor-number") {
        updateElevatorFloorDisplay(o.parent ?? o, floor);
      }
    });
  }

  private enterCorridor(floor: number) {
    this.currentCorridorFloor = floor;
    this.building.setPaused(true);

    if (this.corridorMesh) {
      this.corridorSlot.remove(this.corridorMesh);
      this.corridorMesh = null;
    }
    if (this.corridorGhosts) {
      this.corridorSlot.remove(this.corridorGhosts);
      this.corridorGhosts = null;
    }
    this.corridorWalk?.dispose();
    this.corridorWalk = null;

    const rooms = this.visitSystem.isVisiting()
      ? this.visitSystem.getTarget()!.rooms
      : this.homeRooms;
    const isVisit = this.visitSystem.isVisiting();
    const visitDoorOpen = this.visitSystem.getTarget()?.doorOpen ?? false;

    this.corridorMesh = buildCorridorFromPlan(floor, rooms, 1, 3);
    this.corridorDoors = (this.corridorMesh.userData.doors as CorridorDoorSlot[]) ?? [];

    const home = this.corridorDoors.find((d) => d.isHome);
    if (home) {
      if (isVisit) {
        home.state = visitDoorOpen ? "open" : "locked";
        if (visitDoorOpen) {
          this.callbacks.onVisitMessage?.("현관문이 열려 있습니다 — 입장하세요");
        }
      } else {
        home.state = this.doorOpen ? "open" : "closed";
      }
    }

    const elevInt = buildElevatorHallInterior(floor);
    const elevHall = this.corridorMesh.getObjectByName("elevator-hall");
    if (elevHall) elevHall.add(elevInt);
    this.elevInterior = elevInt;

    this.corridorSlot.add(this.corridorMesh);
    this.corridorSlot.position.set(0, 0, 0);
    this.refreshCorridorGhosts();

    this.corridorWalk = new CorridorWalkController(this.avatarConfig, this.vrmUrl);
    this.corridorWalk.bindElevatorHall(elevHall ?? null);
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
    this.perf.collectOccluders(this.corridorMesh);

    if (this.mode !== "corridor") {
      const y = megaFloorToWorldY(floor);
      const exterior = new THREE.Vector3(-8, y + 12, 10);
      const through = new THREE.Vector3(-2.5, y + 2.2, 1.5);
      const interior = new THREE.Vector3(-0.8, y + 1.8, 2.8);
      this.cameraCtrl.flyThroughWall(exterior, through, interior, 1.35);
    }

    this.setMode("corridor", { skipCamera: this.mode === "corridor" });
    this.buildingSlot.visible = false;
    this.districtSlot.visible = false;
    this.lobbySlot.visible = false;
    this.syncElevatorDisplays(floor);
  }

  private refreshCorridorGhosts() {
    if (!this.corridorMesh) return;
    if (this.corridorGhosts) this.corridorSlot.remove(this.corridorGhosts);
    const onFloor = this.floorOccupants.filter((o) => o.homeFloor === this.currentCorridorFloor);
    this.corridorGhosts = buildCorridorGhosts(onFloor, this.ownUserId ?? undefined);
    this.corridorSlot.add(this.corridorGhosts);
  }

  private beginInteriorTransition(isVisit: boolean) {
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
      if (isVisit) this.callbacks.onVisitMessage?.("이웃 집에 입장했습니다");
    }, 1200);
  }

  private onPointerDown = (e: PointerEvent) => {
    if (this.mode !== "district" || !this.megafacade) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.cameraCtrl.camera);
    const floor = this.megafacade.pickFloor(this.raycaster.ray, this.districtComplex!.main.root);
    if (floor != null) this.flyToFloorFromDistrict(floor);
  };

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
    this.animPhase += dt;
    let anim = false;

    if (this.mode === "interior") {
      anim = this.interior.tickFrame() || anim;
    } else {
      if (this.buildingSlot.visible) anim = this.building.tickFrame() || anim;
      if (this.mode === "district" && this.megafacade) {
        anim = this.megafacade.tick(this.animPhase) || anim;
        cullGroupByDistance(this.districtSlot, this.cameraCtrl.camera, 120);
      }
      if (this.mode === "lobby" && this.lobbyWalk) {
        if (this.stairClimb.active) {
          const climb = this.stairClimb.tick(dt);
          this.lobbyWalk.setAvatarPose(climb.avatarX, climb.avatarY, climb.avatarZ, climb.avatarRot);
          anim = this.lobbyWalk.tick(dt) || anim;
          if (climb.done) {
            this.lobbyWalk.setClimbingStairs(false);
            this.enterCorridor(this.stairTargetFloor);
          }
        } else {
          anim = this.lobbyWalk.tick(dt) || anim;
        }
      }
      if (this.mode === "corridor" && this.corridorWalk) {
        anim = this.corridorWalk.tick(dt) || anim;
        this.focalPoint.copy(this.corridorWalk.avatar.root.position);
        anim = this.perf.tick(this.cameraCtrl.camera, this.focalPoint, dt) || anim;
        const visitResult = this.visitSystem.tick(dt);
        if (visitResult.message && this.visitToastCooldown <= 0) {
          this.callbacks.onVisitMessage?.(visitResult.message);
          this.callbacks.onVisitPhase?.(visitResult.phase);
          this.visitToastCooldown = 2.5;
          const home = this.corridorDoors.find((d) => d.isHome);
          if (home) {
            home.state = visitResult.doorState;
            this.corridorWalk.setDoorState(home.unitIndex, visitResult.doorState);
          }
        }
        this.visitToastCooldown -= dt;

        const canEnter = this.visitSystem.isVisiting()
          ? this.visitSystem.canEnter() && this.corridorWalk.canEnterHome()
          : this.corridorWalk.canEnterHome();
        const home = this.corridorDoors.find((d) => d.isHome);
        this.callbacks.onNearHomeDoor?.(canEnter, home?.state ?? "closed");
      }
      anim = this.cameraCtrl.tick(dt) || anim;
      if (this.mode === "district" || this.mode === "tower") {
        this.focalPoint.set(0, megaFloorToWorldY(this.homeFloor), 0);
        anim = this.perf.tick(this.cameraCtrl.camera, this.focalPoint, dt) || anim;
      }
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
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
    this.cameraCtrl.detach(this.renderer.domElement);
    this.lobbyWalk?.dispose();
    this.corridorWalk?.dispose();
    this.megafacade?.dispose();
    this.perf.dispose();
    disposeAptTextureAtlas();
    this.building.dispose();
    this.interior.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

export type { FloorResident, VisitTarget };
