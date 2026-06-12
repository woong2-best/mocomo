import type { TimeControlPreset } from "./types";

export const TIME_CONTROL_OPTIONS: { value: TimeControlPreset; label: string; ms: number; incrementMs?: number }[] = [
  { value: "unlimited", label: "무제한", ms: 0 },
  { value: "30s", label: "30초", ms: 30_000 },
  { value: "1m", label: "1분", ms: 60_000 },
  { value: "3m", label: "3분", ms: 180_000 },
  { value: "5m", label: "5분", ms: 300_000 },
  { value: "10m", label: "10분", ms: 600_000 },
  { value: "5m+3s", label: "5분 + 3초", ms: 300_000, incrementMs: 3000 },
  { value: "10m+5s", label: "10분 + 5초", ms: 600_000, incrementMs: 5000 },
];

export function parseTimeControl(preset: string): { ms: number; incrementMs: number } {
  const found = TIME_CONTROL_OPTIONS.find((o) => o.value === preset);
  if (!found || found.ms === 0) return { ms: 0, incrementMs: 0 };
  return { ms: found.ms, incrementMs: found.incrementMs ?? 0 };
}

export function formatClockMs(ms: number): string {
  if (ms <= 0) return "0:00";
  const sec = Math.ceil(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
