"use client";

/** 계단 층간 이동 — 로비 → 목표 층 복도 */
export class StairClimbController {
  active = false;
  progress = 0;
  fromFloor = 1;
  toFloor = 2;
  readonly duration = 3.2;

  start(from: number, to: number) {
    this.fromFloor = from;
    this.toFloor = Math.max(from + 1, to);
    this.progress = 0;
    this.active = true;
  }

  cancel() {
    this.active = false;
    this.progress = 0;
  }

  tick(dt: number): {
    active: boolean;
    floor: number;
    avatarX: number;
    avatarY: number;
    avatarZ: number;
    avatarRot: number;
    done: boolean;
  } {
    if (!this.active) {
      return {
        active: false,
        floor: this.fromFloor,
        avatarX: -6,
        avatarY: 0.02,
        avatarZ: 2,
        avatarRot: Math.PI * 0.5,
        done: false,
      };
    }

    this.progress += dt / this.duration;
    const u = Math.min(1, this.progress);
    const eased = u * u * (3 - 2 * u);
    const floorSpan = this.toFloor - this.fromFloor;
    const floor = Math.round(this.fromFloor + eased * floorSpan);

    const avatarX = -6 + eased * 0.4;
    const avatarZ = 2 + eased * 2.4;
    const avatarY = 0.02 + eased * floorSpan * 0.11;
    const avatarRot = Math.PI * 0.5 + Math.sin(eased * Math.PI * 4) * 0.08;

    const done = u >= 1;
    if (done) this.active = false;

    return { active: !done, floor, avatarX, avatarY, avatarZ, avatarRot, done };
  }
}
