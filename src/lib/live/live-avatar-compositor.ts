"use client";

import type { LiveOverlayState } from "@/lib/live-overlays/types";
import {
  drawLiveGradientBackground,
  drawLiveOverlaysToCanvas,
} from "@/lib/live/live-overlay-canvas";

export type LiveCompositorLayout = "avatar" | "camera-bg";

/** WHIP 송출용 — 카메라·VRM·오버레이 고품질 합성 */
export class LiveAvatarCompositor {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private outputStream: MediaStream | null = null;
  private running = false;
  private rafId = 0;
  private cameraVideo: HTMLVideoElement | null = null;
  private avatarCanvas: HTMLCanvasElement | null = null;
  private layout: LiveCompositorLayout = "avatar";
  private overlayState: LiveOverlayState | null = null;
  private width = 1920;
  private height = 1080;
  private pendingAvatarFrame = false;

  constructor(width = 1920, height = 1080) {
    this.width = width;
    this.height = height;
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!ctx) throw new Error("Canvas 2D not supported");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";
  }

  setOverlayState(state: LiveOverlayState | null) {
    this.overlayState = state;
  }

  setLayout(layout: LiveCompositorLayout) {
    this.layout = layout;
  }

  /** Three.js 렌더 직후 호출 — 프레임 동기화 */
  notifyAvatarFrame() {
    this.pendingAvatarFrame = true;
  }

  start(
    avatarCanvas: HTMLCanvasElement,
    cameraStream?: MediaStream | null,
    layout: LiveCompositorLayout = "avatar"
  ) {
    this.stop();
    this.avatarCanvas = avatarCanvas;
    this.layout = layout;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    if (cameraStream && cameraStream.getVideoTracks().length > 0) {
      const video = document.createElement("video");
      video.srcObject = new MediaStream(cameraStream.getVideoTracks());
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      this.cameraVideo = video;
      void video.play().catch(() => undefined);
    }

    this.running = true;
    this.loop();
    this.outputStream = this.canvas.captureStream(30);
  }

  getStream(): MediaStream | null {
    return this.outputStream;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.outputStream?.getVideoTracks().forEach((t) => t.stop());
    this.outputStream = null;
    if (this.cameraVideo) {
      this.cameraVideo.pause();
      this.cameraVideo.srcObject = null;
      this.cameraVideo = null;
    }
    this.avatarCanvas = null;
    this.pendingAvatarFrame = false;
  }

  private loop = () => {
    if (!this.running) return;
    this.paint();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private paint() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const avatar = this.avatarCanvas;
    const cam = this.cameraVideo;

    drawLiveGradientBackground(ctx, w, h);

    if (this.layout === "camera-bg" && cam && cam.readyState >= 2 && cam.videoWidth > 0) {
      this.drawCameraCoverMirrored(ctx, cam, 0, 0, w, h, 0.35);
    }

    if (avatar && avatar.width > 0 && avatar.height > 0) {
      if (this.layout === "camera-bg") {
        this.drawAvatarHero(ctx, avatar, w, h, 0.88);
        if (cam && cam.readyState >= 2 && cam.videoWidth > 0) {
          this.drawCameraPip(ctx, cam, w * 0.74, h * 0.04, w * 0.22, h * 0.16);
        }
      } else {
        this.drawAvatarHero(ctx, avatar, w, h, 0.94);
      }
    }

    drawLiveOverlaysToCanvas(ctx, this.overlayState, w, h);
    this.pendingAvatarFrame = false;
  }

  private drawCameraCoverMirrored(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    alpha: number
  ) {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scale = Math.max(dw / vw, dh / vh);
    const sw = dw / scale;
    const sh = dh / scale;
    const sx = (vw - sw) / 2;
    const sy = (vh - sh) / 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.filter = "blur(1px) brightness(0.55)";
    ctx.translate(dx + dw, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, dw, dh);
    ctx.restore();
  }

  private drawCameraPip(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    ctx.save();
    roundRectPath(ctx, x, y, w, h, 16);
    ctx.clip();
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 0, 0, w, h);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 3;
    roundRectPath(ctx, x, y, w, h, 16);
    ctx.stroke();
  }

  private drawAvatarHero(
    ctx: CanvasRenderingContext2D,
    avatar: HTMLCanvasElement,
    cw: number,
    ch: number,
    heightRatio: number
  ) {
    const targetH = ch * heightRatio;
    const scale = targetH / avatar.height;
    const targetW = avatar.width * scale;
    const x = (cw - targetW) / 2;
    const y = ch - targetH + ch * 0.02;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 12;
    ctx.drawImage(avatar, 0, 0, avatar.width, avatar.height, x, y, targetW, targetH);
    ctx.restore();
  }
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
