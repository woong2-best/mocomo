"use client";

import type { AvatarTrackingFrame } from "@/lib/virtual-avatar/tracking/types";
import type { PhotoAvatarRegion, PhotoAvatarRig } from "@/lib/photo-avatar/types";

function regionPx(r: PhotoAvatarRegion, w: number, h: number) {
  return {
    x: r.x * w,
    y: r.y * h,
    w: r.w * w,
    h: r.h * h,
  };
}

function idleBlinkPhase(timeMs: number): number {
  const t = (timeMs / 1000) % 3.4;
  if (t < 0.12) return t / 0.12;
  if (t < 0.2) return 1 - (t - 0.12) / 0.08;
  return 0;
}

/** 512×512 얼굴 이미지 + 눈 깜빡임·입 벌림·머리 회전 */
export class PhotoAvatarRenderer {
  private image: HTMLImageElement | null = null;
  private imageLoaded = false;
  private loadPromise: Promise<void> | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private rig: PhotoAvatarRig
  ) {
    void this.loadImage(rig.imageUrl);
  }

  updateRig(rig: PhotoAvatarRig) {
    this.rig = rig;
    void this.loadImage(rig.imageUrl);
  }

  private loadImage(url: string) {
    this.imageLoaded = false;
    this.loadPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        this.image = img;
        this.imageLoaded = true;
        resolve();
      };
      img.onerror = () => reject(new Error("사진 아바타 이미지 로드 실패"));
      img.src = url;
    });
  }

  async waitReady() {
    await this.loadPromise;
  }

  isReady() {
    return this.imageLoaded && !!this.image;
  }

  render(frame: AvatarTrackingFrame | null, now = performance.now()) {
    const ctx = this.canvas.getContext("2d");
    const img = this.image;
    if (!ctx || !img || !this.imageLoaded) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    const idleBlink = idleBlinkPhase(now);
    const blinkL = frame?.expression?.blinkLeft ?? frame?.blendShapes?.eyeBlinkLeft ?? idleBlink;
    const blinkR = frame?.expression?.blinkRight ?? frame?.blendShapes?.eyeBlinkRight ?? idleBlink;
    const jawOpen = Math.min(
      1,
      Math.max(
        frame?.expression?.jawOpen ?? 0,
        frame?.blendShapes?.jawOpen ?? 0,
        (frame?.visemes?.aa ?? 0) * 0.85
      )
    );

    const yaw = frame?.pose?.yaw ?? 0;
    const pitch = frame?.pose?.pitch ?? 0;
    const roll = frame?.pose?.roll ?? 0;

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(roll * 0.35 + yaw * 0.25);
    ctx.translate(-w / 2 + yaw * w * 0.04, -h / 2 + pitch * h * 0.03);

    ctx.drawImage(img, 0, 0, w, h);

    this.drawEyeBlink(ctx, img, w, h, this.rig.leftEye, blinkL);
    this.drawEyeBlink(ctx, img, w, h, this.rig.rightEye, blinkR);
    this.drawMouthOpen(ctx, img, w, h, jawOpen);

    ctx.restore();
  }

  private drawEyeBlink(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    w: number,
    h: number,
    region: PhotoAvatarRegion,
    blink: number
  ) {
    if (blink < 0.04) return;
    const r = regionPx(region, w, h);
    const scaleY = Math.max(0.06, 1 - blink * 0.94);
    const cy = r.y + r.h / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    ctx.translate(r.x + r.w / 2, cy);
    ctx.scale(1, scaleY);
    ctx.translate(-(r.x + r.w / 2), -cy);
    ctx.drawImage(img, 0, 0, w, h);
    ctx.restore();
  }

  private drawMouthOpen(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    w: number,
    h: number,
    jawOpen: number
  ) {
    if (jawOpen < 0.03) return;
    const mouth = regionPx(this.rig.mouth, w, h);
    const splitY = this.rig.mouthSplitY * h;
    const lowerY = Math.max(mouth.y, splitY - mouth.h * 0.05);
    const lowerH = mouth.y + mouth.h - lowerY;
    const offset = jawOpen * mouth.h * 0.55;

    ctx.save();
    ctx.beginPath();
    ctx.rect(mouth.x, lowerY, mouth.w, lowerH + offset);
    ctx.clip();
    ctx.drawImage(img, 0, offset, w, h);
    ctx.restore();
  }
}
