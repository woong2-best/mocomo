"use client";

import type { FaceLandmarker, FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import { getFaceLandmarker } from "@/lib/face-filters/landmarker";
import { renderFilteredFrame } from "@/lib/face-filters/renderer";
import type { FaceFilterId } from "@/lib/face-filters/presets";

export class FaceFilterPipeline {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly sourceVideo: HTMLVideoElement;
  private landmarker: FaceLandmarker | null = null;
  private filterId: FaceFilterId = "none";
  private running = false;
  private rafId = 0;
  private lastResult: FaceLandmarkerResult | undefined;
  private rawStream: MediaStream | null = null;
  private outputStream: MediaStream;
  private detectEvery = 2;
  private frameCount = 0;

  constructor() {
    this.canvas = document.createElement("canvas");
    const ctx = this.canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D not supported");
    this.ctx = ctx;
    this.sourceVideo = document.createElement("video");
    this.sourceVideo.playsInline = true;
    this.sourceVideo.muted = true;
    this.outputStream = this.canvas.captureStream(30);
  }

  setFilter(id: FaceFilterId) {
    this.filterId = id;
  }

  getFilter(): FaceFilterId {
    return this.filterId;
  }

  /** 미리보기·송출용 (영상=필터, 오디오=원본) */
  buildCompositeStream(): MediaStream | null {
    if (!this.rawStream) return null;
    const tracks: MediaStreamTrack[] = [];
    const vt = this.outputStream.getVideoTracks()[0];
    if (vt) tracks.push(vt);
    for (const at of this.rawStream.getAudioTracks()) tracks.push(at);
    return new MediaStream(tracks);
  }

  async start(rawStream: MediaStream): Promise<void> {
    await this.stop();
    this.rawStream = rawStream;
    this.sourceVideo.srcObject = rawStream;
    await this.sourceVideo.play().catch(() => undefined);
    this.landmarker = await getFaceLandmarker();
    this.running = true;
    this.loop();
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.sourceVideo.pause();
    this.sourceVideo.srcObject = null;
    this.rawStream = null;
    this.lastResult = undefined;
    this.frameCount = 0;
  }

  capturePhotoBlob(quality = 0.92): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("사진 캡처 실패"))),
        "image/jpeg",
        quality
      );
    });
  }

  private loop = () => {
    if (!this.running) return;
    const w = this.sourceVideo.videoWidth;
    const h = this.sourceVideo.videoHeight;
    if (w > 0 && h > 0) {
      if (this.canvas.width !== w) this.canvas.width = w;
      if (this.canvas.height !== h) this.canvas.height = h;

      if (this.landmarker && this.filterId !== "none" && this.frameCount % this.detectEvery === 0) {
        try {
          this.lastResult = this.landmarker.detectForVideo(this.sourceVideo, performance.now());
        } catch {
          /* skip frame */
        }
      } else if (this.filterId === "none") {
        this.lastResult = undefined;
      }

      renderFilteredFrame(
        this.ctx,
        this.sourceVideo,
        w,
        h,
        this.filterId,
        this.lastResult,
        performance.now()
      );
      this.frameCount++;
    }
    this.rafId = requestAnimationFrame(this.loop);
  };
}
