import type { LiveListItem } from "@/api/live";

export const LIVE_BEAD_MIN_SLOTS = 8;

export type LiveBeadSlot =
  | { kind: "live"; key: string; item: LiveListItem }
  | { kind: "empty"; key: string; tone: number };

const EMPTY_HINTS = [
  "대기 중",
  "빈 슬롯",
  "곧 시작",
  "준비 중",
  "오프라인",
  "예약 가능",
  "조용한 채널",
  "다음 방송",
] as const;

export function emptySlotHint(tone: number): string {
  return EMPTY_HINTS[((tone % EMPTY_HINTS.length) + EMPTY_HINTS.length) % EMPTY_HINTS.length]!;
}

/** Pad live rows to at least 8 bead slots; extras are empty placeholders. */
export function buildLiveBeadSlots(items: LiveListItem[]): LiveBeadSlot[] {
  const lives: LiveBeadSlot[] = items.map((item) => ({
    kind: "live",
    key: `live-${item.id}`,
    item,
  }));

  const slots = [...lives];
  let tone = 0;
  while (slots.length < LIVE_BEAD_MIN_SLOTS) {
    slots.push({ kind: "empty", key: `empty-${tone}`, tone });
    tone += 1;
  }
  return slots;
}

export function wrapIndex(i: number, length: number): number {
  if (length <= 0) return 0;
  return ((i % length) + length) % length;
}
