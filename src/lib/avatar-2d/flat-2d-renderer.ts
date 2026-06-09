"use client";

import type { AvatarTrackingFrame } from "@/lib/virtual-avatar/tracking/types";
import type { Flat2dAvatarMeta } from "@/lib/avatar-2d/types";
import { AVATAR_2D_SIZE } from "@/lib/avatar-2d/types";

/** 투명 PNG 스프라이트 + 얼굴 트래킹(머리 기울기·위치) */
export class Flat2dAvatarRenderer {
  private image: HTMLImageElement | null = null;
  private imageLoaded = false;
  private loadPromise: Promise<void> | null = null;
  private meta: Flat2dAvatarMeta;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    meta: Flat2dAvatarMeta
  ) {
    this.meta = meta;
    void this.loadImage(meta.imageUrl);
  }

  updateMeta(meta: Flat2dAvatarMeta) {
    this.meta = meta;
    void this.loadImage(meta.imageUrl);
  }

  private loadImage(url: string) {
    this.imageLoaded = false;
    this.loadPromise = new Promise((resolve, reject) => {
      const img = new Image();
      if (!url.startsWith("blob:") && !url.startsWith("data:")) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => {
        this.image = img;
        this.imageLoaded = true;
        resolve();
      };
      img.onerror = () => reject(new Error("2D 아바타 이미지 로드 실패"));
      img.src = url;
    });
  }

  async waitReady() {
    await this.loadPromise;
  }

  isReady() {
    return this.imageLoaded && !!this.image;
  }

  render(frame: AvatarTrackingFrame | null) {
    const ctx = this.canvas.getContext("2d");
    const img = this.image;
    if (!ctx || !img || !this.imageLoaded) return;

    const cw = this.canvas.width;
    const ch = this.canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    const yaw = frame?.pose?.yaw ?? 0;
    const pitch = frame?.pose?.pitch ?? 0;
    const roll = frame?.pose?.roll ?? 0;

    const scale = Math.min(cw / img.width, ch / img.height) * 0.88;
    const dw = img.width * scale;
    const dh = img.height * scale;

    ctx.save();
    ctx.translate(cw / 2 + yaw * cw * 0.06, ch / 2 + pitch * ch * 0.05);
    ctx.rotate(roll * 0.4 + yaw * 0.2);
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }
}

export function createFlat2dCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_2D_SIZE;
  canvas.height = AVATAR_2D_SIZE;
  return canvas;
}
