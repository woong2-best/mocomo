"use client";

import * as THREE from "three";
import type { FloorOccupant } from "@/actions/apt";
import { recordAptHomeVisit } from "@/actions/apt-presence";
import type { AptCommunityFeed } from "@/lib/apt/presence-types";
import { emptyAptDailyLoop } from "@/lib/apt/apt-daily-loop";
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
import { AptWorldPerfManager } from "./apt-lod-manager";
import {
  buildCorridorFromPlan,
  CORRIDOR_LEN,
  CORRIDOR_W,
  type CorridorDoorSlot,
  findCorridorInteractables,
} from "./corridor-meshes";
import { buildCorridorGhosts } from "./corridor-mp-ghosts";
import { CorridorElevatorSequence } from "./corridor-elevator-sequence";
import { CorridorWalkController } from "./corridor-walk-controller";
import { CorridorEnvironment } from "./corridor-environment";
import { WorldLivingFx } from "./world-living-fx";
import { HeroSceneFx } from "./apt-hero-fx";
import { AptSocialLayer } from "./apt-social-layer";
import { AptResidentAvatars } from "./apt-resident-avatars";
import type { AptSocialSnapshot } from "./apt-social-presence";
import { disposeAptWorldArt, makeCanvasLabel } from "./apt-world-art";
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
import type { VisitFunnelState } from "./visit-funnel-types";
import type { AptWorldMode, DoorState } from "./world-types";

export type UnifiedWorldCallbacks = DollhouseCallbacks & {
  onModeChange?: (mode: AptWorldMode) => void;
  onNearHomeDoor?: (canEnter: boolean, doorState: DoorState) => void;
  onVisitMessage?: (msg: string) => void;
  onVisitPhase?: (phase: string) => void;
  onVisitClear?: () => void;
  onVisitFunnelChange?: (funnel: VisitFunnelState | null) => void;
  onSocialPresenceChange?: (snapshot: AptSocialSnapshot) => void;
};

export class UnifiedAptWorldScene {
  private mount: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private cameraCtrl: UnifiedCameraController;
  private buildingSlot = new THREE.Group();
  private districtSlot = new THREE.Group();
  private lobbySlot = new THREE.Group();
  private corridorSlot = new THREE.Group();
  private interiorSlot = new THREE.Group();
  private building!: DollhouseBuildingScene;
  private interior!: IsometricHomeScene;
  private lobbyMesh: THREE.Group | null = null;
  private lobbyWalk: LobbyWalkController | null = null;
  private corridorMesh: THREE.Group | null = null;
  private corridorWalk: CorridorWalkController | null = null;
  private corridorGhosts: THREE.Group | null = null;
  private corridorDoors: CorridorDoorSlot[] = [];
  private elevInterior: THREE.Group | null = null;
  private visitSystem = new AptVisitSystem();
  private district: ReturnType<typeof buildDistrictComplex> | null = null;
  private districtMain: MegatowerFacade | null = null;
  private mode: AptWorldMode = "district";
  private homeFloor: number;
  private homeRooms: AptRoom[];
  private homeState: BondeeHomeState;
  private avatarConfig: ChibiAvatarConfig;
  private vrmUrl: string | null = null;
  private doorOpen = true;
  private currentCorridorFloor = APT_DEFAULT_FLOOR;
  private floorOccupants: FloorOccupant[] = [];
  private communityFeed: AptCommunityFeed = {
    occupants: [],
    recentVisitorsToHome: [],
    guestbookNames: [],
    popularHome: null,
    visitorRanking: [],
    mostVisitedToday: null,
    mostActiveFloor: null,
    plazaPerformers: [],
    elevatorBusy: false,
    mailboxUnread: 0,
    daily: emptyAptDailyLoop(),
  };
  private countryCode = "KR";
  private ownUserId: string | null = null;
  private raf = 0;
  private disposed = false;
  private clock = new THREE.Clock();
  private needsRender = true;
  private paused = false;
  private transitionToInterior = 0;
  private callbacks: UnifiedWorldCallbacks = {};
  private animPhase = 0;
  private visitToastCooldown = 0;
  private lastFunnelKey = "";
  private perf = new AptWorldPerfManager();
  private stairClimb = new StairClimbController();
  private corridorElevSeq = new CorridorElevatorSequence();
  private corridorEnv = new CorridorEnvironment();
  private lobbyEnv = new CorridorEnvironment();
  private worldLivingFx = new WorldLivingFx();
  private heroFx = new HeroSceneFx();
  private socialLayer: AptSocialLayer;
  private districtAvatars = new AptResidentAvatars();
  private lobbyAvatars = new AptResidentAvatars();
  private plazaAvatars = new AptResidentAvatars();
  private stairTargetFloor = APT_DEFAULT_FLOOR;
  private focalPoint = new THREE.Vector3();
  private dayNight = new DayNightTicker();
  private sceneLighting!: SceneLightingRefs;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private pointerDown: { x: number; y: number } | null = null;

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
    this.socialLayer = new AptSocialLayer(this.homeFloor, this.communityFeed, this.ownUserId);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PASTEL.bg);
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

    this.district = buildDistrictComplex(this.homeFloor, this.socialLayer.getActivityForTower(this.homeFloor, this.doorOpen));
    this.districtMain = this.district.main;
    this.districtSlot.add(this.district.root);
    this.socialLayer.applyToDistrict(this.district.root);
    this.district.root.add(this.districtAvatars.root);
    this.district.root.add(this.plazaAvatars.root);
    this.plazaAvatars.root.position.set(0, 0, 4.2);
    this.heroFx.scan(this.district.root);
    this.socialLayer.rescanLiveBadges(this.district.root);

    this.buildingSlot.position.set(0, 0, 0);
    this.lobbySlot.position.set(-14, 0, 10);
    this.corridorSlot.position.set(0, 0, 0);
    this.interiorSlot.position.set(0, 0, 0);

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
    this.bindDistrictInput();
    window.addEventListener("resize", this.onResize);
    this.building.setPaused(true);
    this.cameraCtrl.playDistrictIntro();
    this.setMode("district", { instant: true });
    this.loop();
    const { lighting } = this.dayNight.tick();
    applyDayNightToScene(this.scene, this.sceneLighting, lighting, this.renderer);
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

  corridorUseElevator(targetFloor?: number): boolean {
    if (this.mode !== "corridor") return false;
    if (!this.corridorWalk?.getNearElevator()) {
      this.callbacks.onVisitMessage?.("엘리베이터 앞으로 이동한 뒤 상호작용 버튼을 누르세요");
      return false;
    }
    if (this.corridorElevSeq.active) return false;

    const floor = targetFloor ?? this.homeFloor;
    const hall = this.corridorMesh?.getObjectByName("elevator-hall") ?? null;
    this.corridorElevSeq.bindHall(hall, this.scene);
    this.corridorWalk.avatar.setAction("elevator_idle");

    this.corridorElevSeq.start(this.currentCorridorFloor, floor, () => {
      this.corridorWalk?.avatar.setAction("stand");
      this.enterCorridor(floor);
      this.callbacks.onVisitMessage?.(`${floor}층 복도에 도착했습니다`);
    });
    this.callbacks.onVisitMessage?.("엘리베이터 호출 — 문이 열립니다");
    return true;
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

  setCommunityFeed(feed: AptCommunityFeed) {
    this.communityFeed = feed;
    this.floorOccupants = feed.occupants;
    this.socialLayer.update(feed, this.homeFloor, this.ownUserId);
    this.refreshDistrictActivity();
    this.syncResidentAvatars();
    if (this.mode === "corridor") {
      this.refreshCorridorGhosts();
      this.applyCorridorSocial();
    }
    if (this.mode === "lobby" && this.lobbyMesh) {
      this.socialLayer.applyToLobby(this.lobbyMesh);
      this.syncResidentAvatars();
    }
    this.callbacks.onSocialPresenceChange?.(this.socialLayer.getSnapshot());
  }

  /** @deprecated setCommunityFeed 사용 */
  setFloorOccupants(occupants: FloorOccupant[]) {
    this.setCommunityFeed({ ...this.communityFeed, occupants: occupants as AptCommunityFeed["occupants"] });
  }

  setPresenceContext(opts: { countryCode: string }) {
    this.countryCode = opts.countryCode.toUpperCase();
  }

  getPresencePayload(): {
    countryCode: string;
    mode: string;
    homeFloor: number;
    visitingUserId: string | null;
  } {
    return {
      countryCode: this.countryCode,
      mode: this.mode,
      homeFloor: this.mode === "corridor" ? this.currentCorridorFloor : this.homeFloor,
      visitingUserId: this.visitSystem.isVisiting() ? (this.visitSystem.getTarget()?.userId ?? null) : null,
    };
  }

  getSocialSnapshot(): AptSocialSnapshot {
    return this.socialLayer.getSnapshot();
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
    this.refreshDistrictActivity();
    const home = this.corridorDoors.find((d) => d.isHome);
    if (home) {
      home.state = open ? "open" : "closed";
      this.corridorWalk?.setDoorState(home.unitIndex, open ? "open" : "closed");
      if (home.innerGlow && home.innerGlow.material instanceof THREE.MeshBasicMaterial) {
        home.innerGlow.material.opacity = open ? 0.48 : 0;
      }
    }
  }

  private refreshDistrictActivity() {
    if (!this.district) return;
    this.districtSlot.remove(this.district.root);
    this.district.dispose();
    this.socialLayer.clearDistrict();
    this.district = buildDistrictComplex(this.homeFloor, this.socialLayer.getActivityForTower(this.homeFloor, this.doorOpen));
    this.districtMain = this.district.main;
    this.districtSlot.add(this.district.root);
    this.socialLayer.applyToDistrict(this.district.root);
    this.district.root.add(this.districtAvatars.root);
    this.district.root.add(this.plazaAvatars.root);
    this.plazaAvatars.root.position.set(0, 0, 4.2);
    this.heroFx.scan(this.district.root);
    this.socialLayer.rescanLiveBadges(this.district.root);
    this.syncResidentAvatars();
  }

  private syncResidentAvatars() {
    const occ = this.communityFeed.occupants;
    if (this.mode === "district" || this.mode === "tower") {
      this.districtAvatars.sync(occ, "district", this.ownUserId);
      this.plazaAvatars.sync(occ, "plaza", this.ownUserId);
    } else if (this.mode === "lobby") {
      this.lobbyAvatars.sync(occ, "lobby", this.ownUserId);
    }
  }

  private applyCorridorSocial() {
    if (!this.corridorMesh) return;
    const home = this.corridorDoors.find((d) => d.isHome);
    if (home) this.socialLayer.applyToHomeDoor(home.group);

    const mail = this.corridorMesh.getObjectByName("corridor-mailboxes");
    if (mail) {
      mail.children.filter((c) => c.name === "social-mailbox-dot").forEach((c) => mail.remove(c));
      const unread = this.socialLayer.getSnapshot().mailboxUnread;
      if (unread > 0) {
        const dot = new THREE.Mesh(
          new THREE.CircleGeometry(0.035, 10),
          new THREE.MeshBasicMaterial({ color: 0xef4444 })
        );
        dot.name = "social-mailbox-dot";
        dot.position.set(0.15, 0.35, 0.06);
        mail.add(dot);
      }
    }

    const onFloor = this.communityFeed.occupants.filter(
      (o) => o.homeFloor === this.currentCorridorFloor
    );
    for (const door of this.corridorDoors) {
      door.group.children
        .filter((c) => c.name === "social-visiting-badge" || c.name === "social-nameplate")
        .forEach((c) => door.group.remove(c));

      const occ = door.isHome
        ? onFloor.find((o) => o.userId === this.ownUserId)
        : onFloor.filter((o) => o.userId !== this.ownUserId)[door.unitIndex];

      if (occ) {
        const idHint =
          occ.identity?.tags[0]?.replace("#", "") ??
          occ.identity?.archetypeLabel.split(" ")[0];
        const label = idHint
          ? `${occ.displayName.slice(0, 5)} · ${idHint.slice(0, 6)}`
          : occ.displayName.slice(0, 8);
        const plate = new THREE.Mesh(
          new THREE.PlaneGeometry(0.22, 0.07),
          new THREE.MeshBasicMaterial({
            map: makeCanvasLabel(label, { bg: 0x334455, fg: "#ffffff", w: 112, h: 28 }),
            transparent: true,
            depthWrite: false,
          })
        );
        plate.name = "social-nameplate";
        plate.position.set(0, 1.62, 0.09);
        door.group.add(plate);
      }

      if (occ && (occ.activity?.hasGuest || (occ.isOnline && occ.doorOpen && !door.isHome))) {
        const badge = new THREE.Mesh(
          new THREE.PlaneGeometry(0.16, 0.06),
          new THREE.MeshBasicMaterial({
            map: makeCanvasLabel(occ.activity?.hasGuest ? "손님" : "방문중", {
              bg: 0x22c55e,
              fg: "#ffffff",
              w: 72,
              h: 24,
            }),
            transparent: true,
          })
        );
        badge.name = "social-visiting-badge";
        badge.position.set(0, 1.45, 0.08);
        door.group.add(badge);
      }
    }
  }

  setPaused(v: boolean) {
    this.paused = v;
    this.building.setPaused(v);
    this.interior.setPaused(v);
  }

  showDistrict() {
    if (this.mode === "interior") {
      this.interior.detachInput(this.renderer.domElement);
      this.interiorSlot.visible = false;
      this.transitionToInterior = 0;
    }

    if (this.mode === "corridor") {
      this.corridorWalk?.dispose();
      this.corridorWalk = null;
      if (this.corridorMesh) {
        this.corridorSlot.remove(this.corridorMesh);
        this.corridorMesh = null;
      }
      if (this.corridorGhosts) {
        this.corridorSlot.remove(this.corridorGhosts);
        this.corridorGhosts = null;
      }
    }

    if (this.mode === "lobby") {
      this.lobbyWalk?.dispose();
      this.lobbyWalk = null;
      if (this.lobbyMesh) {
        this.lobbySlot.remove(this.lobbyMesh);
        this.lobbyMesh = null;
      }
    }

    this.building.setPaused(true);
    this.corridorSlot.visible = false;
    this.lobbySlot.visible = false;
    this.interiorSlot.visible = false;
    this.setMode("district");
  }

  /** 단지 전경에서 건물 단면(타워) 뷰로 카메라 줌 — 페이지 전환 없음 */
  enterBuildingFromDistrict() {
    this.building.setPaused(false);
    this.districtSlot.visible = true;
    this.setMode("tower", { skipCamera: true });
    this.cameraCtrl.flyThroughWall(
      this.cameraCtrl.camera.position.clone(),
      new THREE.Vector3(4.2, 3.6, 10.5),
      new THREE.Vector3(6, 4.8, 9.5),
      1.35
    );
  }

  /** 1층 로비로 카메라 이동 후 보행 공간 진입 */
  enterLobbyFromDistrict() {
    this.building.setPaused(true);
    const ext = this.cameraCtrl.camera.position.clone();
    const through = new THREE.Vector3(-8, 3.2, 13);
    const interior = new THREE.Vector3(-13.5, 2.15, 14.8);
    this.cameraCtrl.flyThroughWall(ext, through, interior, 1.5);
    this.enterLobby();
  }

  showTower() {
    this.building.setPaused(false);
    this.setMode("tower");
  }

  showLobby() {
    if (this.mode === "interior") {
      this.interior.detachInput(this.renderer.domElement);
      this.interiorSlot.visible = false;
      this.transitionToInterior = 0;
    }

    if (this.mode === "corridor") {
      this.corridorWalk?.dispose();
      this.corridorWalk = null;
      if (this.corridorMesh) {
        this.corridorSlot.remove(this.corridorMesh);
        this.corridorMesh = null;
      }
      if (this.corridorGhosts) {
        this.corridorSlot.remove(this.corridorGhosts);
        this.corridorGhosts = null;
      }
    }

    this.building.setPaused(true);
    this.enterLobby();
    this.needsRender = true;
  }

  goToFloor(floor: number, opts?: { force?: boolean }) {
    const clamped = Math.min(APT_TOTAL_FLOORS, Math.max(APT_LOBBY_FLOOR, floor));
    const atFloor =
      !this.building.isRiding() && Math.abs(this.building.getFloor() - clamped) < 0.01;

    if (clamped === APT_LOBBY_FLOOR && (opts?.force || atFloor)) {
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

    this.callbacks.onVisitMessage?.(
      `내 집 ${this.homeFloor}층 — 복도 현관문까지 이동 후 「입장」 상호작용`
    );
    this.goToFloor(this.homeFloor, { force: true });
  }

  /** 이웃 집 방문 — 복도→현관→내부 동일 흐름 */
  startVisit(target: VisitTarget) {
    this.visitSystem.startVisit(target);
    this.interior.setRooms(target.rooms);
    this.interior.setState(target.homeState);
    this.callbacks.onVisitMessage?.(
      `${target.displayName}님 집 — ${target.homeFloor}층으로 이동합니다. 곧 복도에서 입장 안내가 이어집니다.`
    );
    this.emitVisitFunnelIfChanged();
    this.goToFloor(target.homeFloor);
  }

  clearVisit() {
    this.visitSystem.clearVisit();
    this.interior.setRooms(this.homeRooms);
    this.interior.setState(this.homeState);
    this.lastFunnelKey = "";
    this.callbacks.onVisitFunnelChange?.(null);
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
    this.lobbySlot.visible = false;
    this.districtSlot.visible = false;
    const doorWorld = new THREE.Vector3();
    this.corridorDoors.find((d) => d.isHome)?.pivot.getWorldPosition(doorWorld);
    const from = this.cameraCtrl.camera.position.clone();
    const mid = doorWorld.clone().add(new THREE.Vector3(-0.4, 0.2, 0.6));
    const to = doorWorld.clone().add(new THREE.Vector3(-1.2, 1.8, 2.4));
    this.cameraCtrl.flyThroughWall(from, mid, to, 1.1);
    this.setMode("corridor");
    this.cameraCtrl.followObject(this.corridorWalk!.avatar.root);
  }

  private enterLobby() {
    this.stairClimb.cancel();
    if (this.lobbyMesh) {
      this.lobbySlot.remove(this.lobbyMesh);
      this.lobbyMesh = null;
    }
    this.lobbyWalk?.dispose();
    this.lobbyWalk = null;
    this.lobbyEnv.dispose();

    this.lobbyMesh = buildLobbyParkingLevel();
    this.lobbySlot.add(this.lobbyMesh);

    const lobbyLen = (this.lobbyMesh.userData.lobbyLen as number) ?? 14;
    const lobbyW = (this.lobbyMesh.userData.lobbyW as number) ?? 10;
    const lobbyH = (this.lobbyMesh.userData.lobbyH as number) ?? 3.2;
    this.lobbyEnv.build(lobbyLen, lobbyW, lobbyH);
    this.lobbyEnv.applyDayNight(this.dayNight.getLighting());
    this.lobbySlot.add(this.lobbyEnv.root);
    this.worldLivingFx.scan(this.lobbyMesh);
    this.heroFx.scan(this.lobbyMesh);
    const heroBillboard = this.lobbyMesh.getObjectByName("hero-lobby-billboard");
    if (heroBillboard) heroBillboard.visible = false;
    this.socialLayer.applyToLobby(this.lobbyMesh);
    this.lobbyMesh.add(this.lobbyAvatars.root);
    this.syncResidentAvatars();

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
    this.cameraCtrl.followObject(this.lobbyWalk.avatar.root);
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

  private setMode(mode: AptWorldMode, opts?: { skipCamera?: boolean; instant?: boolean }) {
    this.mode = mode;
    this.callbacks.onModeChange?.(mode);
    if (!opts?.skipCamera) this.cameraCtrl.setMode(mode, !!opts?.instant);
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
    this.syncResidentAvatars();
    this.needsRender = true;
    if (this.visitSystem.isVisiting()) this.emitVisitFunnelIfChanged();
  }

  private syncLayerVisibility() {
    const m = this.mode;
    this.districtSlot.visible = m === "district" || m === "tower" || m === "elevator";
    this.buildingSlot.visible = m === "tower" || m === "elevator";
    this.lobbySlot.visible = m === "lobby";
    this.corridorSlot.visible = m === "corridor";
    this.interiorSlot.visible = m === "interior" || this.transitionToInterior > 0;

    if (m === "district") {
      this.cameraCtrl.clearFollow();
    } else if (m === "corridor" && this.corridorWalk) {
      this.cameraCtrl.followObject(this.corridorWalk.avatar.root);
    } else if (m === "lobby" && this.lobbyWalk) {
      this.cameraCtrl.followObject(this.lobbyWalk.avatar.root);
    } else if (m === "tower") {
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

  private computeVisitFunnel(): VisitFunnelState | null {
    if (!this.visitSystem.isVisiting()) return null;
    const target = this.visitSystem.getTarget()!;
    if (this.mode === "interior") return null;

    const hint = "잠시 기다리면 복도로 이어집니다. 멈춘 것이 아닙니다.";

    if (this.mode === "corridor" && this.corridorWalk && this.corridorMesh) {
      const len = (this.corridorMesh.userData.scaledLen as number) ?? CORRIDOR_LEN;
      const dist = this.corridorWalk.distanceToHomeDoor(len);
      const canEnter = this.visitSystem.canEnter() && this.corridorWalk.canEnterHome();
      const atDoor = dist < 1.05;
      if (canEnter) {
        return {
          targetName: target.displayName,
          targetFloor: target.homeFloor,
          step: 3,
          canEnter: true,
          atDoor: true,
          phaseLabel: "현관문 앞 — 입장할 수 있습니다",
          hint,
        };
      }
      if (atDoor) {
        return {
          targetName: target.displayName,
          targetFloor: target.homeFloor,
          step: 3,
          canEnter: false,
          atDoor: true,
          phaseLabel: "현관문 앞 — 조금만 더 가까이 이동",
          hint,
        };
      }
      return {
        targetName: target.displayName,
        targetFloor: target.homeFloor,
        step: 2,
        canEnter: false,
        atDoor: false,
        phaseLabel: "복도 끝 현관문(오른쪽)까지 이동",
        hint,
      };
    }

    const riding = this.mode === "elevator" || this.building.isRiding();
    return {
      targetName: target.displayName,
      targetFloor: target.homeFloor,
      step: 1,
      canEnter: false,
      atDoor: false,
      phaseLabel: riding
        ? `엘리베이터 · ${target.homeFloor}층으로 이동 중`
        : `${target.homeFloor}층으로 이동 준비 중`,
      hint,
    };
  }

  private emitVisitFunnelIfChanged() {
    const funnel = this.computeVisitFunnel();
    const key = funnel ? JSON.stringify(funnel) : "";
    if (key === this.lastFunnelKey) return;
    this.lastFunnelKey = key;
    this.callbacks.onVisitFunnelChange?.(funnel);
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
      } else {
        home.state = this.doorOpen ? "open" : "closed";
      }
    }

    const elevInt = buildElevatorHallInterior(floor);
    const elevHall = this.corridorMesh.getObjectByName("elevator-hall");
    if (elevHall) elevHall.add(elevInt);
    this.elevInterior = elevInt;

    this.corridorSlot.add(this.corridorMesh);
    this.corridorSlot.position.set(0, megaFloorToWorldY(floor), 0);

    const len = (this.corridorMesh.userData.scaledLen as number) ?? CORRIDOR_LEN;
    const width = (this.corridorMesh.userData.scaledW as number) ?? CORRIDOR_W;
    const height = (this.corridorMesh.userData.corridorH as number) ?? 2.65;
    this.corridorEnv.dispose();
    this.corridorEnv.build(len, width, height);
    this.corridorEnv.applyDayNight(this.dayNight.getLighting());
    this.corridorSlot.add(this.corridorEnv.root);
    this.worldLivingFx.scan(this.corridorMesh);

    this.refreshCorridorGhosts();
    this.applyCorridorSocial();

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
    if (visitDoorOpen && isVisit) {
      this.corridorWalk.reposition(len / 2 - 1.35, 0);
    } else if (!isVisit && floor === this.homeFloor && this.doorOpen) {
      this.corridorWalk.reposition(len / 2 - 1.35, 0);
    }
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
    this.lobbySlot.visible = false;
    this.syncElevatorDisplays(floor);
    this.emitVisitFunnelIfChanged();
  }

  private refreshCorridorGhosts() {
    if (!this.corridorMesh) return;
    if (this.corridorGhosts) this.corridorSlot.remove(this.corridorGhosts);
    const onFloor = this.communityFeed.occupants.filter((o) => o.homeFloor === this.currentCorridorFloor);
    this.corridorGhosts = buildCorridorGhosts(onFloor, this.ownUserId ?? undefined);
    this.corridorSlot.add(this.corridorGhosts);
  }

  private beginInteriorTransition(isVisit: boolean) {
    this.lastFunnelKey = "";
    this.callbacks.onVisitFunnelChange?.(null);
    this.transitionToInterior = 1;
    this.interiorSlot.visible = true;

    const homeDoor = this.corridorDoors.find((d) => d.isHome);
    const doorWorld = new THREE.Vector3();
    if (homeDoor) {
      homeDoor.pivot.getWorldPosition(doorWorld);
    } else {
      doorWorld.copy(this.corridorSlot.position).add(new THREE.Vector3(2.2, 1.4, 0));
    }

    const interiorAnchor = doorWorld.clone().add(new THREE.Vector3(0.85, 0, 0.15));
    this.interiorSlot.position.copy(interiorAnchor);
    this.interiorSlot.position.y = this.corridorSlot.position.y;

    const exterior = this.cameraCtrl.camera.position.clone();
    const through = doorWorld.clone().add(new THREE.Vector3(-0.15, 0.15, 0.35));
    const interiorCam = interiorAnchor.clone().add(new THREE.Vector3(-0.4, 1.55, 1.1));
    this.cameraCtrl.flyThroughWall(exterior, through, interiorCam, 1.45);

    if (isVisit) {
      const target = this.visitSystem.getTarget();
      if (target) {
        void recordAptHomeVisit(target.userId).then((res) => {
          if (res.ok && res.newBadges.length) {
            this.callbacks.onVisitMessage?.(`배지 획득: ${res.newBadges.join(", ")}`);
          }
        });
      }
    }

    window.setTimeout(() => {
      this.transitionToInterior = 0;
      this.corridorSlot.visible = false;
      this.districtSlot.visible = false;
      this.setMode("interior");
      if (isVisit) {
        const summary = this.interior.enterShowcaseTour(false);
        this.callbacks.onVisitMessage?.(
          `${summary.archetypeLabel} · ${summary.tagline}${summary.showcaseItemLabel ? ` · ${summary.showcaseItemLabel}` : ""}`
        );
      }
    }, 1450);
  }

  private bindDistrictInput() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener("pointerdown", this.onDistrictDown);
    canvas.addEventListener("pointerup", this.onDistrictUp);
  }

  private unbindDistrictInput() {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener("pointerdown", this.onDistrictDown);
    canvas.removeEventListener("pointerup", this.onDistrictUp);
  }

  private onDistrictDown = (e: PointerEvent) => {
    if (this.mode !== "district") return;
    if (this.cameraCtrl.isHeroIntroPlaying()) {
      this.cameraCtrl.skipHeroIntro();
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem("apt-hero-intro-seen", "1");
      return;
    }
    this.pointerDown = { x: e.clientX, y: e.clientY };
  };

  private onDistrictUp = (e: PointerEvent) => {
    if (this.mode !== "district" || !this.pointerDown || !this.districtMain) return;
    const dx = e.clientX - this.pointerDown.x;
    const dy = e.clientY - this.pointerDown.y;
    this.pointerDown = null;
    if (Math.hypot(dx, dy) > 8) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.cameraCtrl.camera);
    const floor = this.districtMain.pickFloor(this.raycaster.ray, this.district!.root);
    if (floor == null) {
      this.enterBuildingFromDistrict();
      return;
    }
    if (floor === APT_LOBBY_FLOOR) {
      this.enterLobbyFromDistrict();
      return;
    }
    this.building.setPaused(false);
    this.setMode("elevator");
    this.building.setFloor(floor);
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
    const { lighting } = this.dayNight.tick();
    applyDayNightToScene(this.scene, this.sceneLighting, lighting, this.renderer);
    if (this.mode === "corridor") this.corridorEnv.applyDayNight(lighting);
    if (this.mode === "lobby") this.lobbyEnv.applyDayNight(lighting);
    let anim = false;

    if (this.mode === "interior") {
      anim = this.interior.tickFrame() || anim;
    } else {
      if (this.mode === "district" && this.districtMain) {
        anim = this.districtMain.tick(this.animPhase) || anim;
        anim = this.heroFx.tick(this.animPhase, lighting) || anim;
        anim = this.socialLayer.tick(this.animPhase) || anim;
        anim = this.districtAvatars.tick(this.animPhase) || anim;
        anim = this.plazaAvatars.tick(this.animPhase) || anim;
      }
      if (this.buildingSlot.visible) anim = this.building.tickFrame() || anim;
      if (this.mode === "lobby" && this.lobbyWalk) {
        anim = this.lobbyEnv.tick(this.animPhase) || anim;
        anim =
          this.worldLivingFx.tick(this.animPhase, this.dayNight.getHour(), lighting.darkness) || anim;
        anim = this.heroFx.tick(this.animPhase, lighting) || anim;
        anim = this.socialLayer.tick(this.animPhase) || anim;
        anim = this.lobbyAvatars.tick(this.animPhase) || anim;
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
        anim = this.corridorEnv.tick(this.animPhase) || anim;
        anim =
          this.worldLivingFx.tick(this.animPhase, this.dayNight.getHour(), lighting.darkness) || anim;
        if (this.corridorElevSeq.active) {
          anim = this.corridorElevSeq.tick(dt) || anim;
          const phase = this.corridorElevSeq.getPhaseLabel();
          if (phase.includes("이동")) this.corridorWalk.avatar.setAction("elevator_ride");
          else if (phase.includes("탑승") || phase.includes("하차") || phase.includes("도착")) {
            this.corridorWalk.avatar.setAction("elevator_idle");
          }
        }
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
        if (this.visitSystem.isVisiting()) {
          this.emitVisitFunnelIfChanged();
        }
      }
      anim = this.cameraCtrl.tick(dt) || anim;
      if (this.mode === "tower") {
        this.focalPoint.set(0, megaFloorToWorldY(this.homeFloor), 0);
        anim = this.perf.tick(this.cameraCtrl.camera, this.focalPoint, dt) || anim;
      }
    }

    if (anim || this.needsRender || this.transitionToInterior > 0 || this.mode !== "interior") {
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
    this.unbindDistrictInput();
    this.cameraCtrl.detach(this.renderer.domElement);
    this.lobbyWalk?.dispose();
    this.corridorWalk?.dispose();
    this.perf.dispose();
    this.district?.dispose();
    this.corridorEnv.dispose();
    this.lobbyEnv.dispose();
    this.worldLivingFx.dispose();
    this.heroFx.dispose();
    this.socialLayer.dispose();
    this.districtAvatars.dispose();
    this.lobbyAvatars.dispose();
    this.plazaAvatars.dispose();
    disposeAptWorldArt();
    disposeAptTextureAtlas();
    this.building.dispose();
    this.interior.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

export type { FloorResident, VisitTarget };
