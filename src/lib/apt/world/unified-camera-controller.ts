"use client";

import * as THREE from "three";
import type { AptWorldMode } from "./world-types";

export type CameraPreset = {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
};

/** 광장·분수·아바타가 한 화면에 — 캐릭터 스케일 클로즈업 */
const DISTRICT: CameraPreset = {
  position: new THREE.Vector3(5.5, 4.2, 15),
  target: new THREE.Vector3(0, 1.6, 6),
  fov: 50,
};

const DISTRICT_INTRO_FROM: CameraPreset = {
  position: new THREE.Vector3(7.2, 5.2, 17.5),
  target: new THREE.Vector3(0, 1.8, 6),
  fov: 48,
};

const LOBBY_SLOT = new THREE.Vector3(-14, 0, 10);

const LOBBY: CameraPreset = {
  position: new THREE.Vector3(-13.5, 2.15, 14.8),
  target: new THREE.Vector3(-14, 1.15, 11.8),
  fov: 54,
};

const TOWER: CameraPreset = {
  position: new THREE.Vector3(6, 4.8, 9.5),
  target: new THREE.Vector3(0, 2.2, 0.5),
  fov: 48,
};

/** Bondee/AC — 어깨 너머 3/4, 아바타 중심 */
const CORRIDOR: CameraPreset = {
  position: new THREE.Vector3(0.35, 1.72, 2.25),
  target: new THREE.Vector3(0.05, 1.12, 0),
  fov: 50,
};

const FOLLOW_OFFSET_CORRIDOR = new THREE.Vector3(0.28, 1.28, 1.65);
const FOLLOW_OFFSET_LOBBY = new THREE.Vector3(0.12, 1.22, 1.85);

/** 드래그·줌·회전·프리셋 전환 + 시네마틱 자동 추적 */
export class UnifiedCameraController {
  readonly camera: THREE.PerspectiveCamera;
  private target = new THREE.Vector3();
  private spherical = new THREE.Spherical(18, Math.PI / 4, Math.PI / 4);
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private mode: AptWorldMode = "tower";
  private transition: { from: CameraPreset; to: CameraPreset; t: number; dur: number } | null = null;
  private follow: THREE.Object3D | null = null;
  private followOffset = FOLLOW_OFFSET_CORRIDOR.clone();
  private followLookY = 1.18;
  private enabled = true;
  private cinematicOnly = false;
  private districtIntro: { t: number; dur: number; from: CameraPreset; to: CameraPreset } | null = null;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(DISTRICT.fov, aspect, 0.05, 320);
    this.applyPreset(DISTRICT, true);
  }

  skipHeroIntro() {
    this.districtIntro = null;
    this.applyPreset(DISTRICT, true);
  }

  isHeroIntroPlaying() {
    return this.districtIntro !== null;
  }

  cancelMotion() {
    this.districtIntro = null;
    this.transition = null;
    this.flyPath = null;
  }

  /** 접속 직후 — 광장·건물·아바타가 보이는 짧은 줌인 */
  playDistrictIntro(duration = 2.4) {
    this.districtIntro = {
      t: 0,
      dur: duration,
      from: {
        position: DISTRICT_INTRO_FROM.position.clone(),
        target: DISTRICT_INTRO_FROM.target.clone(),
        fov: DISTRICT_INTRO_FROM.fov,
      },
      to: {
        position: DISTRICT.position.clone(),
        target: DISTRICT.target.clone(),
        fov: DISTRICT.fov,
      },
    };
    this.camera.position.copy(DISTRICT_INTRO_FROM.position);
    this.target.copy(DISTRICT_INTRO_FROM.target);
    this.camera.fov = DISTRICT_INTRO_FROM.fov;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.target);
    this.follow = null;
    this.transition = null;
    this.flyPath = null;
  }

  /** @deprecated playDistrictIntro 사용 */
  playHeroIntro(duration = 2.4) {
    this.playDistrictIntro(duration);
  }

  setMode(mode: AptWorldMode, instant = false, skipTransition = false) {
    this.mode = mode;
    this.cinematicOnly = mode === "corridor" || mode === "lobby";
    const preset =
      mode === "district"
        ? DISTRICT
        : mode === "tower" || mode === "elevator"
          ? TOWER
          : mode === "lobby"
            ? LOBBY
            : mode === "corridor"
              ? CORRIDOR
              : null;
    if (preset && !skipTransition && !this.flyPath) {
      this.transitionTo(preset, instant ? 0 : 0.95);
    }
    if (mode !== "corridor" && mode !== "lobby") this.follow = null;
  }

  flyThroughWall(
    exterior: THREE.Vector3,
    through: THREE.Vector3,
    interior: THREE.Vector3,
    duration = 1.4
  ) {
    this.districtIntro = null;
    this.follow = null;
    this.transition = null;
    this.flyPath = {
      points: [exterior.clone(), through.clone(), interior.clone()],
      t: 0,
      dur: duration,
      lookTarget: interior.clone(),
    };
  }

  private flyPath: {
    points: THREE.Vector3[];
    t: number;
    dur: number;
    lookTarget: THREE.Vector3;
  } | null = null;

  transitionTo(preset: CameraPreset, duration = 0.9) {
    this.transition = {
      from: {
        position: this.camera.position.clone(),
        target: this.target.clone(),
        fov: this.camera.fov,
      },
      to: preset,
      t: 0,
      dur: duration,
    };
  }

  followObject(obj: THREE.Object3D, offset?: THREE.Vector3) {
    this.follow = obj;
    if (offset) this.followOffset.copy(offset);
    else if (this.mode === "lobby") this.followOffset.copy(FOLLOW_OFFSET_LOBBY);
    else this.followOffset.copy(FOLLOW_OFFSET_CORRIDOR);
  }

  clearFollow() {
    this.follow = null;
  }

  setEnabled(v: boolean) {
    this.enabled = v;
  }

  resize(w: number, h: number) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  attach(canvas: HTMLCanvasElement) {
    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerup", this.onUp);
    canvas.addEventListener("pointercancel", this.onUp);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
  }

  detach(canvas: HTMLCanvasElement) {
    canvas.removeEventListener("pointerdown", this.onDown);
    canvas.removeEventListener("pointermove", this.onMove);
    canvas.removeEventListener("pointerup", this.onUp);
    canvas.removeEventListener("pointercancel", this.onUp);
    canvas.removeEventListener("wheel", this.onWheel);
  }

  private onDown = (e: PointerEvent) => {
    if (!this.enabled || this.mode === "interior" || this.cinematicOnly) return;
    if (!e.shiftKey && (this.mode === "corridor" || this.mode === "lobby")) return;
    this.dragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };

  private onMove = (e: PointerEvent) => {
    if (!this.dragging || !this.enabled || this.cinematicOnly) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.spherical.theta -= dx * 0.003;
    this.spherical.phi = THREE.MathUtils.clamp(this.spherical.phi + dy * 0.003, 0.2, Math.PI / 2.05);
    this.syncFromSpherical();
  };

  private onUp = () => {
    this.dragging = false;
  };

  private onWheel = (e: WheelEvent) => {
    if (!this.enabled || this.mode === "interior" || this.cinematicOnly) return;
    e.preventDefault();
    this.spherical.radius = THREE.MathUtils.clamp(this.spherical.radius + e.deltaY * 0.008, 4, 48);
    this.syncFromSpherical();
  };

  private applyPreset(p: CameraPreset, instant: boolean) {
    if (instant) {
      this.camera.position.copy(p.position);
      this.target.copy(p.target);
      this.camera.fov = p.fov;
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(this.target);
      const offset = p.position.clone().sub(p.target);
      this.spherical.setFromVector3(offset);
    }
  }

  private syncFromSpherical() {
    const pos = new THREE.Vector3().setFromSpherical(this.spherical).add(this.target);
    this.camera.position.copy(pos);
    this.camera.lookAt(this.target);
  }

  tick(dt: number): boolean {
    let moved = false;
    if (this.districtIntro) {
      this.districtIntro.t += dt;
      const u = Math.min(1, this.districtIntro.t / this.districtIntro.dur);
      const e = 1 - Math.pow(1 - u, 3);
      const { from, to } = this.districtIntro;
      this.camera.position.lerpVectors(from.position, to.position, e);
      this.target.lerpVectors(from.target, to.target, e);
      this.camera.fov = THREE.MathUtils.lerp(from.fov, to.fov, e);
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(this.target);
      moved = true;
      if (u >= 1) this.districtIntro = null;
    }
    if (this.flyPath) {
      this.flyPath.t += dt;
      const u = Math.min(1, this.flyPath.t / this.flyPath.dur);
      const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      const [a, b, c] = this.flyPath.points;
      const ab = new THREE.Vector3().lerpVectors(a, b, Math.min(1, e * 1.4));
      const bc = new THREE.Vector3().lerpVectors(b, c, Math.max(0, (e - 0.35) / 0.65));
      this.camera.position.copy(e < 0.5 ? ab : bc);
      this.target.lerp(this.flyPath.lookTarget, 0.08);
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, 50, 0.05);
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(this.target);
      moved = true;
      if (u >= 1) this.flyPath = null;
    }
    if (this.transition) {
      this.transition.t += dt;
      const u = Math.min(1, this.transition.t / this.transition.dur);
      const e = u * u * (3 - 2 * u);
      const { from, to } = this.transition;
      this.camera.position.lerpVectors(from.position, to.position, e);
      this.target.lerpVectors(from.target, to.target, e);
      this.camera.fov = THREE.MathUtils.lerp(from.fov, to.fov, e);
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(this.target);
      moved = true;
      if (u >= 1) this.transition = null;
    }
    if (this.follow) {
      const avatarPos = this.follow.getWorldPosition(new THREE.Vector3());
      const desired = avatarPos.clone().add(this.followOffset);
      this.camera.position.lerp(desired, 0.11);
      const look = avatarPos.clone();
      look.y = this.followLookY;
      look.x += 0.08;
      this.target.lerp(look, 0.13);
      this.camera.lookAt(this.target);
      moved = true;
    }
    return moved;
  }

  getTarget() {
    return this.target;
  }

  /** 로비 월드 좌표 (카메라 프리셋·전환용) */
  static lobbyWorldOffset() {
    return LOBBY_SLOT;
  }
}
