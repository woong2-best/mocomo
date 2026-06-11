"use client";

/** WHIP 송출 — 화면 공유 전체 + 카메라 PiP 또는 2D 아바타(우하단) */
export class LiveScreenShareCompositor {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private outputStream: MediaStream | null = null;
  private running = false;
  private rafId = 0;
  private screenVideo: HTMLVideoElement | null = null;
  private cameraVideo: HTMLVideoElement | null = null;
  private avatarCanvas: HTMLCanvasElement | null = null;
  private cameraVisible = true;
  private avatarVisible = true;
  private width = 1920;
  private height = 1080;
  private screenEndedHandler: (() => void) | null = null;

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

  start(
    screenStream: MediaStream,
    cameraStream: MediaStream | null,
    opts?: {
      onScreenEnded?: () => void;
      /** 2D 아바타 캔버스 — 있으면 카메라 PiP 대신 우하단 VTuber 오버레이 */
      avatarCanvas?: HTMLCanvasElement | null;
    }
  ) {
    this.stop();
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.avatarCanvas = opts?.avatarCanvas ?? null;

    const screenTrack = screenStream.getVideoTracks()[0];
    if (!screenTrack) throw new Error("화면 공유 영상이 없습니다.");

    const screenVideo = document.createElement("video");
    screenVideo.srcObject = new MediaStream([screenTrack]);
    screenVideo.muted = true;
    screenVideo.playsInline = true;
    screenVideo.autoplay = true;
    this.screenVideo = screenVideo;
    void screenVideo.play().catch(() => undefined);

    if (opts?.onScreenEnded) {
      this.screenEndedHandler = opts.onScreenEnded;
      screenTrack.addEventListener("ended", this.screenEndedHandler);
    }

    if (!this.avatarCanvas && cameraStream && cameraStream.getVideoTracks().length > 0) {
      const camVideo = document.createElement("video");
      camVideo.srcObject = new MediaStream(cameraStream.getVideoTracks());
      camVideo.muted = true;
      camVideo.playsInline = true;
      camVideo.autoplay = true;
      this.cameraVideo = camVideo;
      void camVideo.play().catch(() => undefined);
    }

    this.cameraVisible = true;
    this.avatarVisible = true;
    this.running = true;
    this.loop();
    this.outputStream = this.canvas.captureStream(30);
  }

  setAvatarCanvas(canvas: HTMLCanvasElement | null) {
    this.avatarCanvas = canvas;
    if (canvas) this.cameraVideo = null;
  }

  setCameraVisible(visible: boolean) {
    this.cameraVisible = visible;
  }

  setAvatarVisible(visible: boolean) {
    this.avatarVisible = visible;
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

    const screenTrack = this.screenVideo?.srcObject instanceof MediaStream
      ? this.screenVideo.srcObject.getVideoTracks()[0]
      : null;
    if (screenTrack && this.screenEndedHandler) {
      screenTrack.removeEventListener("ended", this.screenEndedHandler);
    }
    this.screenEndedHandler = null;

    if (this.screenVideo) {
      this.screenVideo.pause();
      this.screenVideo.srcObject = null;
      this.screenVideo = null;
    }
    if (this.cameraVideo) {
      this.cameraVideo.pause();
      this.cameraVideo.srcObject = null;
      this.cameraVideo = null;
    }
    this.avatarCanvas = null;
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

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, w, h);

    const screen = this.screenVideo;
    if (screen && screen.readyState >= 2 && screen.videoWidth > 0) {
      this.drawVideoContain(ctx, screen, 0, 0, w, h);
    }

    const avatar = this.avatarCanvas;
    if (this.avatarVisible && avatar && avatar.width > 0 && avatar.height > 0) {
      this.drawAvatarVtuberCorner(ctx, avatar, w, h);
    } else {
      const cam = this.cameraVideo;
      if (this.cameraVisible && cam && cam.readyState >= 2 && cam.videoWidth > 0) {
        const pipW = w * 0.22;
        const pipH = h * 0.24;
        const pipX = w - pipW - w * 0.025;
        const pipY = h - pipH - h * 0.04;
        this.drawCameraPip(ctx, cam, pipX, pipY, pipW, pipH);
      }
    }
  }

  /** 캐치마인드·VTuber 반응 방송 — 화면 우하단 2D 아바타 (투명 PNG) */
  private drawAvatarVtuberCorner(
    ctx: CanvasRenderingContext2D,
    avatar: HTMLCanvasElement,
    w: number,
    h: number
  ) {
    const targetW = w * 0.34;
    const scale = targetW / avatar.width;
    const targetH = avatar.height * scale;
    const x = w - targetW - w * 0.012;
    const y = h - targetH + h * 0.04;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.42)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 8;
    ctx.drawImage(avatar, 0, 0, avatar.width, avatar.height, x, y, targetW, targetH);
    ctx.restore();
  }

  private drawVideoContain(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    dx: number,
    dy: number,
    dw: number,
    dh: number
  ) {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scale = Math.min(dw / vw, dh / vh);
    const rw = vw * scale;
    const rh = vh * scale;
    const x = dx + (dw - rw) / 2;
    const y = dy + (dh - rh) / 2;
    ctx.drawImage(video, x, y, rw, rh);
  }

  private drawCameraPip(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scale = Math.max(w / vw, h / vh);
    const sw = w / scale;
    const sh = h / scale;
    const sx = (vw - sw) / 2;
    const sy = (vh - sh) / 2;

    ctx.save();
    roundRectPath(ctx, x, y, w, h, 14);
    ctx.clip();
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
    ctx.restore();

    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 3;
    roundRectPath(ctx, x, y, w, h, 14);
    ctx.stroke();
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
