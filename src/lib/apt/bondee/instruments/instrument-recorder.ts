"use client";

import type { InstrumentKind } from "./types";

export type RecordedNote = {
  t: number;
  kind: InstrumentKind;
  midi: number;
  padIndex?: number;
};

/** 악기 연주 녹음 · 재생 (이벤트 로그 방식) */
export class InstrumentRecorder {
  private notes: RecordedNote[] = [];
  private startMs = 0;
  private recording = false;
  private playbackTimers: ReturnType<typeof setTimeout>[] = [];

  get isRecording() {
    return this.recording;
  }

  get noteCount() {
    return this.notes.length;
  }

  start(kind: InstrumentKind) {
    this.notes = [];
    this.startMs = performance.now();
    this.recording = true;
    return kind;
  }

  record(kind: InstrumentKind, midi: number, padIndex?: number) {
    if (!this.recording) return;
    this.notes.push({
      t: performance.now() - this.startMs,
      kind,
      midi,
      padIndex,
    });
  }

  stop(): RecordedNote[] {
    this.recording = false;
    return [...this.notes];
  }

  clear() {
    this.stopPlayback();
    this.notes = [];
    this.recording = false;
  }

  stopPlayback() {
    for (const t of this.playbackTimers) clearTimeout(t);
    this.playbackTimers = [];
  }

  playback(notes: RecordedNote[], play: (kind: InstrumentKind, midi: number, padIndex?: number) => void) {
    this.stopPlayback();
    for (const n of notes) {
      const timer = setTimeout(() => play(n.kind, n.midi, n.padIndex), n.t);
      this.playbackTimers.push(timer);
    }
    const last = notes[notes.length - 1];
    if (last) {
      this.playbackTimers.push(setTimeout(() => this.stopPlayback(), last.t + 800));
    }
  }

  exportJson(): string {
    return JSON.stringify(this.notes);
  }

  importJson(raw: string): RecordedNote[] {
    try {
      const parsed = JSON.parse(raw) as RecordedNote[];
      if (!Array.isArray(parsed)) return [];
      this.notes = parsed;
      return parsed;
    } catch {
      return [];
    }
  }
}
