import {
  MUTE_STORAGE_KEY,
  VOLUME_STORAGE_KEY,
  DEFAULT_VOLUME,
} from "@/lib/video-playback/constants";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function readMutedPreference(fallback = true): boolean {
  if (!canUseStorage()) return fallback;
  try {
    const raw = localStorage.getItem(MUTE_STORAGE_KEY);
    if (raw === null) return fallback;
    return raw === "1" || raw === "true";
  } catch {
    return fallback;
  }
}

export function writeMutedPreference(muted: boolean): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, muted ? "1" : "0");
  } catch {
    /* quota / private mode */
  }
}

export function readVolumePreference(fallback = DEFAULT_VOLUME): number {
  if (!canUseStorage()) return fallback;
  try {
    const raw = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (raw === null) return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(1, Math.max(0, n));
  } catch {
    return fallback;
  }
}

export function writeVolumePreference(volume: number): void {
  if (!canUseStorage()) return;
  try {
    const clamped = Math.min(1, Math.max(0, volume));
    localStorage.setItem(VOLUME_STORAGE_KEY, String(clamped));
  } catch {
    /* ignore */
  }
}
