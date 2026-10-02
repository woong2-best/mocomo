"use client";

import * as THREE from "three";
import { DOLLHOUSE_ELEVATOR_W } from "./dollhouse-meshes";

const OPEN_LEFT = -DOLLHOUSE_ELEVATOR_W * 0.21;
const OPEN_RIGHT = DOLLHOUSE_ELEVATOR_W * 0.21;
const CLOSED_LEFT = -0.03;
const CLOSED_RIGHT = 0.03;

/** 엘리베이터 양개문 슬라이드 (0=열림, 1=닫힘) */
export class ElevatorDoorAnimator {
  private doorLeft: THREE.Object3D | null = null;
  private doorRight: THREE.Object3D | null = null;
  private closed = 1;
  private targetClosed = 1;
  private hallLeft: THREE.Object3D | null = null;
  private hallRight: THREE.Object3D | null = null;

  bindCar(car: THREE.Object3D | null) {
    this.doorLeft = car?.getObjectByName("elevator-door-left") ?? null;
    this.doorRight = car?.getObjectByName("elevator-door-right") ?? null;
    this.apply(this.closed);
  }

  bindHall(hallRoot: THREE.Object3D | null) {
    this.hallLeft = hallRoot?.getObjectByName("elevator-door-left") ?? null;
    this.hallRight = hallRoot?.getObjectByName("elevator-door-right") ?? null;
  }

  setClosed(closed: number) {
    this.closed = THREE.MathUtils.clamp(closed, 0, 1);
    this.targetClosed = this.closed;
    this.apply(this.closed);
  }

  setTarget(closed: number) {
    this.targetClosed = THREE.MathUtils.clamp(closed, 0, 1);
  }

  /** dt 기반 부드러운 문 애니메이션 */
  tick(dt: number): boolean {
    const prev = this.closed;
    this.closed = THREE.MathUtils.lerp(this.closed, this.targetClosed, Math.min(1, dt * 5.5));
    if (Math.abs(this.closed - prev) > 0.002) {
      this.apply(this.closed);
      return true;
    }
    return false;
  }

  animateTo(closed: number, duration: number, elapsed: number) {
    const u = Math.min(1, elapsed / Math.max(0.01, duration));
    const eased = u * u * (3 - 2 * u);
    const from = this.closed;
    this.setClosed(THREE.MathUtils.lerp(from, closed, eased));
  }

  private apply(closed: number) {
    const c = THREE.MathUtils.clamp(closed, 0, 1);
    const lx = THREE.MathUtils.lerp(OPEN_LEFT, CLOSED_LEFT, c);
    const rx = THREE.MathUtils.lerp(OPEN_RIGHT, CLOSED_RIGHT, c);
    if (this.doorLeft) this.doorLeft.position.x = lx;
    if (this.doorRight) this.doorRight.position.x = rx;
    if (this.hallLeft) this.hallLeft.position.x = lx * 0.95;
    if (this.hallRight) this.hallRight.position.x = rx * 0.95;
  }
}

export function playElevatorDing(scene: THREE.Scene, position: THREE.Vector3) {
  if (typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    void ctx.close();
  } catch {
    /* ignore audio errors */
  }
  void position;
}
