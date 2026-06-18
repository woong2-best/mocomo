"use client";

import * as THREE from "three";

export const APT_TOTAL_FLOORS = 12;
export const APT_DEFAULT_FLOOR = 7;
const FLOOR_H = 2.6;
const BUILDING_W = 5.2;
const BUILDING_D = 4;
const WALL_T = 0.14;

type FloorRefs = {
  group: THREE.Group;
  shellMats: THREE.MeshStandardMaterial[];
  highlight: THREE.Mesh;
};

export class AptBuildingScene {
  private mount: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private building = new THREE.Group();
  private floorRefs: FloorRefs[] = [];
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private raf = 0;
  private disposed = false;

  private currentFloor = APT_DEFAULT_FLOOR;
  private targetBuildingY = 0;
  private xrayMode = false;
  private xrayTarget = 0;
  private xrayCurrent = 0;
  private onFloorClick?: (floor: number) => void;

  constructor(mount: HTMLElement) {
    this.mount = mount;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe8e4dc);
    this.scene.fog = new THREE.Fog(0xe8e4dc, 28, 52);

    const w = Math.max(mount.clientWidth, 320);
    const h = Math.max(mount.clientHeight, 360);
    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 120);
    this.camera.position.set(9.5, 7.5, 11.5);
    this.camera.lookAt(0, 4, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(this.renderer.domElement);

    this.addLights();
    this.addGround();
    this.buildFloors();
    this.scene.add(this.building);

    this.targetBuildingY = this.floorToBuildingY(this.currentFloor);
    this.building.position.y = this.targetBuildingY;

    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("resize", this.onResize);
    this.loop();
  }

  getFloor() {
    return this.currentFloor;
  }

  setFloorClickHandler(handler: (floor: number) => void) {
    this.onFloorClick = handler;
  }

  setFloor(floor: number, animate = true) {
    const clamped = Math.min(APT_TOTAL_FLOORS, Math.max(1, floor));
    this.currentFloor = clamped;
    this.targetBuildingY = this.floorToBuildingY(clamped);
    this.updateHighlights();
    if (!animate) {
      this.building.position.y = this.targetBuildingY;
    }
  }

  setXray(enabled: boolean) {
    this.xrayMode = enabled;
    this.xrayTarget = enabled ? 1 : 0;
  }

  toggleXray() {
    this.setXray(!this.xrayMode);
    return this.xrayMode;
  }

  moveFloor(delta: number) {
    this.setFloor(this.currentFloor + delta);
  }

  private floorToBuildingY(floor: number) {
    return -(floor - 1) * FLOOR_H;
  }

  private addLights() {
    const ambient = new THREE.AmbientLight(0xfff8f0, 0.72);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff4e6, 1.05);
    sun.position.set(8, 16, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 40;
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 14;
    sun.shadow.camera.bottom = -4;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xc8d8f0, 0.35);
    fill.position.set(-6, 8, -4);
    this.scene.add(fill);
  }

  private addGround() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0xd8d2c8, roughness: 0.92, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private buildFloors() {
    for (let f = 1; f <= APT_TOTAL_FLOORS; f++) {
      const floorGroup = new THREE.Group();
      floorGroup.position.y = (f - 1) * FLOOR_H;
      floorGroup.userData.floor = f;

      const shellMats: THREE.MeshStandardMaterial[] = [];
      const yBase = 0.08;

      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(BUILDING_W, 0.12, BUILDING_D),
        new THREE.MeshStandardMaterial({ color: 0xf0ebe3, roughness: 0.85, metalness: 0 })
      );
      slab.position.y = yBase;
      slab.receiveShadow = true;
      floorGroup.add(slab);

      const roomMat = new THREE.MeshStandardMaterial({
        color: 0x2a4a7a,
        roughness: 0.55,
        metalness: 0.08,
        transparent: true,
        opacity: 0.88,
      });
      const innerMat = new THREE.MeshStandardMaterial({
        color: 0x3d5f8f,
        roughness: 0.5,
        metalness: 0.05,
        transparent: true,
        opacity: 0.82,
      });

      const wallFront = this.wall(BUILDING_W, FLOOR_H - 0.2, WALL_T, roomMat);
      wallFront.position.set(0, FLOOR_H / 2, BUILDING_D / 2);
      shellMats.push(roomMat);

      const backMat = roomMat.clone();
      const wallBack = this.wall(BUILDING_W, FLOOR_H - 0.2, WALL_T, backMat);
      wallBack.position.set(0, FLOOR_H / 2, -BUILDING_D / 2);
      shellMats.push(backMat);

      const leftMat = roomMat.clone();
      const wallLeft = this.wall(WALL_T, FLOOR_H - 0.2, BUILDING_D, leftMat);
      wallLeft.position.set(-BUILDING_W / 2, FLOOR_H / 2, 0);
      shellMats.push(leftMat);

      const rightMat = roomMat.clone();
      const wallRight = this.wall(WALL_T, FLOOR_H - 0.2, BUILDING_D, rightMat);
      wallRight.position.set(BUILDING_W / 2, FLOOR_H / 2, 0);
      shellMats.push(rightMat);

      floorGroup.add(wallFront, wallBack, wallLeft, wallRight);

      const dividerV = this.wall(WALL_T, FLOOR_H - 0.35, BUILDING_D - 0.3, innerMat);
      dividerV.position.set(0, FLOOR_H / 2, 0);
      const dividerH = this.wall(BUILDING_W - 0.3, FLOOR_H - 0.35, WALL_T, innerMat.clone());
      dividerH.position.set(0, FLOOR_H / 2, 0);
      floorGroup.add(dividerV, dividerH);

      this.addWindows(floorGroup, f);
      this.addRoomProps(floorGroup, f);

      const highlight = new THREE.Mesh(
        new THREE.BoxGeometry(BUILDING_W + 0.28, FLOOR_H + 0.08, BUILDING_D + 0.28),
        new THREE.MeshBasicMaterial({
          color: 0xc45a32,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        })
      );
      highlight.position.y = FLOOR_H / 2;
      floorGroup.add(highlight);

      this.floorRefs.push({ group: floorGroup, shellMats, highlight });
      this.building.add(floorGroup);
    }

    this.updateHighlights();
  }

  private wall(w: number, h: number, d: number, mat: THREE.MeshStandardMaterial) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private addWindows(floorGroup: THREE.Group, floor: number) {
    const winMat = new THREE.MeshStandardMaterial({
      color: 0xa8cce8,
      emissive: 0x224466,
      emissiveIntensity: floor % 2 === 0 ? 0.35 : 0.18,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.75,
    });

    const cols = 3;
    const rows = 2;
    const gapX = BUILDING_W / (cols + 1);
    const gapY = (FLOOR_H - 0.5) / (rows + 1);

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 0.06), winMat.clone());
        win.position.set(
          -BUILDING_W / 2 + gapX * (c + 1),
          0.55 + gapY * (r + 1),
          BUILDING_D / 2 + 0.04
        );
        floorGroup.add(win);
      }
    }
  }

  private addRoomProps(floorGroup: THREE.Group, floor: number) {
    const palette = [0xc45a32, 0x5a7ab0, 0x8b6f4e, 0x6b8f71];
    const rooms: [number, number, number, number, number][] = [
      [-1.1, 0.35, -0.9, 1.2, 0.5],
      [1.0, 0.28, -0.8, 0.9, 0.45],
      [-0.9, 0.32, 0.85, 1.0, 0.55],
      [1.1, 0.4, 1.0, 0.85, 0.4],
    ];

    rooms.forEach(([x, h, z, w, d], i) => {
      const mat = new THREE.MeshStandardMaterial({
        color: palette[(floor + i) % palette.length],
        roughness: 0.6,
        metalness: 0.12,
      });
      const prop = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      prop.position.set(x, 0.14 + h / 2, z);
      prop.castShadow = true;
      floorGroup.add(prop);
    });
  }

  private updateHighlights() {
    for (let i = 0; i < this.floorRefs.length; i++) {
      const active = i + 1 === this.currentFloor;
      const mat = this.floorRefs[i].highlight.material as THREE.MeshBasicMaterial;
      mat.opacity = active ? 0.22 : 0;
    }
  }

  private applyXray() {
    const t = this.xrayCurrent;
    for (const { shellMats } of this.floorRefs) {
      for (const mat of shellMats) {
        mat.opacity = THREE.MathUtils.lerp(0.9, 0.14, t);
        mat.depthWrite = t < 0.65;
      }
    }
  }

  private onPointerDown = (e: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hits = this.raycaster.intersectObjects(
      this.floorRefs.map((f) => f.group),
      true
    );
    if (!hits.length) return;

    let obj: THREE.Object3D | null = hits[0].object;
    while (obj && obj.userData.floor == null) obj = obj.parent;
    const floor = obj?.userData.floor as number | undefined;
    if (floor) this.onFloorClick?.(floor);
  };

  private onResize = () => {
    const w = this.mount.clientWidth;
    const h = this.mount.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);

    this.building.position.y += (this.targetBuildingY - this.building.position.y) * 0.09;
    this.xrayCurrent += (this.xrayTarget - this.xrayCurrent) * 0.1;
    this.applyXray();

    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
