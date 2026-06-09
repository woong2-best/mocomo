"use client";

import type { AvatarTrackingFrame } from "@/lib/virtual-avatar/tracking/types";
import { PhotoAvatarRenderer } from "@/lib/photo-avatar/photo-avatar-renderer";
import { loadPhotoAvatarRig } from "@/lib/photo-avatar/photo-avatar-storage";
import { PHOTO_AVATAR_SIZE } from "@/lib/photo-avatar/types";

/** VRM 씬과 동일한 WHIP/OBS 연동용 2D 사진 아바타 씬 */
export class PhotoAvatarScene {
  private readonly canvas: HTMLCanvasElement;
  private renderer: PhotoAvatarRenderer | null = null;
  private rafId = 0;
  private running = false;
  private ready = false;
  private getFrame: (() => AvatarTrackingFrame | null) | null = null;
  private onAfterRender: (() => void) | null = null;

  constructor(host: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = PHOTO_AVATAR_SIZE;
    this.canvas.height = PHOTO_AVATAR_SIZE;
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
    host.appendChild(this.canvas);
  }

  getCanvasElement() {
    return this.canvas;
  }

  isReady() {
    return this.ready && !!this.renderer?.isReady();
  }

  setOnAfterRender(fn: (() => void) | null) {
    this.onAfterRender = fn;
  }

  setLiveCaptureMode(_enabled: boolean) {
    /* 2D — 별도 처리 없음 */
  }

  fitVtuberBroadcastView() {
    /* canvas는 compositor에서 스케일 */
  }

  refreshExternalConfig() {
    /* no-op */
  }

  async reloadFromStorage() {
    const rig = await loadPhotoAvatarRig();
    if (!rig) {
      this.ready = false;
      this.renderer = null;
      return false;
    }
    if (!this.renderer) {
      this.renderer = new PhotoAvatarRenderer(this.canvas, rig);
    } else {
      this.renderer.updateRig(rig);
    }
    await this.renderer.waitReady();
    this.ready = true;
    return true;
  }

  start(_getConfig: () => unknown, getFrame: () => AvatarTrackingFrame | null) {
    this.stop();
    this.getFrame = getFrame;
    this.running = true;

    const loop = () => {
      if (!this.running) return;
      const frame = this.getFrame?.() ?? null;
      this.renderer?.render(frame);
      this.onAfterRender?.();
      this.rafId = requestAnimationFrame(loop);
    };

    void this.reloadFromStorage().then(() => {
      if (this.running) this.rafId = requestAnimationFrame(loop);
    });
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.onAfterRender = null;
  }

  dispose() {
    this.stop();
    this.canvas.remove();
    this.renderer = null;
    this.ready = false;
  }
}
