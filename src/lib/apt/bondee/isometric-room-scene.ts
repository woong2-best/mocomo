"use client";

import * as THREE from "three";
import { ChibiAvatarMesh } from "./chibi-avatar";
import { syncRoomFurniture } from "./furniture-meshes";
import type { BondeePlacedItem, BondeeRoomState, ChibiAvatarConfig, ChibiPose } from "./types";

export type BondeeRoomCallbacks = {
  onItemClick?: (id: string) => void;
};

export class IsometricRoomScene {
  private mount: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private roomRoot = new THREE.Group();
  private furnitureRoot = new THREE.Group();
  private avatar: ChibiAvatarMesh;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private raf = 0;
  private disposed = false;
  private clock = new THREE.Clock();
  private state: BondeeRoomState;
  private callbacks: BondeeRoomCallbacks = {};
  private decorMode = false;
  private selectedTool: BondeePlacedItem["kind"] | null = null;
  private animPhase = 0;

  constructor(mount: HTMLElement, initial: BondeeRoomState) {
    this.mount = mount;
    this.state = initial;
    this.avatar = new ChibiAvatarMesh();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfef6f8);

    const aspect = Math.max(mount.clientWidth, 320) / Math.max(mount.clientHeight, 400);
    const frustum = 2.8;
    this.camera = new THREE.OrthographicCamera(
      (-frustum * aspect) / 2,
      (frustum * aspect) / 2,
      frustum / 2,
      -frustum / 2,
      0.1,
      50
    );
    this.camera.position.set(6, 6, 6);
    this.camera.lookAt(0, 0.4, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(mount.clientWidth, mount.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(this.renderer.domElement);

    this.addLights();
    this.buildRoomShell(initial.floorStyle);
    this.roomRoot.add(this.furnitureRoot);
    this.roomRoot.add(this.avatar.root);
    this.scene.add(this.roomRoot);

    this.applyState(initial);

    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("resize", this.onResize);
    this.loop();
  }

  setCallbacks(cb: BondeeRoomCallbacks) {
    this.callbacks = cb;
  }

  setState(state: BondeeRoomState) {
    this.state = state;
    this.applyState(state);
  }

  getState() {
    return this.state;
  }

  setDecorMode(on: boolean, tool: BondeePlacedItem["kind"] | null) {
    this.decorMode = on;
    this.selectedTool = tool;
  }

  updateAvatar(config: ChibiAvatarConfig, pose: ChibiPose) {
    this.state = { ...this.state, avatar: config, pose };
    this.avatar.rebuild(config, pose);
    this.positionAvatar(pose);
  }

  updateItems(items: BondeePlacedItem[]) {
    this.state = { ...this.state, items };
    syncRoomFurniture(this.furnitureRoot, items);
    this.positionAvatar(this.state.pose);
  }

  updateFloorStyle(style: "wood" | "carpet") {
    this.state = { ...this.state, floorStyle: style };
    const floor = this.roomRoot.getObjectByName("room-floor") as THREE.Mesh | undefined;
    if (floor && floor.material instanceof THREE.MeshStandardMaterial) {
      floor.material.color.setHex(style === "wood" ? 0xe8d4b8 : 0x5a5a5a);
    }
  }

  private applyState(state: BondeeRoomState) {
    syncRoomFurniture(this.furnitureRoot, state.items);
    this.avatar.rebuild(state.avatar, state.pose);
    this.positionAvatar(state.pose);
    this.updateFloorStyle(state.floorStyle);
  }

  private positionAvatar(pose: ChibiPose) {
    const sofa = this.state.items.find((i) => i.kind === "sofa");
    const treadmill = this.state.items.find((i) => i.kind === "treadmill");
    const bed = this.state.items.find((i) => i.kind === "bed");

    if (pose === "lie" && sofa) {
      this.avatar.root.position.set(sofa.gx * 0.55, 0.28, sofa.gz * 0.55 + 0.05);
      this.avatar.root.rotation.y = (sofa.rot * Math.PI) / 2;
    } else if (pose === "sit" && sofa) {
      this.avatar.root.position.set(sofa.gx * 0.55 - 0.05, 0, sofa.gz * 0.55 + 0.15);
      this.avatar.root.rotation.y = Math.PI * 0.1;
    } else if (pose === "run" && treadmill) {
      this.avatar.root.position.set(treadmill.gx * 0.55, 0, treadmill.gz * 0.55 + 0.1);
      this.avatar.root.rotation.y = Math.PI;
    } else if (pose === "lie" && bed) {
      this.avatar.root.position.set(bed.gx * 0.55, 0.2, bed.gz * 0.55);
      this.avatar.root.rotation.y = 0;
    } else {
      this.avatar.root.position.set(0, 0, 0.3);
      this.avatar.root.rotation.y = -0.4;
    }
  }

  private buildRoomShell(floorStyle: "wood" | "carpet") {
    while (this.roomRoot.children.length > 2) {
      this.roomRoot.remove(this.roomRoot.children[0]);
    }
    const floorColor = floorStyle === "wood" ? 0xe8d4b8 : 0x5a5a5a;
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.06, 2.4),
      new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.85 })
    );
    floor.position.y = -0.03;
    floor.receiveShadow = true;
    floor.name = "room-floor";
    this.roomRoot.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xffe8f0, roughness: 0.35 });
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 0.06), wallMat);
    back.position.set(0, 0.65, -1.2);
    back.receiveShadow = true;
    this.roomRoot.add(back);

    const left = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 2.4), wallMat);
    left.position.set(-1.2, 0.65, 0);
    this.roomRoot.add(left);

    const grid = new THREE.GridHelper(2.2, 11, 0xe0e0e0, 0xeeeeee);
    grid.position.y = 0.01;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    this.roomRoot.add(grid);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(2.4, 1.4, 2.4)),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
    );
    edges.position.y = 0.65;
    this.roomRoot.add(edges);
  }

  private addLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const sun = new THREE.DirectionalLight(0xffffff, 0.65);
    sun.position.set(4, 8, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 20;
    sun.shadow.camera.left = -3;
    sun.shadow.camera.right = 3;
    sun.shadow.camera.top = 3;
    sun.shadow.camera.bottom = -3;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xf0f0ff, 0.25);
    fill.position.set(-3, 4, -2);
    this.scene.add(fill);
  }

  private onPointerDown = (e: PointerEvent) => {
    if (!this.decorMode || !this.selectedTool) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const floor = this.roomRoot.getObjectByName("room-floor");
    if (!floor) return;
    const hits = this.raycaster.intersectObject(floor);
    if (!hits.length) return;
    const p = hits[0].point;
    const gx = Math.round(p.x / 0.55);
    const gz = Math.round(p.z / 0.55);
    if (Math.abs(gx) > 2 || Math.abs(gz) > 2) return;
    const id = `item-${Date.now()}`;
    const items = [...this.state.items, { id, kind: this.selectedTool, roomId: "living", gx, gz, rot: 0 as const }];
    this.updateItems(items);
  };

  private onResize = () => {
    const w = this.mount.clientWidth;
    const h = this.mount.clientHeight;
    if (!w || !h) return;
    const aspect = w / h;
    const frustum = 2.8;
    this.camera.left = (-frustum * aspect) / 2;
    this.camera.right = (frustum * aspect) / 2;
    this.camera.top = frustum / 2;
    this.camera.bottom = -frustum / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = this.clock.getDelta();
    this.animPhase += dt;

    if (this.state.pose === "run") {
      this.avatar.root.position.y = Math.sin(this.animPhase * 8) * 0.02;
    }

    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
    this.avatar.dispose();
    this.furnitureRoot.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m.dispose());
      }
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
