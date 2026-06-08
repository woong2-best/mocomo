"use client";

/** 라이브 WHIP — 카메라 배경 + VRM 아바타 합성 */
export class LiveAvatarCompositor {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private outputStream: MediaStream | null = null;
  private running = false;
  private rafId = 0;
  private cameraVideo: HTMLVideoElement | null = null;
  private avatarCanvas: HTMLCanvasElement | null = null;
  private width = 1280;
  private height = 720;

  constructor() {
    this.canvas = document.createElement("canvas");
    const ctx = this.canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D not supported");
    this.ctx = ctx;
  }

  start(avatarCanvas: HTMLCanvasElement, cameraStream?: MediaStream | null) {
    this.stop();
    this.avatarCanvas = avatarCanvas;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    if (cameraStream && cameraStream.getVideoTracks().length > 0) {
      const video = document.createElement("video");
      video.srcObject = new MediaStream(cameraStream.getVideoTracks());
      video.muted = true;
      video.playsInline = true;
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
  }

  private loop = () => {
    if (!this.running) return;
    const avatar = this.avatarCanvas;
    const cam = this.cameraVideo;

    if (cam && cam.readyState >= 2 && cam.videoWidth > 0) {
      this.ctx.drawImage(cam, 0, 0, this.width, this.height);
    } else {
      this.ctx.fillStyle = "#0a0a0a";
      this.ctx.fillRect(0, 0, this.width, this.height);
    }

    if (avatar && avatar.width > 0 && avatar.height > 0) {
      this.ctx.drawImage(avatar, 0, 0, avatar.width, avatar.height, 0, 0, this.width, this.height);
    }

    this.rafId = requestAnimationFrame(this.loop);
  };
}
