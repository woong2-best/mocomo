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
  architecturesForKind,
  posesForArchitectures,
  type FurnitureArchitecture,
} from "./furniture-architecture";
import { findRoomAt, isWalkable } from "./home-walkability";
import type { BondeeHomeState, BondeePlacedItem, ChibiAvatarConfig, ChibiPose } from "./types";
import type { StudioDecorTool } from "@/studio/lib/apt-types";
import { hydrateStudioGltfMeshes } from "./studio-gltf-meshes";
import { enableBondeeRenderer, setupBondeeLights, BONDEE_PALETTE } from "./bondee-mesh-utils";
import { cappedPixelRatio, stripShadows } from "./scene-perf";

const MOVE_SPEED = 2.4;
const INTERACT_DIST = 0.55;
const CAM_LERP = 6;
const ZOOM_MIN = 4.2;
const ZOOM_MAX = 8.5;

export type NearbyFurnitureInteract = {
  itemId: string;
  kind: BondeePlacedItem["kind"];
  architectures: FurnitureArchitecture[];
  poses: ChibiPose[];
  label: string;
};

export type IsometricHomeCallbacks = {
  onItemSelect?: (id: string | null) => void;
  onNearConsoleChange?: (near: boolean) => void;
  onGameConsoleInteract?: () => void;
  onActiveRoomChange?: (roomId: string) => void;
  onNearbyFurnitureChange?: (nearby: NearbyFurnitureInteract | null) => void;
  onPoseChange?: (pose: ChibiPose) => void;
};

export class IsometricHomeScene {
  private mount: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
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
  private frustum = 5.8;
  private walkMode = true;
  private avatarX = 0;
  private avatarZ = 0;
  private avatarRotY = -0.5;
  private moveInput = { x: 0, z: 0 };
  private keys = new Set<string>();
  private nearConsole = false;
  private nearbyFurniture: NearbyFurnitureInteract | null = null;
  private interactPoseIdx = 0;
  private walking = false;
  private needsRender = true;
  private camYaw = Math.PI / 4;
  private camPitch = 0.55;
  private camDist = 5.8;
  private targetCamYaw = Math.PI / 4;
  private targetCamDist = 5.8;
  private dragging = false;
  private dragLast: { x: number; y: number } | null = null;
  private avatarShadow: THREE.Mesh;
  private lightRoot = new THREE.Group();

  constructor(mount: HTMLElement, rooms: AptRoom[], initial: BondeeHomeState) {
    this.mount = mount;
    this.rooms = rooms;
    this.state = { ...initial, items: migrateItems(initial.items, rooms) };
    if (!this.state.items.length) {
      this.state.items = defaultItemsForRooms(rooms);
    }
    this.activeRoomId = initial.activeRoomId ?? rooms.find((r) => r.type === "living")?.id ?? rooms[0]?.id ?? null;
    this.avatar = new ChibiAvatarMesh();

    const living = rooms.find((r) => r.type === "living") ?? rooms[0];
    if (living) {
      const c = roomCenter(living);
      this.avatarX = c.x - 0.2;
      this.avatarZ = c.z + 0.5;
    }

    this.scene = new THREE.Scene();

    const aspect = Math.max(mount.clientWidth, 320) / Math.max(mount.clientHeight, 400);
    this.camera = new THREE.OrthographicCamera(
      (-this.frustum * aspect) / 2,
      (this.frustum * aspect) / 2,
      this.frustum / 2,
      -this.frustum / 2,
      0.1,
      80
    );
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio <= 1.25, alpha: false, powerPreference: "high-performance" });
    enableBondeeRenderer(this.renderer);
    this.renderer.setPixelRatio(cappedPixelRatio());
    this.renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(this.renderer.domElement);

    setupBondeeLights(this.scene, this.lightRoot);
    this.scene.add(this.lightRoot);

    this.avatarShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.14, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 })
    );
    this.avatarShadow.rotation.x = -Math.PI / 2;
    this.avatarShadow.position.y = 0.01;
    this.homeRoot.add(this.avatarShadow);
    this.homeRoot.add(this.avatar.root);
    this.scene.add(this.homeRoot);
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
    }
    const avatarChanged =
      JSON.stringify(state.avatar) !== JSON.stringify(this.state.avatar) ||
      state.pose !== this.state.pose;
    this.state = { ...state, items: nextItems };
    if (avatarChanged) this.applyAvatar();
    else this.requestRender();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (!paused) this.requestRender();
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

  private canInteractWithConsole() {
    const decorBlocking = this.decorMode && (this.selectedTool || this.selectedStudioTool || this.deleteMode);
    return this.nearConsole && !decorBlocking;
  }

  tryInteract() {
    if (this.canInteractWithConsole()) {
      this.callbacks.onGameConsoleInteract?.();
      return;
    }
    if (this.decorMode || !this.nearbyFurniture) return;

    const poses = this.nearbyFurniture.poses;
    if (!poses.length) return;

    const pose = poses[this.interactPoseIdx % poses.length];
    this.interactPoseIdx = (this.interactPoseIdx + 1) % poses.length;
    this.applyFurniturePose(pose, this.nearbyFurniture);
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
    this.requestRender();
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
    this.floorGroup.add(this.furnitureRoot);

    this.homeRoot.add(this.floorGroup);
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
    }
    this.syncAvatarTransform();
  }

  private syncAvatarTransform() {
    this.avatar.root.position.set(this.avatarX, 0, this.avatarZ);
    this.avatar.root.rotation.y = this.avatarRotY;
    this.avatarShadow.position.set(this.avatarX, 0.01, this.avatarZ);
    this.avatarShadow.scale.setScalar(this.walking ? 0.85 : 1);
    this.lightRoot.position.set(this.avatarX, 0, this.avatarZ);
  }

  private updateCameraPosition() {
    const cx = Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.camDist;
    const cy = Math.sin(this.camPitch) * this.camDist + 1.2;
    const cz = Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.camDist;
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(0, 0.35, 0);
  }

  private lerpCamera(dt: number) {
    this.camYaw += (this.targetCamYaw - this.camYaw) * Math.min(1, dt * CAM_LERP);
    this.frustum += (this.targetCamDist - this.frustum) * Math.min(1, dt * CAM_LERP);
    this.updateCameraPosition();
    const aspect = Math.max(this.mount.clientWidth, 320) / Math.max(this.mount.clientHeight, 400);
    this.camera.left = (-this.frustum * aspect) / 2;
    this.camera.right = (this.frustum * aspect) / 2;
    this.camera.top = this.frustum / 2;
    this.camera.bottom = -this.frustum / 2;
    this.camera.updateProjectionMatrix();
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
      const archs = architecturesForKind(item.kind);
      if (!archs.length) continue;
      const room = this.rooms.find((r) => r.id === item.roomId);
      if (!room) continue;
      const p = itemWorldPos(item, room);
      const dist = Math.hypot(this.avatarX - p.x, this.avatarZ - p.z);
      if (dist >= bestDist) continue;

      const poses = posesForArchitectures(archs);
      bestDist = dist;
      best = {
        itemId: item.id,
        kind: item.kind,
        architectures: archs,
        poses,
        label: item.studioLabel ?? item.kind,
      };
    }
    return best;
  }

  private checkFurnitureProximity() {
    const nearby = this.findNearbyFurniture();
    if (
      nearby?.itemId === this.nearbyFurniture?.itemId &&
      nearby?.poses.join() === this.nearbyFurniture?.poses.join()
    ) {
      return;
    }
    this.nearbyFurniture = nearby;
    if (!nearby) this.interactPoseIdx = 0;
    this.callbacks.onNearbyFurnitureChange?.(nearby);
  }

  private updateMovement(dt: number) {
    if (!this.walkMode) return;

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
      this.checkConsoleProximity();
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
    }

    this.syncAvatarTransform();
    this.checkConsoleProximity();
    this.checkFurnitureProximity();

    if (this.loadedFurnitureIds.size < this.state.items.length) {
      void this.appendMissingFurnitureForRooms(this.visibleRoomIdsNearAvatar());
    }
  }

  private checkConsoleProximity() {
    const consoles = this.getConsolePositions();
    let near = false;
    for (const c of consoles) {
      if (Math.hypot(this.avatarX - c.x, this.avatarZ - c.z) < INTERACT_DIST) {
        near = true;
        break;
      }
    }
    if (near !== this.nearConsole) {
      this.nearConsole = near;
      this.callbacks.onNearConsoleChange?.(near);
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.decorMode && (this.selectedTool || this.selectedStudioTool)) return;
    const k = e.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
      this.keys.add(k);
      e.preventDefault();
    }
    if (k === "e" || k === " " || k === "enter") {
      this.tryInteract();
      e.preventDefault();
    }
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
          if (obj.userData.interactKind === "game_console" || obj.userData.kind === "tv_stand") {
            if (this.nearConsole) this.tryInteract();
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
    this.renderer.setSize(w, h);
    this.requestRender();
  };

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    if (this.paused) return;
    const dt = this.clock.getDelta();
    this.animPhase += dt;
    this.updateMovement(dt);
    const camMoving =
      Math.abs(this.targetCamYaw - this.camYaw) > 0.002 ||
      Math.abs(this.targetCamDist - this.frustum) > 0.02;
    this.lerpCamera(dt);

    if (this.walking) {
      this.avatar.animateWalk(this.animPhase, true);
      this.needsRender = true;
    } else {
      this.avatar.animateWalk(this.animPhase, false);
      if (this.canInteractWithConsole()) {
        this.avatar.root.rotation.y = THREE.MathUtils.lerp(this.avatar.root.rotation.y, Math.PI, 0.05);
        this.needsRender = true;
      }
    }

    if (camMoving || this.dragging) this.needsRender = true;
    if (!this.needsRender) return;
    this.needsRender = false;
    this.renderer.render(this.scene, this.camera);
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
    this.avatar.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
