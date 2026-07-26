import { REELS_DISMISSED_KEY, REELS_DISMISSED_MAX } from "@/lib/reels/constants";

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REELS_DISMISSED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function writeIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      REELS_DISMISSED_KEY,
      JSON.stringify(ids.slice(-REELS_DISMISSED_MAX))
    );
  } catch {
    /* quota */
  }
}

export function getDismissedReelIds(): Set<string> {
  return new Set(readIds());
}

export function dismissReel(postId: string): void {
  const ids = readIds().filter((id) => id !== postId);
  ids.push(postId);
  writeIds(ids);
}

export function isReelDismissed(postId: string): boolean {
  return getDismissedReelIds().has(postId);
}
