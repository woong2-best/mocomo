"use client";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { CarState, MapType, Obstacle, ParkingInput, ParkingLevel, ParkingSpot, VehicleTypeId } from "./parking-rush-logic";
import { VEHICLE_SPECS } from "./parking-rush-logic";
import { createAsphaltTexture, createUsAsphaltTexture, PARKING_MAP_THEMES, type ParkingMapTheme } from "./parking-rush-theme";
import { addUsSky, buildUsMegaLotEnvironment } from "./parking-rush-scene-environment";

export type SceneCar = {
  userId: string;
  car: CarState;
  vehicleId: VehicleTypeId;
  color?: string;
  isLocal: boolean;
  parked?: boolean;
  spotId?: string;
  blinker?: ParkingInput["blinker"];
  hornActive?: boolean;
};

type CarLightRefs = {
  body: THREE.MeshStandardMaterial;
  headL: THREE.MeshBasicMaterial;
  headR: THREE.MeshBasicMaterial;
  tailL: THREE.MeshBasicMaterial;
  tailR: THREE.MeshBasicMaterial;
  signalL: THREE.MeshBasicMaterial;
  signalR: THREE.MeshBasicMaterial;
  glow?: THREE.PointLight;
};

type CarInterp = {
  x: number;
  y: number;
  angle: number;
  speed: number;
  tx: number;
  ty: number;
  ta: number;
  ts: number;
};

type GeoCache = {
  wheel: THREE.CylinderGeometry;
  cone: THREE.ConeGeometry;
  box: THREE.BoxGeometry;
};

const GEO: GeoCache = {
  wheel: new THREE.CylinderGeometry(0.28, 0.28, 0.18, 10),
  cone: new THREE.ConeGeometry(0.5, 0.7, 8),
  box: new THREE.BoxGeometry(1, 1, 1),
};

/** lowPolyCar 전방(+X)을 물리 heading (cos/sin angle)과 일치 */
const CAR_MESH_Y_FROM_ANGLE = (angle: number) => -angle;

function worldX(x: number) {
  return x;
}
function worldZ(y: number) {
  return y;
}

function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function lowPolyCar(spec: (typeof VEHICLE_SPECS)[VehicleTypeId], color: string, isLocal: boolean): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.35,
    roughness: 0.45,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(spec.length, 0.88, spec.width), bodyMat);
  body.position.y = 0.54;
  body.castShadow = true;
  g.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(spec.length * 0.52, 0.5, spec.width * 0.82),
    new THREE.MeshStandardMaterial({ color: "#0f172a", metalness: 0.2, roughness: 0.3 })
  );
  cabin.position.set(spec.length * 0.04, 1.02, 0);
  cabin.castShadow = true;
  g.add(cabin);

  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(spec.length * 0.48, 0.42, spec.width * 0.76),
    new THREE.MeshPhysicalMaterial({
      color: "#1e3a5f",
      metalness: 0.9,
      roughness: 0.05,
      transparent: true,
      opacity: 0.55,
      envMapIntensity: 1.2,
    })
  );
  glass.position.set(spec.length * 0.04, 1.04, 0);
  g.add(glass);

  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(spec.length * 1.02, 0.08, spec.width * 1.04),
    new THREE.MeshStandardMaterial({ color: "#334155", metalness: 0.8, roughness: 0.2 })
  );
  trim.position.y = 0.18;
  g.add(trim);

  const wheelMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.85 });
  const wheels: THREE.Mesh[] = [];
  const wx = spec.wheelbase / 2;
  const wz = spec.width / 2 - 0.15;
  for (const [x, z] of [
    [wx, wz],
    [wx, -wz],
    [-wx, wz],
    [-wx, -wz],
  ] as const) {
    const w = new THREE.Mesh(GEO.wheel, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.28, z);
    w.castShadow = true;
    wheels.push(w);
    g.add(w);
  }

  const headL = new THREE.MeshBasicMaterial({ color: "#fef9c3" });
  const headR = new THREE.MeshBasicMaterial({ color: "#fef9c3" });
  const tailL = new THREE.MeshBasicMaterial({ color: "#dc2626" });
  const tailR = new THREE.MeshBasicMaterial({ color: "#dc2626" });
  const signalL = new THREE.MeshBasicMaterial({ color: "#422006" });
  const signalR = new THREE.MeshBasicMaterial({ color: "#422006" });

  const headLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.22), headL);
  headLMesh.position.set(spec.length / 2 - 0.04, 0.42, spec.width / 2 - 0.32);
  const headRMesh = headLMesh.clone();
  headRMesh.material = headR;
  headRMesh.position.z = -spec.width / 2 + 0.32;

  const tailLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.2), tailL);
  tailLMesh.position.set(-spec.length / 2 + 0.04, 0.42, spec.width / 2 - 0.32);
  const tailRMesh = tailLMesh.clone();
  tailRMesh.material = tailR;
  tailRMesh.position.z = -spec.width / 2 + 0.32;

  const signalLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.14), signalL);
  signalLMesh.position.set(spec.length / 2 - 0.18, 0.7, spec.width / 2 - 0.18);
  const signalRMesh = signalLMesh.clone();
  signalRMesh.material = signalR;
  signalRMesh.position.z = -spec.width / 2 + 0.18;

  g.add(headLMesh, headRMesh, tailLMesh, tailRMesh, signalLMesh, signalRMesh);

  let glow: THREE.PointLight | undefined;
  if (isLocal) {
    glow = new THREE.PointLight(new THREE.Color(color), 0.35, 6);
    glow.position.y = 0.3;
    g.add(glow);
  }

  (g.userData as { lights: CarLightRefs; bodyColor: string; wheels: THREE.Mesh[]; frontWheels?: THREE.Mesh[] }).lights = {
    body: bodyMat,
    headL,
    headR,
    tailL,
    tailR,
    signalL,
    signalR,
    glow,
  };
  (g.userData as { bodyColor: string; wheels: THREE.Mesh[]; frontWheels?: THREE.Mesh[] }).bodyColor = color;
  (g.userData as { wheels: THREE.Mesh[]; frontWheels?: THREE.Mesh[] }).wheels = wheels;
  (g.userData as { frontWheels?: THREE.Mesh[] }).frontWheels = [wheels[0]!, wheels[1]!];

  return g;
}

function applyCarLights(mesh: THREE.Group, car: SceneCar, tick: number) {
  const refs = (mesh.userData as { lights?: CarLightRefs }).lights;
  if (!refs) return;
  const blink = Math.floor(tick * 0.008) % 2 === 0;
  const reversing = car.car.speed < -0.15;
  const hazard = car.blinker === "hazard";
  const left = car.blinker === "left" || hazard;
  const right = car.blinker === "right" || hazard;
  const horn = !!car.hornActive;
  const moving = Math.abs(car.car.speed) > 0.05;

  refs.headL.color.setHex(horn ? 0xffffff : moving ? 0xfffbeb : 0xfef08a);
  refs.headR.color.setHex(horn ? 0xffffff : moving ? 0xfffbeb : 0xfef08a);
  refs.tailL.color.setHex(reversing ? 0xffffff : hazard && blink ? 0xfbbf24 : 0xef4444);
  refs.tailR.color.setHex(reversing ? 0xffffff : hazard && blink ? 0xfbbf24 : 0xef4444);
  refs.signalL.color.setHex(left && blink ? 0xfbbf24 : 0x422006);
  refs.signalR.color.setHex(right && blink ? 0xfbbf24 : 0x422006);
  if (refs.glow) refs.glow.intensity = horn ? 0.9 : moving ? 0.45 : 0.25;
}

function addObstacleMesh(parent: THREE.Group, o: Obstacle) {
  const h = o.kind === "fence" ? 0.8 : o.kind === "cone" ? 0.7 : o.kind === "pillar" ? 2.5 : 1.2;
  const color = o.color ?? "#64748b";
  let mesh: THREE.Mesh;

  if (o.kind === "cone") {
    mesh = new THREE.Mesh(
      GEO.cone,
      new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05 })
    );
    mesh.scale.set(o.w, h / 0.7, o.h);
  } else if (o.kind === "car") {
    mesh = new THREE.Mesh(
      new THREE.BoxGeometry(o.w, 0.85, o.h),
      new THREE.MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.5 })
    );
    mesh.position.y = 0.42;
  } else {
    mesh = new THREE.Mesh(
      new THREE.BoxGeometry(o.w, h, o.h),
      new THREE.MeshStandardMaterial({
        color,
        roughness: o.kind === "pillar" ? 0.7 : 0.85,
        metalness: o.kind === "fence" ? 0.1 : 0.05,
      })
    );
    mesh.position.y = h / 2;
  }

  mesh.position.x = worldX(o.x);
  mesh.position.z = worldZ(o.y);
  if (o.kind !== "car") mesh.position.y = mesh.position.y || h / 2;
  mesh.rotation.y = o.kind === "car" ? CAR_MESH_Y_FROM_ANGLE(o.angle ?? 0) : (o.angle ?? 0);
  mesh.castShadow = o.kind !== "fence";
  mesh.receiveShadow = true;
  parent.add(mesh);
}

function addSpotMesh(parent: THREE.Group, spot: ParkingSpot, highlight: boolean, neon: string) {
  const neonColor = new THREE.Color(neon);
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(spot.w, spot.h),
    new THREE.MeshStandardMaterial({
      color: highlight ? neonColor : "#334155",
      transparent: true,
      opacity: highlight ? 0.35 : 0.18,
      emissive: highlight ? neonColor : "#000000",
      emissiveIntensity: highlight ? 0.45 : 0,
      side: THREE.DoubleSide,
      roughness: 0.9,
    })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.rotation.z = spot.angle;
  plane.position.set(worldX(spot.x), 0.03, worldZ(spot.y));
  parent.add(plane);

  const line = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(spot.w, spot.h)),
    new THREE.LineBasicMaterial({ color: highlight ? neon : "#64748b", transparent: true, opacity: 0.9 })
  );
  line.rotation.x = -Math.PI / 2;
  line.rotation.z = spot.angle;
  line.position.set(worldX(spot.x), 0.04, worldZ(spot.y));
  parent.add(line);

  if (highlight) {
    const glow = new THREE.PointLight(neonColor, 0.35, 8);
    glow.position.set(worldX(spot.x), 1.2, worldZ(spot.y));
    parent.add(glow);
  }
}

function addStreetLamps(parent: THREE.Group, level: ParkingLevel, theme: ParkingMapTheme) {
  const pts: [number, number][] = [
    [4, 4],
    [level.bounds.w - 4, 4],
    [4, level.bounds.h - 4],
    [level.bounds.w - 4, level.bounds.h - 4],
    [level.bounds.w / 2, 4],
    [level.bounds.w / 2, level.bounds.h - 4],
  ];
  const poleMat = new THREE.MeshStandardMaterial({ color: "#475569", metalness: 0.6, roughness: 0.4 });
  for (const [x, z] of pts) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.5, 6), poleMat);
    pole.position.set(x, 2.25, z);
    parent.add(pole);
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.15, 0.3),
      new THREE.MeshStandardMaterial({ color: "#fef3c7", emissive: theme.lampColor, emissiveIntensity: 0.8 })
    );
    lamp.position.set(x, 4.5, z);
    parent.add(lamp);
    const light = new THREE.PointLight(theme.lampColor, theme.lampIntensity, 14, 1.6);
    light.position.set(x, 4.2, z);
    parent.add(light);
  }
}

function addSkyBackdrop(parent: THREE.Group, level: ParkingLevel, theme: ParkingMapTheme) {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, theme.skyTop);
  grad.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(canvas);
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(level.bounds.w + 30, 28),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
  );
  sky.position.set(level.bounds.w / 2, 14, -2);
  parent.add(sky);

  const city = new THREE.Mesh(
    new THREE.BoxGeometry(level.bounds.w + 20, 6, 2),
    new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.95 })
  );
  city.position.set(level.bounds.w / 2, 3, -4);
  parent.add(city);
}

export class ParkingRushScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private mount: HTMLElement;
  private raf = 0;
  private tick = 0;
  private carMeshes = new Map<string, THREE.Group>();
  private carInterp = new Map<string, CarInterp>();
  private levelGroup = new THREE.Group();
  private carsGroup = new THREE.Group();
  private sun: THREE.DirectionalLight;
  private amb: THREE.AmbientLight;
  private hemi: THREE.HemisphereLight;
  private localUserId: string | null = null;
  private freeCamera = false;
  private userOrbiting = false;
  private orbitIdleUntil = 0;
  private cameraOffset = new THREE.Vector3(0, 5.5, 9.5);
  private zoom = 1;
  private lastCars: SceneCar[] = [];
  private theme: ParkingMapTheme = PARKING_MAP_THEMES.parking_lot;
  private paused = false;
  private shake = 0;
  private baseFov = 52;
  private asphaltTex: THREE.CanvasTexture | null = null;

  constructor(mount: HTMLElement) {
    this.mount = mount;
    const w = mount.clientWidth || 640;
    const h = mount.clientHeight || 480;
    const dpr = Math.min(window.devicePixelRatio, 1.75);

    this.renderer = new THREE.WebGLRenderer({
      antialias: dpr < 2,
      alpha: false,
      powerPreference: "high-performance",
      stencil: false,
    });
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    mount.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this.baseFov, w / h, 0.1, 180);
    this.camera.position.set(21, 16, 44);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2.15;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 42;
    this.controls.enablePan = false;
    this.controls.enableRotate = true;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    this.renderer.domElement.style.cursor = "grab";
    this.controls.addEventListener("start", () => {
      if (!this.freeCamera) this.userOrbiting = true;
      this.renderer.domElement.style.cursor = "grabbing";
    });
    this.controls.addEventListener("end", () => {
      if (!this.freeCamera) this.orbitIdleUntil = Date.now() + 4500;
      this.renderer.domElement.style.cursor = "grab";
    });

    this.amb = new THREE.AmbientLight(0xffffff, 0.42);
    this.hemi = new THREE.HemisphereLight(0x7dd3fc, 0x1e293b, 0.35);
    this.sun = new THREE.DirectionalLight(0xffffff, 0.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(512, 512);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 80;
    this.sun.shadow.camera.left = -30;
    this.sun.shadow.camera.right = 30;
    this.sun.shadow.camera.top = 30;
    this.sun.shadow.camera.bottom = -30;
    this.scene.add(this.amb, this.hemi, this.sun);
    this.scene.add(this.levelGroup, this.carsGroup);

    this.applyTheme(PARKING_MAP_THEMES.parking_lot);
    this.onVisibility = this.onVisibility.bind(this);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
    window.addEventListener("resize", this.onResize);
  }

  private onVisibility() {
    this.paused = document.hidden;
  }

  private applyTheme(theme: ParkingMapTheme) {
    this.theme = theme;
    this.scene.background = new THREE.Color(theme.fog);
    this.scene.fog = new THREE.Fog(theme.fog, theme.fogNear, theme.fogFar);
    this.amb.intensity = theme.ambient;
    this.hemi.color.setHex(theme.hemiSky);
    this.hemi.groundColor.setHex(theme.hemiGround);
    this.sun.color.setHex(theme.sunColor);
    this.sun.intensity = theme.sunIntensity;
    this.sun.position.set(...theme.sunPos);
  }

  loadLevel(level: ParkingLevel, localSpotId?: string) {
    while (this.levelGroup.children.length) this.levelGroup.remove(this.levelGroup.children[0]!);
    if (this.asphaltTex) this.asphaltTex.dispose();

    const mapType = level.mapType as MapType;
    const theme = PARKING_MAP_THEMES[mapType] ?? PARKING_MAP_THEMES.parking_lot;
    const isUsLot = mapType === "parking_lot";
    this.applyTheme(theme);

    const asphaltCanvas = isUsLot
      ? createUsAsphaltTexture(level.groundColor, theme.neon, level.bounds.w, level.bounds.h)
      : createAsphaltTexture(level.groundColor, theme.neon, level.bounds.w, level.bounds.h);
    this.asphaltTex = new THREE.CanvasTexture(asphaltCanvas);
    this.asphaltTex.wrapS = THREE.RepeatWrapping;
    this.asphaltTex.wrapT = THREE.RepeatWrapping;
    this.asphaltTex.repeat.set(2, 3);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(level.bounds.w, level.bounds.h),
      new THREE.MeshStandardMaterial({
        map: this.asphaltTex,
        roughness: 0.92,
        metalness: 0.02,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(level.bounds.w / 2, 0, level.bounds.h / 2);
    ground.receiveShadow = true;
    this.levelGroup.add(ground);

    if (!isUsLot) {
      const grid = new THREE.GridHelper(
        Math.max(level.bounds.w, level.bounds.h),
        24,
        theme.neon,
        theme.gridColor
      );
      grid.position.set(level.bounds.w / 2, 0.015, level.bounds.h / 2);
      (grid.material as THREE.Material).transparent = true;
      (grid.material as THREE.Material).opacity = 0.22;
      this.levelGroup.add(grid);
    }

    for (const w of level.walls) addObstacleMesh(this.levelGroup, w);
    for (const o of level.obstacles) addObstacleMesh(this.levelGroup, o);

    if (isUsLot) {
      buildUsMegaLotEnvironment(this.levelGroup, level, theme, localSpotId);
      addUsSky(this.levelGroup, level, theme);
    } else {
      for (const s of level.parkingSpots) addSpotMesh(this.levelGroup, s, s.id === localSpotId, theme.neon);
      addStreetLamps(this.levelGroup, level, theme);
      addSkyBackdrop(this.levelGroup, level, theme);
    }

    const lotSize = Math.max(level.bounds.w, level.bounds.h);
    this.controls.maxDistance = lotSize * 0.85;
    this.sun.shadow.camera.left = -lotSize * 0.55;
    this.sun.shadow.camera.right = lotSize * 0.55;
    this.sun.shadow.camera.top = lotSize * 0.55;
    this.sun.shadow.camera.bottom = -lotSize * 0.55;
    this.sun.shadow.camera.far = lotSize * 1.4;
    this.sun.position.set(
      theme.sunPos[0] + level.bounds.w * 0.15,
      theme.sunPos[1],
      theme.sunPos[2] + level.bounds.h * 0.1
    );
  }

  setLocalUser(userId: string | null) {
    this.localUserId = userId;
  }

  setFreeCamera(free: boolean) {
    this.freeCamera = free;
    if (free) {
      this.userOrbiting = false;
      this.orbitIdleUntil = 0;
    }
  }

  resetCamera() {
    this.userOrbiting = false;
    this.orbitIdleUntil = 0;
  }

  setZoom(delta: number) {
    this.zoom = Math.max(0.55, Math.min(1.5, this.zoom + delta));
  }

  setCollisionShake(amount = 0.35) {
    this.shake = Math.min(1, this.shake + amount);
  }

  updateCars(cars: SceneCar[]) {
    this.lastCars = cars;
    const seen = new Set<string>();
    for (const c of cars) {
      seen.add(c.userId);
      let mesh = this.carMeshes.get(c.userId);
      const spec = VEHICLE_SPECS[c.vehicleId];
      const color = c.color ?? spec.color;
      if (!mesh) {
        mesh = lowPolyCar(spec, color, c.isLocal);
        this.carMeshes.set(c.userId, mesh);
        this.carsGroup.add(mesh);
        this.carInterp.set(c.userId, {
          x: c.car.x,
          y: c.car.y,
          angle: c.car.angle,
          speed: c.car.speed,
          tx: c.car.x,
          ty: c.car.y,
          ta: c.car.angle,
          ts: c.car.speed,
        });
      } else if ((mesh.userData as { bodyColor?: string }).bodyColor !== color) {
        const refs = (mesh.userData as { lights?: CarLightRefs }).lights;
        if (refs) refs.body.color.set(color);
        (mesh.userData as { bodyColor?: string }).bodyColor = color;
      }

      const interp = this.carInterp.get(c.userId)!;
      interp.tx = c.car.x;
      interp.ty = c.car.y;
      interp.ta = c.car.angle;
      interp.ts = c.car.speed;
    }

    for (const [id, mesh] of this.carMeshes) {
      if (!seen.has(id)) {
        this.carsGroup.remove(mesh);
        this.carMeshes.delete(id);
        this.carInterp.delete(id);
      }
    }
  }

  private updateCamera(local: SceneCar | undefined) {
    if (!local) return;

    const interp = this.carInterp.get(local.userId);
    if (!interp) return;

    const speed = Math.abs(interp.speed);
    const lookAhead = Math.min(5, speed * 0.65);
    const fx = Math.cos(interp.angle);
    const fz = Math.sin(interp.angle);
    const target = new THREE.Vector3(
      worldX(interp.x) + fx * lookAhead,
      0,
      worldZ(interp.y) + fz * lookAhead
    );
    this.controls.target.lerp(target, 0.22);

    if (this.freeCamera) return;

    const inOrbitMode = this.userOrbiting || Date.now() < this.orbitIdleUntil;
    if (inOrbitMode) return;

    const height = 4.8 + speed * 0.14;
    const dist = (8 + speed * 0.12) * this.zoom;
    // 전방(forward) 쪽 = 화면 아래(카메라) — W 누르면 카메라 방향으로 전진
    const camPos = new THREE.Vector3(
      worldX(interp.x) + fx * dist,
      height,
      worldZ(interp.y) + fz * dist
    );

    const shakeX = (Math.random() - 0.5) * this.shake * 0.45;
    const shakeY = (Math.random() - 0.5) * this.shake * 0.25;
    camPos.x += shakeX;
    camPos.y += shakeY;

    this.camera.position.lerp(camPos, 0.2);
    this.camera.fov = this.baseFov + speed * 0.85;
    this.camera.updateProjectionMatrix();
  }

  private onResize = () => {
    const w = this.mount.clientWidth;
    const h = this.mount.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private loop() {
    this.raf = requestAnimationFrame(this.loop);
    if (this.paused) return;

    this.tick += 1;
    this.shake *= 0.88;

    const localCar = this.lastCars.find((c) => c.userId === this.localUserId);

    for (const c of this.lastCars) {
      const interp = this.carInterp.get(c.userId);
      const mesh = this.carMeshes.get(c.userId);
      if (!interp || !mesh) continue;

      const t = c.isLocal ? 0.42 : 0.28;
      interp.x += (interp.tx - interp.x) * t;
      interp.y += (interp.ty - interp.y) * t;
      interp.angle = lerpAngle(interp.angle, interp.ta, t);
      interp.speed += (interp.ts - interp.speed) * t;

      mesh.position.set(worldX(interp.x), 0, worldZ(interp.y));
      mesh.rotation.y = CAR_MESH_Y_FROM_ANGLE(interp.angle);

      const wheels = (mesh.userData as { wheels?: THREE.Mesh[] }).wheels;
      if (wheels) {
        const spin = interp.speed * 0.35;
        for (const w of wheels) w.rotation.x += spin;
      }

      const frontWheels = (mesh.userData as { frontWheels?: THREE.Mesh[] }).frontWheels;
      if (frontWheels) {
        const steerAngle = c.car.steer * 0.85;
        for (const fw of frontWheels) fw.rotation.y = steerAngle;
      }

      applyCarLights(mesh, { ...c, car: { ...c.car, speed: interp.speed } }, this.tick);
    }

    if (localCar) {
      const interp = this.carInterp.get(localCar.userId);
      if (interp) {
        this.updateCamera({ ...localCar, car: { ...localCar.car, x: interp.x, y: interp.y, angle: interp.angle, speed: interp.speed } });
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.controls.dispose();
    this.asphaltTex?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
