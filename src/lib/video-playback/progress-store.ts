import { PROGRESS_STORAGE_KEY } from "@/lib/video-playback/constants";

const memory = new Map<string, number>();
const MAX_ENTRIES = 200;

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function loadFromSession(): void {
  if (!canUseStorage() || memory.size > 0) return;
  try {
    const raw = sessionStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, number>;
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "number" && Number.isFinite(v) && v > 0) {
        memory.set(k, v);
      }
    }
  } catch {
    /* ignore */
  }
}

function persist(): void {
  if (!canUseStorage()) return;
  try {
    const obj: Record<string, number> = {};
    let i = 0;
    for (const [k, v] of memory) {
      if (i++ >= MAX_ENTRIES) break;
      obj[k] = v;
    }
    sessionStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

export function progressKey(src: string, mediaId?: string | null): string {
  return mediaId && mediaId.length > 0 ? `id:${mediaId}` : `src:${src}`;
}

export function getSavedProgress(key: string): number {
  loadFromSession();
  return memory.get(key) ?? 0;
}

export function saveProgress(key: string, time: number): void {
  if (!Number.isFinite(time) || time < 0.25) return;
  loadFromSession();
  if (memory.size >= MAX_ENTRIES && !memory.has(key)) {
    const first = memory.keys().next().value;
    if (first) memory.delete(first);
  }
  memory.set(key, time);
  persist();
}

export function clearProgress(key: string): void {
  memory.delete(key);
  persist();
}
