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
import type { BondeeHomeState, BondeePlacedItem, ChibiAvatarConfig, ChibiPose } from "./types";
import type { StudioDecorTool } from "@/studio/lib/apt-types";
import { hydrateStudioGltfMeshes } from "./studio-gltf-meshes";
import { enableBondeeRenderer, setupBondeeLights } from "./bondee-mesh-utils";
import { cappedPixelRatio, stripShadows } from "./scene-perf";

const MOVE_SPEED = 2.4;
const INTERACT_DIST = 0.55;
const CAM_LERP = 6;
const ZOOM_MIN = 4.2;
const ZOOM_MAX = 8.5;

export type IsometricHomeCallbacks = {
  onItemSelect?: (id: string | null) => void;
  onNearConsoleChange?: (near: boolean) => void;
  onGameConsoleInteract?: () => void;
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
    this.state = { ...state, items: migrateItems(state.items, this.rooms) };
    if (state.activeRoomId) this.activeRoomId = state.activeRoomId;
    this.rebuildFloor();
    this.applyAvatar();
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
  }

  setActiveRoom(roomId: string) {
    this.activeRoomId = roomId;
    this.rebuildFloor();
  }

  setSelectedItem(id: string | null) {
    this.selectedItemId = id;
    this.rebuildFloor();
    this.callbacks.onItemSelect?.(id);
  }

  setMoveInput(x: number, z: number) {
    this.moveInput.x = x;
    this.moveInput.z = z;
  }

  tryInteract() {
    if (this.nearConsole && !this.decorMode) {
      this.callbacks.onGameConsoleInteract?.();
    }
  }

  updateAvatar(config: ChibiAvatarConfig, pose: ChibiPose) {
    this.state = { ...this.state, avatar: config, pose };
    this.applyAvatar();
  }

  updateItems(items: BondeePlacedItem[]) {
    this.state = { ...this.state, items: migrateItems(items, this.rooms) };
    this.rebuildFloor();
    this.applyAvatar();
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
    void this.loadFurnitureStaged(loadGen, visibleRooms);
  }

  /** Rooms near avatar + active room always visible */
  private visibleRoomIdsNearAvatar(): Set<string> {
    const ids = new Set<string>();
    if (this.activeRoomId) ids.add(this.activeRoomId);

    for (const room of this.rooms) {
      const c = roomCenter(room);
      const { w, d } = roomSize(room);
      if (Math.abs(this.avatarX - c.x) <= w / 2 + 0.5 && Math.abs(this.avatarZ - c.z) <= d / 2 + 0.5) {
        ids.add(room.id);
      }
    }

    const living = this.rooms.find((r) => r.type === "living");
    if (living) ids.add(living.id);

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
    if (this.furnitureLoadBusy) return;
    this.furnitureLoadBusy = true;
    const BATCH = 3;

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
          stripShadows(this.furnitureRoot);
          this.requestRender();
        }
      }

      if (loadGen !== this.furnitureLoadGen || !this.floorGroup) return;
      await hydrateStudioGltfMeshes(this.floorGroup);
      this.requestRender();
    } finally {
      this.furnitureLoadBusy = false;
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
      stripShadows(this.furnitureRoot);
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
    for (const room of this.rooms) {
      const c = roomCenter(room);
      const { w, d } = roomSize(room);
      if (Math.abs(x - c.x) <= w / 2 - 0.12 && Math.abs(z - c.z) <= d / 2 - 0.12) {
        return true;
      }
    }
    return false;
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
    }

    this.syncAvatarTransform();
    this.checkConsoleProximity();

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
      if (this.nearConsole && !this.decorMode) {
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
