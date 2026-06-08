import type { AvatarTrackingFrame } from "@/lib/virtual-avatar/tracking/types";

export type RecordedTrackingFrame = {
  t: number;
  frame: AvatarTrackingFrame;
};

const MAX_FRAMES = 7200;

/** 트래킹 타임라인 녹화·재생 */
export class TrackingTimelineRecorder {
  private frames: RecordedTrackingFrame[] = [];
  private recording = false;
  private t0 = 0;

  isRecording() {
    return this.recording;
  }

  start() {
    this.frames = [];
    this.t0 = performance.now();
    this.recording = true;
  }

  stop() {
    this.recording = false;
  }

  push(frame: AvatarTrackingFrame) {
    if (!this.recording || !frame.detected) return;
    if (this.frames.length >= MAX_FRAMES) return;
    this.frames.push({ t: performance.now() - this.t0, frame });
  }

  getFrames() {
    return this.frames;
  }

  get durationMs() {
    const last = this.frames[this.frames.length - 1];
    return last?.t ?? 0;
  }

  exportJson(): Blob {
    return new Blob([JSON.stringify({ version: 1, frames: this.frames })], {
      type: "application/json",
    });
  }

  static parseJson(text: string): RecordedTrackingFrame[] {
    const data = JSON.parse(text) as { frames?: RecordedTrackingFrame[] };
    return data.frames ?? [];
  }
}

export class TrackingTimelinePlayer {
  private frames: RecordedTrackingFrame[] = [];
  private playing = false;
  private phase = 0;
  private loop = true;

  isPlaying() {
    return this.playing;
  }

  load(frames: RecordedTrackingFrame[]) {
    this.frames = frames;
    this.phase = 0;
  }

  async loadFile(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      this.load(TrackingTimelineRecorder.parseJson(text));
      return this.frames.length > 0;
    } catch {
      return false;
    }
  }

  play() {
    if (!this.frames.length) return;
    this.playing = true;
    this.phase = 0;
  }

  stop() {
    this.playing = false;
    this.phase = 0;
  }

  /** 현재 재생 프레임 (없으면 null) */
  sample(dt: number): AvatarTrackingFrame | null {
    if (!this.playing || !this.frames.length) return null;
    this.phase += dt * 1000;
    const duration = this.frames[this.frames.length - 1].t;
    if (this.phase > duration) {
      if (this.loop) this.phase = 0;
      else {
        this.playing = false;
        return this.frames[this.frames.length - 1].frame;
      }
    }

    let i = 0;
    while (i < this.frames.length - 1 && this.frames[i + 1].t < this.phase) i++;
    return this.frames[i].frame;
  }
}
