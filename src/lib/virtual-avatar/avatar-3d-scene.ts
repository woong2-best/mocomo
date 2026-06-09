"use client";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm";
import { loadActiveVrm } from "@/lib/virtual-avatar/vrm-storage";
import { exportGlbFromScene } from "@/lib/virtual-avatar/avatar-export";
import { TrackingTimelinePlayer } from "@/lib/virtual-avatar/tracking/tracking-timeline";
import type { AvatarConfig, AvatarStyle } from "@/lib/virtual-avatar/types";
import {
  applyFaceTrackingToVrm,
  applyTrackingFaceMorphs,
  resetAvatarFacing,
  type AvatarFaceTrackingFrame,
} from "@/lib/virtual-avatar/face-tracking";
import {
  applyBodyMorphToVrm,
  compensateFeetToFloor,
} from "@/lib/virtual-avatar/body-morph";
import { applyFaceMorphToVrm, applyFaceNormalizedAdjustments, applyAppearanceToVrm, stabilizeVrmSpringBones } from "@/lib/virtual-avatar/face-morph";
import { tickSpringPhysics, initSpringPhysics } from "@/lib/virtual-avatar/tracking/spring-physics";
import { VrmMocapPlayer, type MocapPreset } from "@/lib/virtual-avatar/tracking/mocap-player";
import { AvatarRenderStack } from "@/lib/virtual-avatar/avatar-render-stack";
import { FacePaintLayer } from "@/lib/virtual-avatar/face-paint-layer";
import { BodyPaintLayer } from "@/lib/virtual-avatar/body-paint-layer";
import { createStudioFloor, enhanceVrmForStudio } from "@/lib/virtual-avatar/vrm-material-pro";
import { VrmAttachmentManager } from "@/lib/virtual-avatar/vrm-attachment-manager";
import { avatarSculptSession } from "@/lib/virtual-avatar/avatar-sculpt";
import { collectSceneMaterials, tickMToonMaterials } from "@/lib/virtual-avatar/material-utils";

const DEFAULT_VRM = "/avatars/default.vrm";
export const DEFAULT_AVATAR_VRM_URL = DEFAULT_VRM;
/** 발(바닥) 월드 Y — 캐릭터 전체를 이 높이로 올림 */
const STAGE_FLOOR_Y = 0.52;
/** 카메라가 바라보는 Y를 몸 중심보다 이만큼 아래로 → 머리가 화면 위쪽에 보임 */
const FRAME_LOOK_OFFSET = 0.42;

export type BroadcastBgMode = "normal" | "transparent" | "chroma";

export class VirtualAvatar3DScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private clock = new THREE.Clock();
  private raf = 0;
  private vrm: VRM | null = null;
  private loading = false;
  private blinkTimer = 0;
  private motionPhase = 0;
  private keyLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private ambient: THREE.AmbientLight;
  private lastZoom = 1;
  private fps = 60;
  private baseCameraDistance = 3.4;
  private grid: THREE.GridHelper;
  private avatarBaseY = 0;
  private mocapPlayer = new VrmMocapPlayer();
  private trackingPlayer = new TrackingTimelinePlayer();
  private broadcastMode: BroadcastBgMode = "normal";
  private vrmModelName = "기본 VRM";
  private onVrmLoaded: ((name: string) => void) | null = null;
  private renderStack: AvatarRenderStack;
  private facePaint = new FacePaintLayer();
  private bodyPaint = new BodyPaintLayer();
  private attachments = new VrmAttachmentManager();
  private mtoonMaterials: THREE.Material[] = [];
  private studioFloor: THREE.Mesh;
  private lastRenderKey = "";
  private lastEquippedKey = "";
  private attachmentSyncPending = false;
  private liveCaptureMode = false;
  private onAfterRender: (() => void) | null = null;

  private getConfig: () => AvatarConfig = () => ({}) as AvatarConfig;
  private getFaceTracking: () => AvatarFaceTrackingFrame | null = () => null;

  constructor(private container: HTMLElement) {
    const w = Math.max(container.clientWidth, 320);
    const h = Math.max(container.clientHeight, 400);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 100);
    this.camera.position.set(0, 0.72, 3.2);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    this.renderStack = new AvatarRenderStack(this.renderer, this.scene, this.camera);
    this.renderStack.setQuality("studio");

    this.ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.keyLight = new THREE.DirectionalLight(0xfff5e6, 1.1);
    this.keyLight.position.set(1.5, 2.5, 2);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.bias = -0.0002;
    this.fillLight = new THREE.DirectionalLight(0xc8d8ff, 0.45);
    this.fillLight.position.set(-2, 1.5, 1);
    this.rimLight = new THREE.DirectionalLight(0xffd4a8, 0.35);
    this.rimLight.position.set(0, 2, -2);
    this.scene.add(this.ambient, this.keyLight, this.fillLight, this.rimLight);

    const grid = new THREE.GridHelper(4, 16, 0x4a5568, 0x2d3748);
    grid.position.y = 0;
    grid.material.opacity = 0.12;
    grid.material.transparent = true;
    this.scene.add(grid);
    this.grid = grid;

    this.studioFloor = createStudioFloor();
    this.scene.add(this.studioFloor);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.72, 0);
    this.controls.enableDamping = true;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 8;
    this.controls.maxPolarAngle = Math.PI * 0.85;
    this.controls.update();

    void this.loadInitialVrm();
  }

  setBroadcastMode(mode: BroadcastBgMode) {
    if (this.liveCaptureMode && mode !== "transparent") return;
    this.broadcastMode = mode;
    const transparent = mode === "transparent";
    this.renderStack.setTransparentMode(transparent);
    if (mode === "transparent") {
      this.renderer.setClearColor(0x000000, 0);
      this.grid.visible = false;
      this.studioFloor.visible = false;
    } else if (mode === "chroma") {
      this.renderer.setClearColor(0x00ff00, 1);
      this.grid.visible = false;
      this.studioFloor.visible = false;
    } else {
      this.renderer.setClearColor(0x000000, 0);
      this.grid.visible = true;
      this.studioFloor.visible = true;
    }
  }

  /** WHIP VTuber 송출 — 투명 배경·고정 카메라·그리드 비활성 */
  setLiveCaptureMode(on: boolean) {
    this.liveCaptureMode = on;
    if (on) {
      this.setBroadcastMode("transparent");
      this.controls.enabled = false;
      this.controls.autoRotate = false;
      this.lastRenderKey = "";
      this.renderStack.setQuality("studio");
      this.renderStack.setLiveCaptureQuality(true);
      this.fitVtuberBroadcastView();
    } else {
      this.controls.enabled = true;
    }
  }

  setOnAfterRender(cb: (() => void) | null) {
    this.onAfterRender = cb;
  }

  async reloadActiveVrmFromStorage() {
    const custom = await loadActiveVrm();
    if (custom) {
      await this.loadVrmFromBlob(custom.blob, custom.name);
      return;
    }
    await this.loadVrmFromUrl(DEFAULT_VRM, "기본 VRM");
  }

  /** 스튜디오·다른 탭에서 프리셋 변경 시 액세서리·머티리얼 재적용 */
  refreshExternalConfig() {
    this.lastEquippedKey = "";
    this.lastRenderKey = "";
  }

  getCanvasElement() {
    return this.renderer.domElement;
  }

  getCaptureStream(fps = 30) {
    return this.renderer.domElement.captureStream(fps);
  }

  async exportGlb(): Promise<Blob | null> {
    if (!this.vrm) return null;
    return exportGlbFromScene(this.vrm.scene);
  }

  async loadTrackingTimeline(file: File): Promise<boolean> {
    const ok = await this.trackingPlayer.loadFile(file);
    if (ok && this.vrm) {
      this.mocapPlayer.stop(this.vrm);
      this.trackingPlayer.play();
    }
    return ok;
  }

  stopTrackingTimeline() {
    this.trackingPlayer.stop();
  }

  isTrackingTimelinePlaying() {
    return this.trackingPlayer.isPlaying();
  }

  setOnVrmLoaded(cb: (name: string) => void) {
    this.onVrmLoaded = cb;
  }

  getVrmModelName() {
    return this.vrmModelName;
  }

  isReady() {
    return !!this.vrm && !this.loading;
  }

  start(
    getConfig: () => AvatarConfig,
    getFaceTracking?: () => AvatarFaceTrackingFrame | null
  ) {
    this.getConfig = getConfig;
    if (getFaceTracking) this.getFaceTracking = getFaceTracking;
    const loop = () => {
      const dt = this.clock.getDelta();
      this.tick(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => this.resize());
    ro.observe(this.container);
    this.container.dataset.avatar3dObserver = "1";
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.controls.dispose();
    this.vrm?.springBoneManager?.reset();
    this.renderStack.dispose();
    this.facePaint.dispose();
    this.bodyPaint.dispose();
    this.attachments.dispose();
    this.studioFloor.geometry.dispose();
    (this.studioFloor.material as THREE.Material).dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  exportPng(): string {
    this.renderStack.render();
    return this.renderer.domElement.toDataURL("image/png");
  }

  /** 아바타 전체(발 포함)를 위로 올림 */
  private centerAvatarOnStage() {
    if (!this.vrm) return;

    this.vrm.scene.position.y = this.avatarBaseY;
    this.vrm.scene.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(this.vrm.scene);
    if (box.isEmpty()) return;

    const lift = STAGE_FLOOR_Y - box.min.y;
    this.vrm.scene.position.y = this.avatarBaseY + lift;
    this.vrm.scene.updateMatrixWorld(true);

    const feetBox = new THREE.Box3().setFromObject(this.vrm.scene);
    this.grid.position.y = feetBox.min.y;
  }

  /** 전신이 화면 위쪽에 오도록 카메라·위치 초기 배치 (뷰 리셋 시에만 호출) */
  fitFullBodyView(preserveZoom = false) {
    if (!this.vrm) return;

    this.centerAvatarOnStage();
    this.vrm.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.vrm.scene);
    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const lookY = center.y - size.y * FRAME_LOOK_OFFSET;
    this.controls.target.set(0, lookY, 0);

    const fovRad = (this.camera.fov * Math.PI) / 180;
    const aspect = Math.max(this.camera.aspect, 0.5);
    const bodySpan = Math.max(size.y * 0.38, Math.min(size.x, size.z) * 0.68);
    const distV = (size.y * 1.04) / (2 * Math.tan(fovRad / 2));
    const distH = (bodySpan * 1.04) / (2 * Math.tan(fovRad / 2) * aspect);
    const dist = Math.max(distV, distH, 2.2);

    this.baseCameraDistance = dist;
    if (!preserveZoom) this.lastZoom = 1;

    const zoom = preserveZoom ? this.lastZoom : 1;
    const finalDist = dist / zoom;
    this.camera.position.set(0, lookY, finalDist);
    this.controls.update();
  }

  /** VTuber 송출용 — 상반신·전신 히어로 샷 */
  fitVtuberBroadcastView() {
    if (!this.vrm) return;

    this.centerAvatarOnStage();
    this.vrm.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.vrm.scene);
    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const lookY = center.y - size.y * 0.32;
    this.controls.target.set(0, lookY, 0);

    const fovRad = (this.camera.fov * Math.PI) / 180;
    const aspect = Math.max(this.camera.aspect, 0.5);
    const bodySpan = Math.max(size.y * 0.42, Math.min(size.x, size.z) * 0.72);
    const distV = (size.y * 0.98) / (2 * Math.tan(fovRad / 2));
    const distH = (bodySpan * 0.98) / (2 * Math.tan(fovRad / 2) * aspect);
    const dist = Math.max(distV, distH, 2.05) * 0.94;

    this.baseCameraDistance = dist;
    this.lastZoom = 1;
    this.camera.position.set(0, lookY, dist);
    this.controls.update();
  }

  getStats() {
    let tris = 0;
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) {
        tris += mesh.geometry.index
          ? mesh.geometry.index.count / 3
          : (mesh.geometry.attributes.position?.count ?? 0) / 3;
      }
    });
    return { triangles: Math.round(tris), fps: this.fps };
  }

  private resize() {
    const w = Math.max(this.container.clientWidth, 1);
    const h = Math.max(this.container.clientHeight, 1);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderStack.resize(w, h);
  }

  private async loadInitialVrm() {
    const custom = await loadActiveVrm();
    if (custom) {
      await this.loadVrmFromBlob(custom.blob, custom.name);
      return;
    }
    await this.loadVrmFromUrl(DEFAULT_VRM, "기본 VRM");
  }

  private resolveTracking(dt: number): AvatarFaceTrackingFrame | null {
    const timeline = this.trackingPlayer.sample(dt);
    if (timeline) return timeline;
    return this.getFaceTracking();
  }

  private isTrackingLive(frame: AvatarFaceTrackingFrame | null) {
    if (!frame?.detected) return false;
    if (this.trackingPlayer.isPlaying()) return true;
    return performance.now() - frame.timestamp < 900;
  }

  async loadVrmFromFile(file: File): Promise<boolean> {
    return this.loadVrmFromBlob(file, file.name);
  }

  async loadVrmFromUrl(url: string, name?: string): Promise<boolean> {
    if (this.loading) return false;
    this.loading = true;

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    try {
      const gltf = await loader.loadAsync(url);
      const vrm = gltf.userData.vrm as VRM | undefined;
      if (!vrm) throw new Error("VRM data missing");
      this.mountVrm(vrm, name ?? url.split("/").pop() ?? "VRM");
      return true;
    } catch (e) {
      console.error("[avatar-3d] VRM load failed", e);
      return false;
    } finally {
      this.loading = false;
    }
  }

  private async loadVrmFromBlob(blob: Blob, name: string): Promise<boolean> {
    const url = URL.createObjectURL(blob);
    try {
      return await this.loadVrmFromUrl(url, name);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  private mountVrm(vrm: VRM, name: string) {
    if (this.vrm) {
      this.mocapPlayer.stop(this.vrm);
      this.attachments.unmount();
      this.scene.remove(this.vrm.scene);
      VRMUtils.deepDispose(this.vrm.scene);
    }

    vrm.scene.rotation.y = Math.PI;
    vrm.scene.position.y = 0;
    this.scene.add(vrm.scene);
    this.vrm = vrm;
    this.vrmModelName = name;
    const quality = this.getConfig().effects?.renderQuality ?? "studio";
    const cel = this.getConfig().effects?.celShading ?? true;
    enhanceVrmForStudio(vrm, this.renderStack.getEnvironmentMap(), quality, cel);
    this.mtoonMaterials = collectSceneMaterials(vrm.scene);
    this.attachments.mount(vrm);
    initSpringPhysics(vrm);
    this.fitFullBodyView();
    requestAnimationFrame(() => {
      this.fitFullBodyView();
      stabilizeVrmSpringBones(vrm);
    });
    this.onVrmLoaded?.(name);
    this.lastEquippedKey = "";
  }

  playMocapPreset(preset: MocapPreset) {
    if (this.vrm) this.mocapPlayer.playPreset(this.vrm, preset);
  }

  async loadMocapBvh(file: File): Promise<boolean> {
    if (!this.vrm) return false;
    return this.mocapPlayer.loadBvhFile(this.vrm, file);
  }

  async loadMocapFbx(file: File): Promise<boolean> {
    if (!this.vrm) return false;
    return this.mocapPlayer.loadFbxFile(this.vrm, file);
  }

  async connectMocapStream(url: string): Promise<boolean> {
    if (!this.vrm) return false;
    return this.mocapPlayer.connectStream(this.vrm, url);
  }

  stopMocap() {
    if (this.vrm) this.mocapPlayer.stop(this.vrm);
  }

  isMocapPlaying() {
    return this.mocapPlayer.isPlaying();
  }

  private tick(dt: number) {
    this.fps = Math.round(1 / Math.max(dt, 0.001));
    const config = this.getConfig();
    const tracking = this.resolveTracking(dt);
    const trackingLive = this.isTrackingLive(tracking);

    this.applyBackground(config);
    this.applyStyle(config.style);
    this.applyRenderQuality(config);
    this.applyMotion(config, dt, tracking, trackingLive);
    this.applyFace(config, tracking, trackingLive);

    if (this.vrm) {
      const mocapLive = this.mocapPlayer.isPlaying();

      if (mocapLive) {
        this.mocapPlayer.update(this.vrm, dt);
      }

      applyFaceNormalizedAdjustments(this.vrm, config.face, { trackingLive });
      this.vrm.update(dt);

      if (trackingLive && tracking) {
        const bodyMotion = tracking.body?.detected ? 0.4 : 0;
        tickSpringPhysics(this.vrm, tracking.pose, bodyMotion, dt);
        applyTrackingFaceMorphs(this.vrm, tracking);
        applyFaceMorphToVrm(this.vrm, config.face, { trackingLive: true });
      } else if (!mocapLive) {
        applyFaceMorphToVrm(this.vrm, config.face);
      } else {
        applyFaceMorphToVrm(this.vrm, config.face, { trackingLive: false });
      }
      applyBodyMorphToVrm(this.vrm, config.body);
      applyAppearanceToVrm(this.vrm, config);
      if (config.effects.renderQuality !== "performance") {
        this.facePaint.applyToVrm(this.vrm, config);
      }
      this.bodyPaint.applyToVrm(this.vrm, config);
      avatarSculptSession.apply(this.vrm, config.sculpt);
      this.syncAttachments(config);
      compensateFeetToFloor(this.vrm, STAGE_FLOOR_Y);
      if (this.broadcastMode === "normal") {
        this.grid.position.y = STAGE_FLOOR_Y;
      }
    }

    this.applyCamera(config, trackingLive);

    tickMToonMaterials(this.mtoonMaterials, dt);
    if (this.liveCaptureMode) {
      this.controls.autoRotate = false;
    } else {
      this.controls.update();
    }
    this.renderStack.render();
    this.onAfterRender?.();
  }

  private syncAttachments(config: AvatarConfig) {
    if (!this.vrm) return;
    const key = JSON.stringify(config.equipped) + config.outfit.layers;
    if (key === this.lastEquippedKey || this.attachmentSyncPending) return;
    this.lastEquippedKey = key;
    this.attachmentSyncPending = true;
    void this.attachments.sync(this.vrm, config).finally(() => {
      this.attachmentSyncPending = false;
    });
  }

  sculptAtScreen(x: number, y: number, getConfig: () => AvatarConfig): AvatarConfig["sculpt"] | null {
    if (!this.vrm) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const nx = ((x - rect.left) / rect.width) * 2 - 1;
    const ny = -((y - rect.top) / rect.height) * 2 + 1;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(nx, ny), this.camera);
    const hits = ray.intersectObject(this.vrm.scene, true);
    const hit = hits.find((h) => h.object.name.toLowerCase().includes("face"));
    if (!hit?.face?.normal) return null;
    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    return avatarSculptSession.sculptAt(this.vrm, hit.point, normal, getConfig().sculpt);
  }

  private applyRenderQuality(config: AvatarConfig) {
    const q = this.liveCaptureMode ? "studio" : (config.effects.renderQuality ?? "studio");
    const cel = config.effects.celShading ?? true;
    const key = `${q}:${cel}`;
    if (key === this.lastRenderKey) return;
    this.lastRenderKey = key;
    this.renderStack.setQuality(q);
    if (this.vrm) {
      enhanceVrmForStudio(this.vrm, this.renderStack.getEnvironmentMap(), q, cel);
      this.mtoonMaterials = collectSceneMaterials(this.vrm.scene);
    }
    this.studioFloor.visible =
      !this.liveCaptureMode && this.broadcastMode === "normal" && q !== "performance";
    this.renderer.toneMappingExposure = q === "cinematic" ? 1.15 : 1.08;
  }

  private applyBackground(config: AvatarConfig) {
    if (this.broadcastMode === "transparent") {
      this.scene.background = null;
      return;
    }
    if (this.broadcastMode === "chroma") {
      this.scene.background = new THREE.Color(0x00ff00);
      return;
    }
    const bg = config.effects.background;
    const colors: Record<string, number> = {
      space: 0x1e1b4b,
      pink: 0x831843,
      cyber: 0x0f172a,
      nature: 0x14532d,
      solid: 0x27272a,
    };
    this.scene.background = new THREE.Color(colors[bg] ?? colors.space);
  }

  private applyStyle(style: AvatarStyle) {
    switch (style) {
      case "realistic":
        this.ambient.intensity = 0.35;
        this.keyLight.intensity = 1.4;
        this.fillLight.intensity = 0.6;
        this.rimLight.intensity = 0.2;
        break;
      case "cartoon":
        this.ambient.intensity = 0.75;
        this.keyLight.intensity = 0.85;
        this.fillLight.intensity = 0.55;
        this.rimLight.intensity = 0.15;
        break;
      case "cyberpunk":
        this.ambient.intensity = 0.25;
        this.keyLight.color.setHex(0x22d3ee);
        this.keyLight.intensity = 1.2;
        this.fillLight.color.setHex(0xf472b6);
        this.fillLight.intensity = 0.5;
        this.rimLight.color.setHex(0xa855f7);
        this.rimLight.intensity = 0.6;
        break;
      default:
        this.ambient.intensity = 0.55;
        this.keyLight.color.setHex(0xfff5e6);
        this.keyLight.intensity = 1.1;
        this.fillLight.color.setHex(0xc8d8ff);
        this.fillLight.intensity = 0.45;
        this.rimLight.color.setHex(0xffd4a8);
        this.rimLight.intensity = 0.35;
    }
  }

  private applyMotion(
    config: AvatarConfig,
    dt: number,
    tracking: AvatarFaceTrackingFrame | null,
    trackingLive: boolean
  ) {
    if (!this.vrm || this.mocapPlayer.isPlaying() || this.trackingPlayer.isPlaying()) return;

    const bodyTracked = trackingLive && tracking?.body?.detected;

    const humanoid = this.vrm.humanoid;
    const upperArm = humanoid?.getNormalizedBoneNode("rightUpperArm");
    const lowerArm = humanoid?.getNormalizedBoneNode("rightLowerArm");
    if (upperArm && lowerArm && !bodyTracked && config.effects.motion === "wave") {
      const t = this.motionPhase;
      upperArm.rotation.z = -0.8 + Math.sin(t * 6) * 0.5;
      lowerArm.rotation.z = -0.4;
    }

    if (!config.effects.animationPlaying) return;
    this.motionPhase += dt;

    const root = humanoid?.getNormalizedBoneNode("hips");
    if (root && !bodyTracked && config.effects.motion === "idle") {
      root.position.y = Math.sin(this.motionPhase * 2) * 0.008;
    }
    if (config.effects.motion === "dance") {
      if (!trackingLive) {
        this.vrm.scene.rotation.y = Math.PI + Math.sin(this.motionPhase * 3) * 0.35;
      }
    } else if (!trackingLive) {
      this.vrm.scene.rotation.y = THREE.MathUtils.lerp(this.vrm.scene.rotation.y, Math.PI, 0.15);
    }
    if (config.effects.motion === "bow") {
      const spine = humanoid?.getNormalizedBoneNode("spine");
      if (spine) spine.rotation.x = 0.25 + Math.sin(this.motionPhase * 2) * 0.1;
    }
  }

  private applyFace(
    config: AvatarConfig,
    tracking: AvatarFaceTrackingFrame | null,
    trackingLive: boolean
  ) {
    if (!this.vrm) return;

    const em = this.vrm.expressionManager;
    const live = trackingLive && !this.mocapPlayer.isPlaying();

    if (em && !this.mocapPlayer.isPlaying()) {
      if (live && tracking) {
        applyFaceTrackingToVrm(this.vrm, tracking);
      } else {
        resetAvatarFacing(this.vrm);
        em.setValue("happy", config.effects.motion === "smile" ? 0.7 : 0.05);
        em.setValue("aa", config.effects.motion === "talk" ? 0.35 + Math.sin(this.motionPhase * 12) * 0.2 : 0);
        em.setValue("blink", this.blinkTimer > 0.12 ? 1 : 0);

        this.blinkTimer += 0.016;
        if (this.blinkTimer > 3.2) this.blinkTimer = 0;
      }
    }
  }

  private applyCamera(config: AvatarConfig, trackingLive: boolean) {
    if (this.liveCaptureMode) {
      this.controls.autoRotate = false;
      return;
    }
    this.controls.autoRotate =
      !trackingLive && config.view.autoRotate && config.effects.animationPlaying;
    this.controls.autoRotateSpeed = 1.2;

    if (this.lastZoom !== config.view.zoom) {
      this.lastZoom = config.view.zoom;
      const dist = this.baseCameraDistance / config.view.zoom;
      const dir = this.camera.position.clone().sub(this.controls.target).normalize();
      this.camera.position.copy(this.controls.target).add(dir.multiplyScalar(dist));
    }
  }
}
