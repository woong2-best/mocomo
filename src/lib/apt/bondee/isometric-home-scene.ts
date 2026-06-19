"use client";

import * as THREE from "three";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { roomCenter, roomSize } from "@/lib/apt/building-from-plan";
import { ChibiAvatarMesh } from "./chibi-avatar";
import {
  buildHomeFloorGroup,
  defaultItemsForRooms,
  disposeHomeGroup,
  itemWorldPos,
  migrateItems,
} from "./home-floor-meshes";
import type { BondeeHomeState, BondeePlacedItem, ChibiAvatarConfig, ChibiPose } from "./types";
import type { StudioDecorTool } from "@/studio/lib/apt-types";
import { hydrateStudioGltfMeshes } from "./studio-gltf-meshes";

const MOVE_SPEED = 2.4;
const INTERACT_DIST = 0.55;

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
    this.scene.background = new THREE.Color(0xfef6f8);

    const aspect = Math.max(mount.clientWidth, 320) / Math.max(mount.clientHeight, 400);
    this.camera = new THREE.OrthographicCamera(
      (-this.frustum * aspect) / 2,
      (this.frustum * aspect) / 2,
      this.frustum / 2,
      -this.frustum / 2,
      0.1,
      80
    );
    this.camera.position.set(8, 9, 8);
    this.camera.lookAt(0, 0.3, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(mount.clientWidth, mount.clientHeight);
    this.renderer.shadowMap.enabled = true;
    mount.appendChild(this.renderer.domElement);

    this.addLights();
    this.homeRoot.add(this.avatar.root);
    this.scene.add(this.homeRoot);
    this.rebuildFloor();
    this.applyAvatar();

    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("resize", this.onResize);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.loop();
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
    }
    this.floorGroup = buildHomeFloorGroup({
      rooms: this.rooms,
      items: this.state.items,
      highlightRoomId: this.decorMode ? this.activeRoomId : null,
      selectedItemId: this.selectedItemId,
    });
    this.homeRoot.add(this.floorGroup);
    void hydrateStudioGltfMeshes(this.floorGroup);
    this.applyAvatar();
  }

  private applyAvatar() {
    const pose = this.walkMode && this.walking ? "stand" : this.state.pose;
    this.avatar.rebuild(this.state.avatar, pose);
    this.syncAvatarTransform();
  }

  private syncAvatarTransform() {
    this.avatar.root.position.set(this.avatarX, 0, this.avatarZ);
    this.avatar.root.rotation.y = this.avatarRotY;
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

    this.applyAvatar();
    this.checkConsoleProximity();
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

  private addLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.88));
    const sun = new THREE.DirectionalLight(0xffffff, 0.6);
    sun.position.set(5, 10, 7);
    sun.castShadow = true;
    this.scene.add(sun);
  }

  private onPointerDown = (e: PointerEvent) => {
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
      : [
          ...this.state.items,
          { ...base, kind: this.selectedTool! },
        ];
    this.updateItems(items);
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
  };

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = this.clock.getDelta();
    this.animPhase += dt;
    this.updateMovement(dt);
    if (this.walking) {
      this.avatar.root.position.y = Math.sin(this.animPhase * 10) * 0.015;
    } else if (this.state.pose === "run") {
      this.avatar.root.position.y = Math.sin(this.animPhase * 8) * 0.02;
    }
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
    if (this.floorGroup) disposeHomeGroup(this.floorGroup);
    this.avatar.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
