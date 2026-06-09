"use client";

import type { FaceLandmarker, FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import { getFaceLandmarker } from "@/lib/face-filters/landmarker";
import { renderFilteredFrame } from "@/lib/face-filters/renderer";
import {
  filterNeedsFaceLandmarks,
  getFaceFilterPreset,
  type FaceFilterId,
} from "@/lib/face-filters/presets";

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
  private outputStream: MediaStream | null = null;
  private captureW = 0;
  private captureH = 0;
  private detectEvery = 1;
  private frameCount = 0;
  private mirrored = true;
  private landmarkerLoading = false;

  constructor() {
    this.canvas = document.createElement("canvas");
    const ctx = this.canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D not supported");
    this.ctx = ctx;
    this.sourceVideo = document.createElement("video");
    this.sourceVideo.playsInline = true;
    this.sourceVideo.muted = true;
  }

  setFilter(id: FaceFilterId) {
    this.filterId = id;
    const preset = getFaceFilterPreset(id);
    this.detectEvery = preset.overlay || preset.mask3d || preset.beautyPro ? 1 : 2;
  }

  setMirrored(mirrored: boolean) {
    this.mirrored = mirrored;
  }

  getFilter(): FaceFilterId {
    return this.filterId;
  }

  isLandmarkerReady(): boolean {
    return this.landmarker !== null;
  }

  /** 필터 없음 — WHIP에 카메라 원본 사용 (canvas 경유 시 송출 실패 방지) */
  usesFilteredVideo(): boolean {
    return this.filterId !== "none";
  }

  /** canvas 송출 트랙이 준비될 때까지 대기 */
  async waitForBroadcastReady(timeoutMs = 8000): Promise<void> {
    if (!this.usesFilteredVideo()) return;
    const start = performance.now();
    while (performance.now() - start < timeoutMs) {
      if (this.frameCount >= 2 && this.canvas.width > 0 && this.outputStream) return;
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
    }
    throw new Error("얼굴 필터 영상 준비가 지연되고 있습니다. 필터를 「원본」으로 바꾸거나 잠시 후 다시 시도해 주세요.");
  }

  /** 미리보기·송출용 (영상=필터, 오디오=원본) */
  buildCompositeStream(): MediaStream | null {
    if (!this.rawStream) return null;
    if (!this.usesFilteredVideo()) return this.rawStream;

    this.syncOutputStream();
    const tracks: MediaStreamTrack[] = [];
    const vt = this.outputStream?.getVideoTracks()[0];
    if (vt) tracks.push(vt);
    for (const at of this.rawStream.getAudioTracks()) tracks.push(at);
    if (!vt) return this.rawStream;
    return new MediaStream(tracks);
  }

  private syncOutputStream() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w < 2 || h < 2) return;
    if (w === this.captureW && h === this.captureH && this.outputStream) return;
    this.outputStream?.getVideoTracks().forEach((t) => t.stop());
    this.outputStream = this.canvas.captureStream(30);
    this.captureW = w;
    this.captureH = h;
  }

  private async ensureLandmarker() {
    if (this.landmarker || this.landmarkerLoading || !this.running) return;
    if (!filterNeedsFaceLandmarks(this.filterId)) return;
    this.landmarkerLoading = true;
    try {
      const lm = await getFaceLandmarker();
      if (this.running) this.landmarker = lm;
    } finally {
      this.landmarkerLoading = false;
    }
  }

  async start(rawStream: MediaStream, options?: { mirrored?: boolean }): Promise<void> {
    await this.stop();
    if (options?.mirrored !== undefined) this.mirrored = options.mirrored;
    this.rawStream = rawStream;
    this.sourceVideo.srcObject = rawStream;
    await this.sourceVideo.play().catch(() => undefined);
    this.landmarker = null;
    this.running = true;
    void this.ensureLandmarker();
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
    this.landmarker = null;
    this.landmarkerLoading = false;
    this.outputStream?.getVideoTracks().forEach((t) => t.stop());
    this.outputStream = null;
    this.captureW = 0;
    this.captureH = 0;
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

      const needsLm = filterNeedsFaceLandmarks(this.filterId);
      if (needsLm && !this.landmarker && !this.landmarkerLoading) {
        void this.ensureLandmarker();
      }

      if (
        this.landmarker &&
        needsLm &&
        this.frameCount % this.detectEvery === 0
      ) {
        try {
          this.lastResult = this.landmarker.detectForVideo(
            this.sourceVideo,
            performance.now()
          );
        } catch {
          /* skip frame */
        }
      } else if (!needsLm) {
        this.lastResult = undefined;
      }

      renderFilteredFrame(
        this.ctx,
        this.sourceVideo,
        w,
        h,
        this.filterId,
        this.lastResult,
        performance.now(),
        this.mirrored
      );
      if (this.usesFilteredVideo()) this.syncOutputStream();
      this.frameCount++;
    }
    this.rafId = requestAnimationFrame(this.loop);
  };
}
