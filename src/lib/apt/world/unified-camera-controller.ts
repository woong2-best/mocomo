"use client";

import * as THREE from "three";
import type { AptWorldMode } from "./world-types";

export type CameraPreset = {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
};

const DISTRICT: CameraPreset = {
  position: new THREE.Vector3(22, 28, 22),
  target: new THREE.Vector3(0, 18, 0),
  fov: 42,
};

const TOWER: CameraPreset = {
  position: new THREE.Vector3(12, 14, 12),
  target: new THREE.Vector3(0, 4, 0),
  fov: 38,
};

const CORRIDOR: CameraPreset = {
  position: new THREE.Vector3(0, 2.1, 3.2),
  target: new THREE.Vector3(0, 1.4, 0),
  fov: 52,
};

/** 드래그·줌·회전·프리셋 전환을 지원하는 통합 카메라 */
export class UnifiedCameraController {
  readonly camera: THREE.PerspectiveCamera;
  private target = new THREE.Vector3();
  private spherical = new THREE.Spherical(18, Math.PI / 4, Math.PI / 4);
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private mode: AptWorldMode = "district";
  private transition: { from: CameraPreset; to: CameraPreset; t: number; dur: number } | null = null;
  private follow: THREE.Object3D | null = null;
  private followOffset = new THREE.Vector3(0, 1.6, 2.4);
  private enabled = true;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(DISTRICT.fov, aspect, 0.05, 200);
    this.applyPreset(DISTRICT, true);
  }

  setMode(mode: AptWorldMode, instant = false) {
    this.mode = mode;
    const preset =
      mode === "district"
        ? DISTRICT
        : mode === "tower" || mode === "elevator"
          ? TOWER
          : mode === "corridor"
            ? CORRIDOR
            : null;
    if (preset) this.transitionTo(preset, instant ? 0 : 0.85);
    if (mode !== "corridor") this.follow = null;
  }

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
    if (!this.enabled || this.mode === "interior") return;
    this.dragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };

  private onMove = (e: PointerEvent) => {
    if (!this.dragging || !this.enabled) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.spherical.theta -= dx * 0.005;
    this.spherical.phi = THREE.MathUtils.clamp(this.spherical.phi + dy * 0.005, 0.15, Math.PI / 2.1);
    this.syncFromSpherical();
  };

  private onUp = () => {
    this.dragging = false;
  };

  private onWheel = (e: WheelEvent) => {
    if (!this.enabled || this.mode === "interior") return;
    e.preventDefault();
    this.spherical.radius = THREE.MathUtils.clamp(this.spherical.radius + e.deltaY * 0.012, 4, 48);
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
      const desired = this.follow.getWorldPosition(new THREE.Vector3()).add(this.followOffset);
      this.camera.position.lerp(desired, 0.08);
      const look = this.follow.getWorldPosition(new THREE.Vector3());
      look.y += 0.9;
      this.camera.lookAt(look);
      moved = true;
    }
    return moved;
  }

  getTarget() {
    return this.target;
  }
}
