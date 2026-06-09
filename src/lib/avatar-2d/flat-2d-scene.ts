"use client";

import type { AvatarTrackingFrame } from "@/lib/virtual-avatar/tracking/types";
import { Flat2dAvatarRenderer } from "@/lib/avatar-2d/flat-2d-renderer";
import { loadFlat2dAvatarMeta } from "@/lib/avatar-2d/storage";
import { AVATAR_2D_SIZE } from "@/lib/avatar-2d/types";

/** OBS·라이브 송출용 2D PNG 아바타 씬 */
export class Flat2dAvatarScene {
  private readonly canvas: HTMLCanvasElement;
  private renderer: Flat2dAvatarRenderer | null = null;
  private rafId = 0;
  private running = false;
  private ready = false;
  private getFrame: (() => AvatarTrackingFrame | null) | null = null;
  private onAfterRender: (() => void) | null = null;

  constructor(host: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = AVATAR_2D_SIZE;
    this.canvas.height = AVATAR_2D_SIZE;
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

  setLiveCaptureMode(_enabled: boolean) {}

  fitVtuberBroadcastView() {}

  refreshExternalConfig() {}

  async reloadFromStorage() {
    const meta = await loadFlat2dAvatarMeta();
    if (!meta) {
      this.ready = false;
      this.renderer = null;
      return false;
    }
    if (!this.renderer) {
      this.renderer = new Flat2dAvatarRenderer(this.canvas, meta);
    } else {
      this.renderer.updateMeta(meta);
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
