"use client";

import * as THREE from "three";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { roomCenter, roomSize } from "@/lib/apt/building-from-plan";
import { ChibiAvatarMesh } from "./chibi-avatar";
import {
  appendFurniturePiece,
  buildHomeShellGroup,
  defaultItemsForRooms,
  disposeHomeGroup,
  itemWorldPos,
  migrateItems,
  sortFurnitureLoadOrder,
} from "./home-floor-meshes";
import {
  interactAnchorOffset,
  interactSpecForKind,
  actionLabelForKind,
  type FurnitureArchitecture,
} from "./furniture-architecture";
import { findRoomAt, isWalkable } from "./home-walkability";
import { wallSideFacesCamera, type HomeWallSide } from "./home-walls";
import { computeHomeDoorways, isNearDoor, type HomeDoorway } from "./home-doorways";
import type { BondeeHomeState, BondeePlacedItem, ChibiAvatarConfig, ChibiPose } from "./types";
import type { StudioDecorTool } from "@/studio/lib/apt-types";
import { hydrateStudioGltfMeshes } from "./studio-gltf-meshes";
import { enableBondeeRenderer, BONDEE_PALETTE } from "./bondee-mesh-utils";
import {
  applyDayNightToScene,
  createSceneLighting,
  DayNightTicker,
  LampLightManager,
  collectFloorLampSpecs,
  type SceneLightingRefs,
} from "@/lib/apt/day-night-environment";
import { getDayPhaseLabel } from "@/lib/apt/day-night";
import { GramophoneNoteFx } from "./gramophone-notes";
import { isInstrumentKind, type InstrumentKind } from "./instruments/types";
import { AcEffectManager, isAcRunning } from "./ac-effects";
import { RemoteChibiPlayersLayer, type RemoteHomePlayer } from "./remote-chibi-players-layer";
import { playInstrumentNote } from "./instruments/audio-engine";
import { cappedPixelRatio, stripShadows } from "./scene-perf";

const MOVE_SPEED = 2.4;
const INTERACT_DIST = 0.72;
const CAM_LERP = 6;
const ZOOM_MIN = 4.2;
const ZOOM_MAX = 8.5;
const CONSOLE_TRANSITION_SPEED = 1.35;
const CONSOLE_TV_SCALE = 1.22;
const CONSOLE_SEAT_DIST = 0.52;

export type ConsoleContentMode = "live" | "games" | null;
export type ConsoleModePhase = "off" | "entering" | "active" | "exiting";

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

type ConsoleAnchor = {
  itemId: string;
  seatX: number;
  seatZ: number;
  lookX: number;
  lookY: number;
  lookZ: number;
  avatarRotY: number;
};

const POSE_BY_KEY: Record<string, ChibiPose> = {
  "1": "stand",
  "2": "sit",
  "3": "lie",
  "4": "lie_prone",
  "5": "run",
  "6": "wave",
};

export type NearbyFurnitureInteract = {
  itemId: string;
  kind: BondeePlacedItem["kind"];
  architectures: FurnitureArchitecture[];
  poses: ChibiPose[];
  label: string;
  actionLabel: string;
  navigateHref?: string;
  composeAction?: boolean;
  singleAction?: boolean;
};

export type IsometricHomeCallbacks = {
  onItemSelect?: (id: string | null) => void;
  /** @deprecated TV는 nearbyFurniture + onNavigateInteract 사용 */
  onNearConsoleChange?: (near: boolean) => void;
  /** @deprecated */
  onGameConsoleInteract?: () => void;
  /** @deprecated */
  onConsoleModeChange?: (phase: ConsoleModePhase) => void;
  onNearGramophoneChange?: (near: boolean) => void;
  onGramophoneInteract?: () => void;
  onNearInstrumentChange?: (near: { itemId: string; kind: InstrumentKind } | null) => void;
  onInstrumentInteract?: (itemId: string, kind: InstrumentKind) => void;
  onNavigateInteract?: (href: string) => void;
  onComposeInteract?: () => void;
  onActiveRoomChange?: (roomId: string) => void;
  onNearbyFurnitureChange?: (nearby: NearbyFurnitureInteract | null) => void;
  onPoseChange?: (pose: ChibiPose) => void;
  onLightToggle?: (itemId: string, on: boolean) => void;
  onAcToggle?: (itemId: string, on: boolean) => void;
  onFurnitureOpenToggle?: (itemId: string, open: boolean) => void;
  onSmartphoneInteract?: () => void;
  onPositionChange?: (pos: { x: number; z: number; pose: ChibiPose; activity: string }) => void;
  onTimeChange?: (hour: number, phaseLabel: string) => void;
};

export class IsometricHomeScene {
  private mount: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private perspCamera: THREE.PerspectiveCamera;
  private homeRoot = new THREE.Group();
  private floorGroup: THREE.Group | null = null;
  private furnitureRoot: THREE.Group | null = null;
  private furnitureLoadGen = 0;
  private loadedFurnitureIds = new Set<string>();
  private furnitureLoadBusy = false;
  private pendingFurnitureLoad = false;
  private paused = false;
  private avatar: ChibiAvatarMesh;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private raf = 0;
  private disposed = false;
  private clock = new THREE.Clock();
  private rooms: AptRoom[] = [];
  private state: BondeeHomeState;
  private decorMode = false;
  private deleteMode = false;
  private selectedTool: BondeePlacedItem["kind"] | null = null;
  private selectedStudioTool: StudioDecorTool | null = null;
  private activeRoomId: string | null = null;
  private selectedItemId: string | null = null;
  private callbacks: IsometricHomeCallbacks = {};
  private animPhase = 0;
  private frustum = 6.6;
  private walkMode = true;
  private avatarX = 0;
  private avatarZ = 0;
  private avatarRotY = -0.5;
  private moveInput = { x: 0, z: 0 };
  private keys = new Set<string>();
  private nearConsole = false;
  private nearGramophone = false;
  private nearInstrument: { itemId: string; kind: InstrumentKind } | null = null;
  private gramophonePlaying = false;
  private instrumentPlaying = false;
  private noteFx: GramophoneNoteFx;
  private nearbyFurniture: NearbyFurnitureInteract | null = null;
  private interactPoseIdx = 0;
  private walking = false;
  private needsRender = true;
  private camYaw = Math.PI / 4;
  private camPitch = 0.55;
  private camDist = 6.4;
  private targetCamYaw = Math.PI / 4;
  private targetCamDist = 6.4;
  private dragging = false;
  private dragLast: { x: number; y: number } | null = null;
  private avatarShadow: THREE.Mesh;
  private sceneLighting: SceneLightingRefs;
  private dayNight = new DayNightTicker();
  private lampManager: LampLightManager;
  private acManager = new AcEffectManager();
  private remotePlayers: RemoteChibiPlayersLayer;
  private lastEmitPos = { x: NaN, z: NaN, pose: "", activity: "" };
  private doorways: HomeDoorway[] = [];
  private doorPivots = new Map<string, THREE.Object3D>();
  private furniturePivots = new Map<string, { pivot: THREE.Object3D; kind: "fridge" | "window" }>();
  private wallMeshes: THREE.Mesh[] = [];
  private readonly avatarWorldPos = new THREE.Vector3();
  private readonly camWorldPos = new THREE.Vector3();
  private readonly wallWorldPos = new THREE.Vector3();
  private readonly toCam = new THREE.Vector3();
  private readonly toWall = new THREE.Vector3();
  private readonly hornMouthPos = new THREE.Vector3();
  private readonly hornMouthScratch: THREE.Vector3[] = [];
  private readonly projPoint = new THREE.Vector3();
  private consolePhase: ConsoleModePhase = "off";
  private consoleContent: ConsoleContentMode = null;
  private consoleBlend = 0;
  private consoleAnchor: ConsoleAnchor | null = null;
  private consoleTvMesh: THREE.Object3D | null = null;
  private consoleTvBaseScale = 1;
  private activeRenderCamera: THREE.Camera;
  private readonly isoCamPos = new THREE.Vector3();
  private readonly isoLookAt = new THREE.Vector3();
  private readonly consoleCamPos = new THREE.Vector3();
  private readonly consoleLookAt = new THREE.Vector3();
  private readonly blendedCamPos = new THREE.Vector3();
  private readonly blendedLookAt = new THREE.Vector3();

  constructor(mount: HTMLElement, rooms: AptRoom[], initial: BondeeHomeState) {
    this.mount = mount;
    this.rooms = rooms;
    this.state = { ...initial, items: migrateItems(initial.items, rooms) };
    if (!this.state.items.length) {
      this.state.items = defaultItemsForRooms(rooms);
    }
    this.activeRoomId = initial.activeRoomId ?? rooms.find((r) => r.type === "living")?.id ?? rooms[0]?.id ?? null;
    this.doorways = computeHomeDoorways(rooms);
    this.avatar = new ChibiAvatarMesh();

    const living =
      rooms.find((r) => r.id === "entrance") ??
      rooms.find((r) => r.id === "living") ??
      rooms.find((r) => r.type === "living") ??
      rooms[0];
    if (living) {
      const c = roomCenter(living);
      this.avatarX = c.x + (living.id === "entrance" ? 0.15 : -0.3);
      this.avatarZ = c.z + 0.2;
    }

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(BONDEE_PALETTE.bg, 14, 28);

    const aspect = Math.max(mount.clientWidth, 320) / Math.max(mount.clientHeight, 400);
    this.camera = new THREE.OrthographicCamera(
      (-this.frustum * aspect) / 2,
      (this.frustum * aspect) / 2,
      this.frustum / 2,
      -this.frustum / 2,
      0.1,
      80
    );
    this.perspCamera = new THREE.PerspectiveCamera(52, aspect, 0.05, 80);
    this.activeRenderCamera = this.camera;
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio <= 1.25, alpha: false, powerPreference: "high-performance" });
    enableBondeeRenderer(this.renderer);
    this.renderer.setPixelRatio(cappedPixelRatio());
    this.renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(this.renderer.domElement);

    this.sceneLighting = createSceneLighting(this.scene);
    this.lampManager = new LampLightManager(this.homeRoot);
    this.updateDayNight(true);

    this.avatarShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.14, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 })
    );
    this.avatarShadow.rotation.x = -Math.PI / 2;
    this.avatarShadow.position.y = 0.01;
    this.homeRoot.add(this.avatarShadow);
    this.homeRoot.add(this.avatar.root);
    this.avatar.root.renderOrder = 20;
    this.avatar.root.traverse((o) => {
      if (o instanceof THREE.Mesh) o.renderOrder = 20;
    });
    this.scene.add(this.homeRoot);
    this.noteFx = new GramophoneNoteFx(this.homeRoot);
    this.remotePlayers = new RemoteChibiPlayersLayer(this.homeRoot);
    this.rebuildFloor();
    this.applyAvatar();

    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
    this.renderer.domElement.addEventListener("pointermove", this.onPointerMove);
    this.renderer.domElement.addEventListener("pointerup", this.onPointerUp);
    this.renderer.domElement.addEventListener("pointercancel", this.onPointerUp);
    this.renderer.domElement.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("resize", this.onResize);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.loop();
  }

  private requestRender() {
    this.needsRender = true;
  }

  setCallbacks(cb: IsometricHomeCallbacks) {
    this.callbacks = cb;
  }

  setRooms(rooms: AptRoom[]) {
    this.rooms = rooms;
    this.doorways = computeHomeDoorways(rooms);
    this.state = { ...this.state, items: migrateItems(this.state.items, rooms) };
    this.rebuildFloor();
  }

  setState(state: BondeeHomeState) {
    const nextItems = migrateItems(state.items, this.rooms);
    if (state.activeRoomId && state.activeRoomId !== this.activeRoomId) {
      this.activeRoomId = state.activeRoomId;
      this.refreshShellOnly();
    }
    const itemsChanged =
      nextItems.length !== this.state.items.length ||
      nextItems.some((it, i) => {
        const prev = this.state.items[i];
        return (
          !prev ||
          prev.id !== it.id ||
          prev.kind !== it.kind ||
          prev.roomId !== it.roomId ||
          prev.gx !== it.gx ||
          prev.gz !== it.gz ||
          prev.rot !== it.rot ||
          prev.studioAssetId !== it.studioAssetId
        );
      });
    if (itemsChanged) {
      this.syncFurnitureItems(nextItems);
      this.syncLampLights();
    }
    const avatarChanged =
      JSON.stringify(state.avatar) !== JSON.stringify(this.state.avatar) ||
      state.pose !== this.state.pose;
    const lightsChanged =
      JSON.stringify(state.lightsOn ?? {}) !== JSON.stringify(this.state.lightsOn ?? {});
    const acChanged = JSON.stringify(state.acOn ?? {}) !== JSON.stringify(this.state.acOn ?? {});
    this.state = { ...state, items: nextItems };
    if (lightsChanged) this.syncLampLights();
    if (acChanged) {
      this.acManager.syncAll(this.state.acOn);
      this.requestRender();
    }
    if (avatarChanged) this.applyAvatar();
    else this.requestRender();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (!paused) {
      this.updateDayNight(true);
      this.requestRender();
    }
  }

  isLightOn(itemId: string) {
    return !!this.state.lightsOn?.[itemId];
  }

  toggleLight(itemId: string, on: boolean) {
    const lightsOn = { ...(this.state.lightsOn ?? {}), [itemId]: on };
    this.state = { ...this.state, lightsOn };
    this.syncLampLights();
    this.checkFurnitureProximity();
    this.callbacks.onLightToggle?.(itemId, on);
    this.requestRender();
  }

  isAcOn(itemId: string) {
    return isAcRunning(this.state.acOn, itemId);
  }

  toggleAc(itemId: string, on: boolean) {
    const acOn = { ...(this.state.acOn ?? {}), [itemId]: on };
    this.state = { ...this.state, acOn };
    this.acManager.syncAll(acOn);
    this.checkFurnitureProximity();
    this.callbacks.onAcToggle?.(itemId, on);
    this.requestRender();
  }

  isFurnitureOpen(itemId: string) {
    return !!this.state.furnitureOpen?.[itemId];
  }

  toggleFurnitureOpen(itemId: string, open: boolean) {
    const furnitureOpen = { ...(this.state.furnitureOpen ?? {}), [itemId]: open };
    this.state = { ...this.state, furnitureOpen };
    this.checkFurnitureProximity();
    this.callbacks.onFurnitureOpenToggle?.(itemId, open);
    this.requestRender();
  }

  private registerFurniturePivot(mesh: THREE.Object3D, itemId: string) {
    const fridge = mesh.getObjectByName("fridge-door-pivot");
    if (fridge) {
      this.furniturePivots.set(itemId, { pivot: fridge, kind: "fridge" });
      return;
    }
    const windowSash = mesh.getObjectByName("window-sash-pivot");
    if (windowSash) {
      this.furniturePivots.set(itemId, { pivot: windowSash, kind: "window" });
    }
  }

  private updateFurniturePivots(delta: number) {
    let animating = false;
    for (const [itemId, entry] of this.furniturePivots) {
      const open = this.isFurnitureOpen(itemId);
      const target = entry.kind === "fridge" ? (open ? -Math.PI / 2.8 : 0) : open ? Math.PI / 3.5 : 0;
      if (Math.abs(entry.pivot.rotation.y - target) > 0.008) {
        animating = true;
        entry.pivot.rotation.y = THREE.MathUtils.lerp(entry.pivot.rotation.y, target, Math.min(1, delta * 6));
      } else {
        entry.pivot.rotation.y = target;
      }
    }
    return animating;
  }

  private updateDayNight(force = false) {
    const { hour, lighting, changed } = this.dayNight.tick();
    if (!force && !changed) return;
    applyDayNightToScene(this.scene, this.sceneLighting, lighting, this.renderer);
    this.lampManager.setDarkness(lighting.darkness);
    this.syncLampLights();
    this.callbacks.onTimeChange?.(hour, getDayPhaseLabel(hour));
    this.requestRender();
  }

  private syncLampLights() {
    const effective = this.dayNight.lampsEffective();
    const specs = collectFloorLampSpecs(
      this.state.items,
      this.rooms,
      this.state.lightsOn ?? {}
    );
    this.lampManager.sync(specs, effective);
    this.lampManager.updateGlows(this.state.lightsOn ?? {}, effective);
  }

  private registerLampGlow(mesh: THREE.Object3D, itemId: string) {
    if (mesh.userData.kind !== "floor_lamp") return;
    mesh.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material && "emissive" in (o.material as THREE.MeshStandardMaterial)) {
        this.lampManager.attachGlowMesh(itemId, o);
      }
    });
    this.syncLampLights();
  }

  getState(): BondeeHomeState {
    return { ...this.state, activeRoomId: this.activeRoomId ?? undefined };
  }

  setDecorMode(
    on: boolean,
    tool: BondeePlacedItem["kind"] | null,
    deleteMode = false,
    studioTool: StudioDecorTool | null = null
  ) {
    this.decorMode = on;
    this.deleteMode = deleteMode;
    this.selectedTool = studioTool ? null : tool;
    this.selectedStudioTool = studioTool;
    if (!on) {
      this.selectedTool = null;
      this.selectedStudioTool = null;
    }
    this.walkMode = !(on && (tool || studioTool || deleteMode));
    this.refreshShellOnly();
  }

  setActiveRoom(roomId: string) {
    if (this.activeRoomId === roomId) return;
    this.activeRoomId = roomId;
    this.refreshShellOnly();
  }

  setSelectedItem(id: string | null) {
    if (this.selectedItemId === id) return;
    this.selectedItemId = id;
    this.syncSelectionHighlight();
    this.callbacks.onItemSelect?.(id);
    this.requestRender();
  }

  setMoveInput(x: number, z: number) {
    this.moveInput.x = x;
    this.moveInput.z = z;
  }

  getConsoleContent(): ConsoleContentMode {
    return this.consoleContent;
  }

  syncRemotePlayers(players: RemoteHomePlayer[]) {
    this.remotePlayers.sync(players);
    if (players.length) this.requestRender();
  }

  playRemoteInstrumentNote(kind: string, midi: number, padIndex?: number) {
    if (!isInstrumentKind(kind)) return;
    void playInstrumentNote(kind, midi, padIndex);
    this.setInstrumentPlaying(true);
    setTimeout(() => this.setInstrumentPlaying(false), 200);
    this.requestRender();
  }

  private emitPositionIfChanged() {
    const pose = this.state.pose;
    const activity = this.walking ? "walk" : pose;
    const x = this.avatarX;
    const z = this.avatarZ;
    if (
      Math.abs(x - this.lastEmitPos.x) < 0.04 &&
      Math.abs(z - this.lastEmitPos.z) < 0.04 &&
      pose === this.lastEmitPos.pose &&
      activity === this.lastEmitPos.activity
    ) {
      return;
    }
    this.lastEmitPos = { x, z, pose, activity };
    this.callbacks.onPositionChange?.({ x, z, pose, activity });
  }

  getConsoleMode(): ConsoleModePhase {
    return this.consolePhase;
  }

  getConsoleBlend(): number {
    return this.consoleBlend;
  }

  enterConsoleMode(content: ConsoleContentMode = "games"): boolean {
    if (this.consolePhase !== "off") return false;
    this.consoleContent = content;
    const kinds = content === "live" ? (["tv_stand"] as const) : (["computer", "monitor", "tv_stand"] as const);
    const target = this.findNearestConsoleItem(...kinds);
    if (!target) return false;

    this.consoleAnchor = this.computeConsoleAnchor(target.item, target.room);
    this.consolePhase = "entering";
    this.consoleBlend = 0;
    this.walkMode = false;
    this.walking = false;

    this.avatarX = this.consoleAnchor.seatX;
    this.avatarZ = this.consoleAnchor.seatZ;
    this.avatarRotY = this.consoleAnchor.avatarRotY;
    this.state = { ...this.state, pose: "sit" };
    this.applyAvatar();
    this.callbacks.onPoseChange?.("sit");

    this.locateConsoleTvMesh(this.consoleAnchor.itemId);
    this.callbacks.onConsoleModeChange?.("entering");
    this.requestRender();
    return true;
  }

  exitConsoleMode() {
    if (this.consolePhase === "off" || this.consolePhase === "exiting") return;
    this.consolePhase = "exiting";
    this.callbacks.onConsoleModeChange?.("exiting");
    this.requestRender();
  }

  private finishExitConsoleMode() {
    this.consolePhase = "off";
    this.consoleContent = null;
    this.consoleBlend = 0;
    this.consoleAnchor = null;
    this.resetConsoleTvScale();
    this.consoleTvMesh = null;
    this.walkMode = !this.isDecorBlocking();
    this.avatar.root.visible = true;
    this.avatarShadow.visible = true;
    this.state = { ...this.state, pose: "stand" };
    this.applyAvatar();
    this.callbacks.onPoseChange?.("stand");
    this.callbacks.onConsoleModeChange?.("off");
    this.requestRender();
  }

  private isDecorBlocking() {
    return this.decorMode && (this.selectedTool || this.selectedStudioTool || this.deleteMode);
  }

  private canInteractWithConsole() {
    return this.nearConsole && !this.isDecorBlocking();
  }

  private canInteractWithGramophone() {
    return this.nearGramophone && !this.isDecorBlocking();
  }

  private canInteractWithInstrument() {
    return this.nearInstrument !== null && !this.isDecorBlocking();
  }

  setGramophonePlaying(playing: boolean) {
    if (this.gramophonePlaying === playing) return;
    this.gramophonePlaying = playing;
    this.requestRender();
  }

  setInstrumentPlaying(playing: boolean) {
    if (this.instrumentPlaying === playing) return;
    this.instrumentPlaying = playing;
    this.requestRender();
  }

  setPose(pose: ChibiPose) {
    if (this.state.pose === pose) return;
    this.state = { ...this.state, pose };
    this.walking = false;
    this.applyAvatar();
    this.callbacks.onPoseChange?.(pose);
    this.requestRender();
  }

  tryInteract() {
    if (this.consolePhase === "active") return;
    if (this.canInteractWithInstrument() && this.nearInstrument) {
      this.callbacks.onInstrumentInteract?.(this.nearInstrument.itemId, this.nearInstrument.kind);
      return;
    }
    if (this.canInteractWithGramophone()) {
      this.callbacks.onGramophoneInteract?.();
      return;
    }
    if (this.isDecorBlocking() || !this.nearbyFurniture) return;

    const target = this.nearbyFurniture;
    if (target.kind === "floor_lamp") {
      this.toggleLight(target.itemId, !this.isLightOn(target.itemId));
      return;
    }
    if (target.kind === "ac") {
      this.toggleAc(target.itemId, !this.isAcOn(target.itemId));
      return;
    }
    if (target.kind === "refrigerator" || target.kind === "window") {
      this.toggleFurnitureOpen(target.itemId, !this.isFurnitureOpen(target.itemId));
      return;
    }
    if (target.kind === "plant") {
      this.applyFurniturePose("wave", target);
      return;
    }
    if (target.kind === "smartphone") {
      this.callbacks.onSmartphoneInteract?.();
      return;
    }
    if (target.kind === "tv_stand") {
      this.enterConsoleMode("live");
      return;
    }
    if (target.kind === "computer" || target.kind === "monitor") {
      this.enterConsoleMode("games");
      return;
    }
    if (target.navigateHref) {
      this.callbacks.onNavigateInteract?.(target.navigateHref);
      return;
    }
    if (target.composeAction) {
      this.callbacks.onComposeInteract?.();
      return;
    }

    const poses = target.poses;
    if (!poses.length) return;

    const pose = target.singleAction ? poses[0] : poses[this.interactPoseIdx % poses.length];
    if (!target.singleAction) {
      this.interactPoseIdx = (this.interactPoseIdx + 1) % poses.length;
    }
    this.applyFurniturePose(pose, target);
  }

  private applyFurniturePose(pose: ChibiPose, target: NearbyFurnitureInteract) {
    const item = this.state.items.find((it) => it.id === target.itemId);
    const room = item ? this.rooms.find((r) => r.id === item.roomId) : null;
    if (item && room) {
      const p = itemWorldPos(item, room);
      this.avatarX = p.x;
      this.avatarZ = p.z + (pose === "sit" ? 0.12 : pose === "run" ? 0.08 : 0.05);
      this.avatarRotY = (item.rot * Math.PI) / 2;
      this.walking = false;
    }
    this.state = { ...this.state, pose };
    this.applyAvatar();
    this.callbacks.onPoseChange?.(pose);
    this.requestRender();
  }

  updateAvatar(config: ChibiAvatarConfig, pose: ChibiPose) {
    this.state = { ...this.state, avatar: config, pose };
    this.applyAvatar();
  }

  updateItems(items: BondeePlacedItem[]) {
    this.syncFurnitureItems(migrateItems(items, this.rooms));
    this.applyAvatar();
  }

  private itemSignature(item: BondeePlacedItem) {
    return `${item.id}:${item.roomId}:${item.gx}:${item.gz}:${item.rot}:${item.kind}:${item.studioAssetId ?? ""}`;
  }

  private syncFurnitureItems(nextItems: BondeePlacedItem[]) {
    const prevById = new Map(this.state.items.map((it) => [it.id, it]));
    const nextIds = new Set(nextItems.map((it) => it.id));

    for (const prev of this.state.items) {
      if (!nextIds.has(prev.id)) this.removeFurnitureById(prev.id);
    }

    for (const item of nextItems) {
      const prev = prevById.get(item.id);
      if (!prev) {
        this.appendItemIfNew(item);
        continue;
      }
      if (this.itemSignature(prev) !== this.itemSignature(item)) {
        this.removeFurnitureById(item.id);
        this.loadedFurnitureIds.delete(item.id);
        this.appendItemIfNew(item);
      }
    }

    this.state = { ...this.state, items: nextItems };
    this.requestRender();
    void this.hydrateStudioIfNeeded();
  }

  private removeFurnitureById(id: string) {
    if (!this.furnitureRoot) return;
    this.acManager.unregister(id);
    this.furniturePivots.delete(id);
    for (let i = this.furnitureRoot.children.length - 1; i >= 0; i--) {
      const child = this.furnitureRoot.children[i];
      if (child.userData.placedId === id) {
        this.furnitureRoot.remove(child);
        disposeHomeGroup(child);
        this.loadedFurnitureIds.delete(id);
      }
    }
  }

  private refreshShellOnly() {
    if (!this.floorGroup) return;
    const oldShell = this.floorGroup.getObjectByName("home-shell");
    if (oldShell) {
      this.floorGroup.remove(oldShell);
      disposeHomeGroup(oldShell);
    }
    const shell = buildHomeShellGroup({
      rooms: this.rooms,
      highlightRoomId: this.decorMode ? this.activeRoomId : null,
    });
    stripShadows(shell);
    this.floorGroup.add(shell);
    this.collectDoorPivots();
    this.collectWallMeshes();
    this.requestRender();
  }

  private collectWallMeshes() {
    this.wallMeshes = [];
    this.floorGroup?.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.isHomeWall) {
        this.wallMeshes.push(obj);
      }
    });
  }

  private updateWallOcclusion(dt: number) {
    if (!this.wallMeshes.length) return;

    this.avatarWorldPos.set(this.avatarX, 0.12, this.avatarZ);
    this.camera.getWorldPosition(this.camWorldPos);
    this.toCam.subVectors(this.camWorldPos, this.avatarWorldPos);
    const camLenSq = this.toCam.lengthSq();
    const camLen = camLenSq < 0.0001 ? 0 : Math.sqrt(camLenSq);

    for (const mesh of this.wallMeshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat || !("opacity" in mat)) continue;

      const wallSide = mesh.userData.wallSide as HomeWallSide | undefined;
      const facesCam = wallSide ? wallSideFacesCamera(wallSide, this.camYaw) : false;

      const isExterior =
        mesh.userData.wallType === "EXTERIOR" ||
        mesh.userData.wallKind === "exterior" ||
        mesh.userData.occlusionEnabled === true;
      const base = (mesh.userData.baseOpacity as number) ?? 0.35;
      const occlude = (mesh.userData.occludeOpacity as number) ?? 0.22;

      let blocksAvatar = false;
      if (camLen > 0.01 && isExterior) {
        mesh.getWorldPosition(this.wallWorldPos);
        this.wallWorldPos.y = 0.1;
        this.toWall.subVectors(this.wallWorldPos, this.avatarWorldPos);
        const wallDist = this.toWall.length();
        const t = this.toWall.dot(this.toCam) / camLenSq;
        if (t > 0.04 && t < 0.95 && wallDist < camLen * 0.98) {
          this.projPoint.copy(this.avatarWorldPos).addScaledVector(this.toCam, t);
          blocksAvatar = this.wallWorldPos.distanceTo(this.projPoint) < 0.52;
        }
      }

      let target = base;
      if (isExterior) {
        if (facesCam || blocksAvatar) target = occlude;
      } else if (facesCam) {
        target = 0.16;
      }

      const next = THREE.MathUtils.lerp(mat.opacity, target, Math.min(1, 14 * dt));
      if (Math.abs(next - mat.opacity) > 0.004) {
        mat.opacity = next;
        mat.transparent = next < 0.999;
        mat.depthWrite = isExterior && next > 0.55;
        mat.needsUpdate = true;
        this.needsRender = true;
      }
    }
  }

  private collectDoorPivots() {
    this.doorPivots.clear();
    this.floorGroup?.traverse((obj) => {
      if (!obj.userData.isHomeDoorLeaf || !obj.parent) return;
      this.doorPivots.set(obj.userData.doorId as string, obj.parent);
    });
  }

  private updateDoors(dt: number) {
    for (const door of this.doorways) {
      const pivot = this.doorPivots.get(door.id);
      if (!pivot) continue;
      const near = isNearDoor(this.avatarX, this.avatarZ, door);
      const base = (pivot.userData.baseRotY as number) ?? 0;
      const openSign = (pivot.userData.openSign as number) ?? door.swing;
      const openAngle = openSign * (Math.PI / 2.35);
      const target = near ? base + openAngle : base;
      const next = THREE.MathUtils.lerp(pivot.rotation.y, target, Math.min(1, 10 * dt));
      if (Math.abs(next - pivot.rotation.y) > 0.002) {
        pivot.rotation.y = next;
        this.needsRender = true;
      }
    }
  }

  private syncSelectionHighlight() {
    if (!this.furnitureRoot) return;
    this.furnitureRoot.traverse((obj) => {
      if (!obj.userData.placedId) return;
      const existing = obj.getObjectByName("selection-ring");
      if (existing) obj.remove(existing);
      if (obj.userData.placedId === this.selectedItemId) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.22, 0.32, 16),
          new THREE.MeshBasicMaterial({
            color: BONDEE_PALETTE.accent,
            transparent: true,
            opacity: 0.75,
            side: THREE.DoubleSide,
          })
        );
        ring.name = "selection-ring";
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.02;
        obj.add(ring);
      }
    });
  }

  private async hydrateStudioIfNeeded() {
    if (!this.floorGroup) return;
    await hydrateStudioGltfMeshes(this.floorGroup);
    this.requestRender();
  }

  private rebuildFloor() {
    if (this.floorGroup) {
      this.homeRoot.remove(this.floorGroup);
      disposeHomeGroup(this.floorGroup);
      this.floorGroup = null;
      this.furnitureRoot = null;
    }

    const loadGen = ++this.furnitureLoadGen;
    this.loadedFurnitureIds.clear();
    const visibleRooms = this.visibleRoomIdsNearAvatar();

    this.floorGroup = new THREE.Group();
    this.floorGroup.name = "home-floor-staged";

    const shell = buildHomeShellGroup({
      rooms: this.rooms,
      highlightRoomId: this.decorMode ? this.activeRoomId : null,
    });
    stripShadows(shell);
    this.floorGroup.add(shell);

    this.furnitureRoot = new THREE.Group();
    this.furnitureRoot.name = "home-furniture";
    this.furnitureRoot.renderOrder = 10;
    this.floorGroup.add(this.furnitureRoot);

    this.homeRoot.add(this.floorGroup);
    this.collectDoorPivots();
    this.collectWallMeshes();
    this.applyAvatar();
    this.requestRender();
    this.scheduleFurnitureLoad(visibleRooms);
  }

  private scheduleFurnitureLoad(priorityRooms: Set<string>) {
    const loadGen = this.furnitureLoadGen;
    if (this.furnitureLoadBusy) {
      this.pendingFurnitureLoad = true;
      return;
    }
    void this.loadFurnitureStaged(loadGen, priorityRooms);
  }

  /** Rooms near avatar + current room always visible */
  private visibleRoomIdsNearAvatar(): Set<string> {
    const ids = new Set<string>();
    const at = findRoomAt(this.avatarX, this.avatarZ, this.rooms);
    if (at) ids.add(at.id);
    if (this.activeRoomId) ids.add(this.activeRoomId);

    for (const room of this.rooms) {
      const c = roomCenter(room);
      const { w, d } = roomSize(room);
      if (Math.abs(this.avatarX - c.x) <= w / 2 + 0.6 && Math.abs(this.avatarZ - c.z) <= d / 2 + 0.6) {
        ids.add(room.id);
      }
    }

    if (ids.size === 0 && this.rooms[0]) ids.add(this.rooms[0].id);
    return ids;
  }

  private appendItemIfNew(item: BondeePlacedItem) {
    if (!this.furnitureRoot || this.loadedFurnitureIds.has(item.id)) return;
    appendFurniturePiece(this.furnitureRoot, item, this.rooms, {
      selectedItemId: this.selectedItemId,
    });
    this.loadedFurnitureIds.add(item.id);
    const mesh = this.furnitureRoot.children.find((c) => c.userData.placedId === item.id);
    if (mesh && item.kind === "floor_lamp") this.registerLampGlow(mesh, item.id);
    if (mesh && item.kind === "ac") this.registerAcEffects(mesh, item.id);
    if (mesh && (item.kind === "refrigerator" || item.kind === "window")) {
      this.registerFurniturePivot(mesh, item.id);
    }
  }

  private registerAcEffects(mesh: THREE.Object3D, itemId: string) {
    if (mesh.userData.kind !== "ac") return;
    this.acManager.register(itemId, mesh);
    this.acManager.syncAll(this.state.acOn);
  }

  private async loadFurnitureStaged(loadGen: number, priorityRooms: Set<string>) {
    this.furnitureLoadBusy = true;
    const BATCH = 4;

    try {
      const ordered = sortFurnitureLoadOrder(this.state.items, this.rooms, this.activeRoomId);
      const priority = ordered.filter((it) => priorityRooms.has(it.roomId));
      const deferred = ordered.filter((it) => !priorityRooms.has(it.roomId));

      for (const batch of [priority, deferred]) {
        for (let i = 0; i < batch.length; i += BATCH) {
          if (loadGen !== this.furnitureLoadGen || !this.furnitureRoot) return;
          await new Promise<void>((r) => requestAnimationFrame(() => r()));

          for (const item of batch.slice(i, i + BATCH)) {
            this.appendItemIfNew(item);
          }
          this.requestRender();
        }
      }

      if (loadGen !== this.furnitureLoadGen || !this.floorGroup) return;
      await hydrateStudioGltfMeshes(this.floorGroup);
      this.requestRender();
    } finally {
      this.furnitureLoadBusy = false;
      if (this.pendingFurnitureLoad) {
        this.pendingFurnitureLoad = false;
        const gen = this.furnitureLoadGen;
        void this.loadFurnitureStaged(gen, this.visibleRoomIdsNearAvatar());
      }
    }
  }

  private async appendMissingFurnitureForRooms(roomIds: Set<string>) {
    if (this.furnitureLoadBusy || !this.furnitureRoot) return;
    const missing = sortFurnitureLoadOrder(this.state.items, this.rooms, this.activeRoomId).filter(
      (it) => roomIds.has(it.roomId) && !this.loadedFurnitureIds.has(it.id)
    );
    if (missing.length === 0) return;

    for (let i = 0; i < missing.length; i += 3) {
      if (!this.furnitureRoot) return;
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      for (const item of missing.slice(i, i + 3)) {
        this.appendItemIfNew(item);
      }
      this.requestRender();
    }
  }

  private applyAvatar() {
    if (!this.walking) {
      this.avatar.rebuild(this.state.avatar, this.state.pose);
      this.avatar.root.traverse((o) => {
        if (o instanceof THREE.Mesh) o.renderOrder = 20;
      });
    }
    this.syncAvatarTransform();
  }

  private syncAvatarTransform() {
    this.avatar.root.position.set(this.avatarX, 0, this.avatarZ);
    this.avatar.root.rotation.y = this.avatarRotY;
    this.avatarShadow.position.set(this.avatarX, 0.01, this.avatarZ);
    this.avatarShadow.scale.setScalar(this.walking ? 0.85 : 1);
  }

  private updateCameraPosition() {
    const lookX = this.avatarX;
    const lookZ = this.avatarZ;
    const cx = lookX + Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.camDist;
    const cy = Math.sin(this.camPitch) * this.camDist + 1.2;
    const cz = lookZ + Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.camDist;
    this.isoCamPos.set(cx, cy, cz);
    this.isoLookAt.set(lookX, 0.35, lookZ);
    this.camera.position.copy(this.isoCamPos);
    this.camera.lookAt(this.isoLookAt);
  }

  private updateConsoleCameraTargets() {
    if (!this.consoleAnchor) return;
    const { seatX, seatZ, lookX, lookY, lookZ } = this.consoleAnchor;
    const fwdX = lookX - seatX;
    const fwdZ = lookZ - seatZ;
    const len = Math.hypot(fwdX, fwdZ) || 1;
    const nx = fwdX / len;
    const nz = fwdZ / len;
    this.consoleCamPos.set(seatX + nx * 0.04, 0.44, seatZ + nz * 0.04);
    this.consoleLookAt.set(lookX, lookY, lookZ);
  }

  private updateConsoleTransition(dt: number) {
    if (this.consolePhase === "off") return;

    this.updateIsoCameraState();

    if (this.consolePhase === "entering") {
      this.consoleBlend = Math.min(1, this.consoleBlend + dt * CONSOLE_TRANSITION_SPEED);
      if (this.consoleBlend >= 1) {
        this.consoleBlend = 1;
        this.consolePhase = "active";
        this.callbacks.onConsoleModeChange?.("active");
      }
    } else if (this.consolePhase === "exiting") {
      this.consoleBlend = Math.max(0, this.consoleBlend - dt * CONSOLE_TRANSITION_SPEED);
      if (this.consoleBlend <= 0) {
        this.finishExitConsoleMode();
        return;
      }
    }

    this.updateConsoleCameraTargets();
    const t = easeInOutCubic(this.consoleBlend);
    this.blendedCamPos.lerpVectors(this.isoCamPos, this.consoleCamPos, t);
    this.blendedLookAt.lerpVectors(this.isoLookAt, this.consoleLookAt, t);

    this.perspCamera.position.copy(this.blendedCamPos);
    this.perspCamera.lookAt(this.blendedLookAt);
    this.perspCamera.fov = THREE.MathUtils.lerp(48, 38, t);
    this.perspCamera.updateProjectionMatrix();

    this.updateConsoleTvScale(t);
    const hideAvatar = t > 0.2;
    this.avatar.root.visible = !hideAvatar;
    this.avatarShadow.visible = !hideAvatar;
    this.needsRender = true;
  }

  private findNearestConsoleItem(...kinds: BondeePlacedItem["kind"][]): { item: BondeePlacedItem; room: AptRoom } | null {
    const allowed = new Set(kinds);
    let best: { item: BondeePlacedItem; room: AptRoom; dist: number } | null = null;
    for (const item of this.state.items) {
      if (!allowed.has(item.kind)) continue;
      const room = this.rooms.find((r) => r.id === item.roomId);
      if (!room) continue;
      const p = itemWorldPos(item, room);
      const dist = Math.hypot(this.avatarX - (p.x + 0.08), this.avatarZ - (p.z + 0.22));
      if (dist >= INTERACT_DIST) continue;
      if (!best || dist < best.dist) best = { item, room, dist };
    }
    return best ? { item: best.item, room: best.room } : null;
  }

  private computeConsoleAnchor(item: BondeePlacedItem, room: AptRoom): ConsoleAnchor {
    const p = itemWorldPos(item, room);
    const rot = (item.rot * Math.PI) / 2;
    const fwdX = Math.sin(rot);
    const fwdZ = Math.cos(rot);
    const seatX = p.x - fwdX * CONSOLE_SEAT_DIST;
    const seatZ = p.z - fwdZ * CONSOLE_SEAT_DIST;
    return {
      itemId: item.id,
      seatX,
      seatZ,
      lookX: p.x,
      lookY: 0.57,
      lookZ: p.z + fwdZ * 0.08,
      avatarRotY: Math.atan2(fwdX, fwdZ),
    };
  }

  private locateConsoleTvMesh(itemId: string) {
    this.consoleTvMesh = null;
    if (!this.furnitureRoot) return;
    this.furnitureRoot.traverse((obj) => {
      if (obj.userData.placedId === itemId && !this.consoleTvMesh) {
        this.consoleTvMesh = obj;
        this.consoleTvBaseScale = obj.scale.x;
      }
      if (obj.name === "console-screen" && obj instanceof THREE.Mesh && obj.userData.placedId === itemId) {
        this.applyTvScreenGlow(obj as THREE.Mesh, this.consoleContent === "live");
      }
    });
  }

  private applyTvScreenGlow(screen: THREE.Mesh, on: boolean) {
    const mat = screen.material;
    if (!(mat instanceof THREE.MeshStandardMaterial)) return;
    mat.emissive.setHex(on ? 0x4488ff : 0x000000);
    mat.emissiveIntensity = on ? 0.65 : 0;
  }

  setTvScreenActive(active: boolean) {
    if (!this.furnitureRoot) return;
    this.furnitureRoot.traverse((obj) => {
      if (obj.name === "console-screen" && obj instanceof THREE.Mesh) {
        this.applyTvScreenGlow(obj, active);
      }
    });
    this.requestRender();
  }

  private updateConsoleTvScale(t: number) {
    if (!this.consoleTvMesh) return;
    const scale = this.consoleTvBaseScale * THREE.MathUtils.lerp(1, CONSOLE_TV_SCALE, t);
    this.consoleTvMesh.scale.setScalar(scale);
  }

  private resetConsoleTvScale() {
    if (!this.consoleTvMesh) return;
    this.consoleTvMesh.scale.setScalar(this.consoleTvBaseScale);
  }

  private lerpCamera(dt: number) {
    if (this.consolePhase !== "off") {
      this.updateIsoCameraState();
      return;
    }
    this.camYaw += (this.targetCamYaw - this.camYaw) * Math.min(1, dt * CAM_LERP);
    this.frustum += (this.targetCamDist - this.frustum) * Math.min(1, dt * CAM_LERP);
    this.updateIsoCameraState();
  }

  private updateIsoCameraState() {
    this.updateCameraPosition();
    const aspect = Math.max(this.mount.clientWidth, 320) / Math.max(this.mount.clientHeight, 400);
    this.camera.left = (-this.frustum * aspect) / 2;
    this.camera.right = (this.frustum * aspect) / 2;
    this.camera.top = this.frustum / 2;
    this.camera.bottom = -this.frustum / 2;
    this.camera.updateProjectionMatrix();
    this.perspCamera.aspect = aspect;
    this.perspCamera.updateProjectionMatrix();
  }

  private getConsolePositions(): { x: number; z: number }[] {
    const positions: { x: number; z: number }[] = [];
    for (const item of this.state.items) {
      if (item.kind !== "tv_stand") continue;
      const room = this.rooms.find((r) => r.id === item.roomId);
      if (!room) continue;
      const p = itemWorldPos(item, room);
      positions.push({ x: p.x + 0.08, z: p.z + 0.22 });
    }
    return positions;
  }

  private getGramophonePositions(): { x: number; z: number }[] {
    const positions: { x: number; z: number }[] = [];
    for (const item of this.state.items) {
      if (item.kind !== "gramophone") continue;
      const room = this.rooms.find((r) => r.id === item.roomId);
      if (!room) continue;
      const p = itemWorldPos(item, room);
      const rot = (item.rot * Math.PI) / 2;
      positions.push({
        x: p.x + Math.sin(rot) * 0.28,
        z: p.z + Math.cos(rot) * 0.28,
      });
    }
    return positions;
  }

  private getInstrumentProximityTargets(): { itemId: string; kind: InstrumentKind; x: number; z: number }[] {
    const positions: { itemId: string; kind: InstrumentKind; x: number; z: number }[] = [];
    for (const item of this.state.items) {
      if (!isInstrumentKind(item.kind)) continue;
      const room = this.rooms.find((r) => r.id === item.roomId);
      if (!room) continue;
      const p = itemWorldPos(item, room);
      positions.push({ itemId: item.id, kind: item.kind, x: p.x, z: p.z });
    }
    return positions;
  }

  private collectSoundEmitterPositions(): THREE.Vector3[] {
    this.hornMouthScratch.length = 0;
    if (!this.furnitureRoot) return this.hornMouthScratch;
    this.furnitureRoot.traverse((obj) => {
      if (obj.name !== "gramophone-horn-mouth" && obj.name !== "instrument-sound-emitter") return;
      obj.getWorldPosition(this.hornMouthPos);
      this.hornMouthScratch.push(this.hornMouthPos.clone());
    });
    return this.hornMouthScratch;
  }

  private spinGramophoneVinyls(dt: number) {
    if (!this.furnitureRoot) return;
    this.furnitureRoot.traverse((obj) => {
      if (obj.name === "gramophone-vinyl") {
        obj.rotation.y += dt * 2.8;
      }
    });
  }

  private updateMusicFx(dt: number) {
    const playing = this.gramophonePlaying || this.instrumentPlaying;
    const emitters = this.collectSoundEmitterPositions();
    const notesAlive = this.noteFx.tick(dt, playing, emitters);
    if (this.gramophonePlaying) this.spinGramophoneVinyls(dt);
    if (playing || notesAlive) this.needsRender = true;
  }

  private isInsideAnyRoom(x: number, z: number) {
    return isWalkable(x, z, this.rooms);
  }

  private syncActiveRoomFromAvatar() {
    const room = findRoomAt(this.avatarX, this.avatarZ, this.rooms);
    if (!room || room.id === this.activeRoomId) return;
    this.activeRoomId = room.id;
    this.callbacks.onActiveRoomChange?.(room.id);
    void this.appendMissingFurnitureForRooms(this.visibleRoomIdsNearAvatar());
  }

  private findNearbyFurniture(): NearbyFurnitureInteract | null {
    let best: NearbyFurnitureInteract | null = null;
    let bestDist = INTERACT_DIST;

    for (const item of this.state.items) {
      const spec = interactSpecForKind(item.kind);
      if (!spec) continue;
      const room = this.rooms.find((r) => r.id === item.roomId);
      if (!room) continue;
      const p = itemWorldPos(item, room);
      const off = interactAnchorOffset(item.kind, item.rot);
      const ax = p.x + off.dx;
      const az = p.z + off.dz;
      const dist = Math.hypot(this.avatarX - ax, this.avatarZ - az);
      if (dist >= bestDist) continue;

      bestDist = dist;
      best = {
        itemId: item.id,
        kind: item.kind,
        architectures: [],
        poses: spec.poses,
        label: item.studioLabel ?? item.kind,
        actionLabel: actionLabelForKind(item.kind, {
          lightOn: this.isLightOn(item.id),
          acOn: this.isAcOn(item.id),
          open: this.isFurnitureOpen(item.id),
        }),
        navigateHref: spec.href,
        composeAction: spec.composeAction,
        singleAction: spec.singleAction,
      };
    }
    return best;
  }

  private checkFurnitureProximity() {
    const nearby = this.findNearbyFurniture();
    if (
      nearby?.itemId === this.nearbyFurniture?.itemId &&
      nearby?.actionLabel === this.nearbyFurniture?.actionLabel
    ) {
      return;
    }
    this.nearbyFurniture = nearby;
    if (!nearby) this.interactPoseIdx = 0;
    this.callbacks.onNearbyFurnitureChange?.(nearby);
    const nearTv = nearby?.kind === "tv_stand";
    if (nearTv !== this.nearConsole) {
      this.nearConsole = nearTv;
      this.callbacks.onNearConsoleChange?.(nearTv);
    }
  }

  private updateMovement(dt: number) {
    if (!this.walkMode || this.consolePhase !== "off") return;

    let dx = this.moveInput.x;
    let dz = this.moveInput.z;

    const fwd = (this.keys.has("w") || this.keys.has("arrowup") ? 1 : 0) - (this.keys.has("s") || this.keys.has("arrowdown") ? 1 : 0);
    const str = (this.keys.has("d") || this.keys.has("arrowright") ? 1 : 0) - (this.keys.has("a") || this.keys.has("arrowleft") ? 1 : 0);
    if (fwd || str) {
      dx += str;
      dz += fwd;
    }

    const mag = Math.hypot(dx, dz);
    if (mag < 0.01) {
      this.walking = false;
      this.syncAvatarTransform();
      this.checkGramophoneProximity();
      this.checkInstrumentProximity();
      this.checkFurnitureProximity();
      return;
    }

    dx /= mag;
    dz /= mag;
    const nx = this.avatarX + dx * MOVE_SPEED * dt;
    const nz = this.avatarZ + dz * MOVE_SPEED * dt;

    if (this.isInsideAnyRoom(nx, nz)) {
      this.avatarX = nx;
      this.avatarZ = nz;
      this.avatarRotY = Math.atan2(dx, dz);
      this.walking = true;
      this.syncActiveRoomFromAvatar();
    } else if (this.isInsideAnyRoom(nx, this.avatarZ)) {
      this.avatarX = nx;
      this.avatarRotY = Math.atan2(dx, 0.01);
      this.walking = true;
      this.syncActiveRoomFromAvatar();
    } else if (this.isInsideAnyRoom(this.avatarX, nz)) {
      this.avatarZ = nz;
      this.avatarRotY = Math.atan2(0.01, dz);
      this.walking = true;
      this.syncActiveRoomFromAvatar();
    }

    this.syncAvatarTransform();
    this.checkGramophoneProximity();
    this.checkInstrumentProximity();
    this.checkFurnitureProximity();

    if (this.loadedFurnitureIds.size < this.state.items.length) {
      void this.appendMissingFurnitureForRooms(this.visibleRoomIdsNearAvatar());
    }

    this.emitPositionIfChanged();
  }

  private checkInstrumentProximity() {
    const instruments = this.getInstrumentProximityTargets();
    let best: { itemId: string; kind: InstrumentKind } | null = null;
    let bestDist = INTERACT_DIST;
    for (const c of instruments) {
      const d = Math.hypot(this.avatarX - c.x, this.avatarZ - c.z);
      if (d < bestDist) {
        bestDist = d;
        best = { itemId: c.itemId, kind: c.kind };
      }
    }
    const changed =
      best?.itemId !== this.nearInstrument?.itemId || best?.kind !== this.nearInstrument?.kind;
    if (changed) {
      this.nearInstrument = best;
      this.callbacks.onNearInstrumentChange?.(best);
    }
  }

  private checkGramophoneProximity() {
    const gramophones = this.getGramophonePositions();
    let near = false;
    for (const c of gramophones) {
      if (Math.hypot(this.avatarX - c.x, this.avatarZ - c.z) < INTERACT_DIST) {
        near = true;
        break;
      }
    }
    if (near !== this.nearGramophone) {
      this.nearGramophone = near;
      this.callbacks.onNearGramophoneChange?.(near);
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.isTypingTarget(e)) return;
    if (this.consolePhase !== "off") return;
    if (this.decorMode && (this.selectedTool || this.selectedStudioTool)) return;
    const k = e.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
      this.keys.add(k);
      e.preventDefault();
    }
    if (POSE_BY_KEY[k]) {
      this.setPose(POSE_BY_KEY[k]);
      e.preventDefault();
      return;
    }
    if (k === "e" || k === " " || k === "enter") {
      this.tryInteract();
      e.preventDefault();
    }
  };

  private isTypingTarget(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  private onPointerDown = (e: PointerEvent) => {
    if (e.button === 1 || e.button === 2 || e.altKey || e.shiftKey) {
      this.dragging = true;
      this.dragLast = { x: e.clientX, y: e.clientY };
      return;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    if (!this.decorMode) {
      const hits = this.raycaster.intersectObjects(this.floorGroup?.children ?? [], true);
      for (const hit of hits) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if (
            obj.userData.interactKind === "game_console" ||
            obj.userData.kind === "tv_stand" ||
            obj.userData.interactKind === "gramophone" ||
            obj.userData.interactKind === "instrument" ||
            interactSpecForKind(obj.userData.kind as BondeePlacedItem["kind"])
          ) {
            if (this.nearGramophone || this.nearInstrument || this.nearbyFurniture) this.tryInteract();
            return;
          }
          obj = obj.parent;
        }
      }
    }

    if (this.deleteMode || (this.decorMode && !this.selectedTool && !this.selectedStudioTool)) {
      const hits = this.raycaster.intersectObjects(this.floorGroup?.children ?? [], true);
      for (const hit of hits) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if (obj.userData.placedId) {
            const id = obj.userData.placedId as string;
            this.updateItems(this.state.items.filter((i) => i.id !== id));
            this.setSelectedItem(null);
            return;
          }
          obj = obj.parent;
        }
      }
      return;
    }

    if (!this.decorMode || (!this.selectedTool && !this.selectedStudioTool) || !this.activeRoomId) return;

    const room = this.rooms.find((r) => r.id === this.activeRoomId);
    if (!room) return;

    const floorMesh = this.floorGroup?.getObjectByName(`floor-${this.activeRoomId}`);
    if (!floorMesh) return;

    const hits = this.raycaster.intersectObject(floorMesh);
    if (!hits.length) return;

    const p = hits[0].point;
    const c = roomCenter(room);
    const gx = Math.round((p.x - c.x) / 0.38);
    const gz = Math.round((p.z - c.z) / 0.38);
    if (Math.abs(gx) > 3 || Math.abs(gz) > 3) return;

    const id = `item-${Date.now()}`;
    const base = {
      id,
      roomId: this.activeRoomId,
      gx,
      gz,
      rot: 0 as const,
    };

    const items = this.selectedStudioTool
      ? [
          ...this.state.items,
          {
            ...base,
            kind: "plant" as const,
            studioAssetId: this.selectedStudioTool.studioAssetId,
            glbUrl: this.selectedStudioTool.glbUrl,
            studioLabel: this.selectedStudioTool.name,
          },
        ]
      : [...this.state.items, { ...base, kind: this.selectedTool! }];
    this.updateItems(items);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.consolePhase !== "off") return;
    if (!this.dragging || !this.dragLast) return;
    const dx = e.clientX - this.dragLast.x;
    const dy = e.clientY - this.dragLast.y;
    this.dragLast = { x: e.clientX, y: e.clientY };
    this.targetCamYaw -= dx * 0.008;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.004, 0.35, 0.75);
  };

  private onPointerUp = () => {
    this.dragging = false;
    this.dragLast = null;
  };

  private onWheel = (e: WheelEvent) => {
    if (this.consolePhase !== "off") return;
    e.preventDefault();
    this.targetCamDist = THREE.MathUtils.clamp(this.targetCamDist + e.deltaY * 0.004, ZOOM_MIN, ZOOM_MAX);
  };

  private onResize = () => {
    const w = this.mount.clientWidth;
    const h = this.mount.clientHeight;
    if (!w || !h) return;
    const aspect = w / h;
    this.camera.left = (-this.frustum * aspect) / 2;
    this.camera.right = (this.frustum * aspect) / 2;
    this.camera.top = this.frustum / 2;
    this.camera.bottom = -this.frustum / 2;
    this.camera.updateProjectionMatrix();
    this.perspCamera.aspect = aspect;
    this.perspCamera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.requestRender();
  };

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    if (this.paused) return;
    this.updateDayNight();
    const dt = this.clock.getDelta();
    this.animPhase += dt;
    this.updateMovement(dt);
    this.updateDoors(dt);
    if (this.updateFurniturePivots(dt)) this.needsRender = true;
    this.updateWallOcclusion(dt);
    this.updateMusicFx(dt);
    this.updateConsoleTransition(dt);
    if (this.acManager.hasUnits() && this.acManager.tick(this.animPhase, this.state.acOn)) {
      this.needsRender = true;
    }
    const camMoving =
      this.consolePhase !== "off" ||
      Math.abs(this.targetCamYaw - this.camYaw) > 0.002 ||
      Math.abs(this.targetCamDist - this.frustum) > 0.02;
    this.lerpCamera(dt);

    if (this.consolePhase !== "off") {
      this.activeRenderCamera = this.perspCamera;
      this.needsRender = true;
    } else if (this.consoleBlend > 0.001) {
      this.activeRenderCamera = this.perspCamera;
    } else {
      this.activeRenderCamera = this.camera;
    }

    if (this.walking) {
      this.avatar.animateWalk(this.animPhase, true);
      this.needsRender = true;
    } else {
      this.avatar.animateWalk(this.animPhase, false);
      if ((this.nearbyFurniture || this.canInteractWithGramophone() || this.canInteractWithInstrument()) && this.consolePhase === "off") {
        this.avatar.root.rotation.y = THREE.MathUtils.lerp(this.avatar.root.rotation.y, Math.PI, 0.05);
        this.needsRender = true;
      }
    }

    if (camMoving || this.dragging) this.needsRender = true;
    if (!this.needsRender) return;
    this.needsRender = false;
    this.renderer.render(this.scene, this.activeRenderCamera);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
    this.renderer.domElement.removeEventListener("pointermove", this.onPointerMove);
    this.renderer.domElement.removeEventListener("pointerup", this.onPointerUp);
    this.renderer.domElement.removeEventListener("pointercancel", this.onPointerUp);
    this.renderer.domElement.removeEventListener("wheel", this.onWheel);
    if (this.floorGroup) disposeHomeGroup(this.floorGroup);
    this.noteFx.dispose();
    this.lampManager.dispose();
    this.acManager.dispose();
    this.remotePlayers.dispose();
    this.avatar.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
