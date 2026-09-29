import type { LiveListItem } from "@/api/live";
import { uiText } from "@/i18n/ui-text";

export const LIVE_BEAD_MIN_SLOTS = 8;

export type LiveBeadSlot =
  | { kind: "live"; key: string; item: LiveListItem }
  | { kind: "empty"; key: string; tone: number };

const EMPTY_HINTS: { ko: string; en: string }[] = [
  { ko: "대기 중", en: "Waiting" },
  { ko: "빈 슬롯", en: "Empty slot" },
  { ko: "곧 시작", en: "Starting soon" },
  { ko: "준비 중", en: "Getting ready" },
  { ko: "오프라인", en: "Offline" },
  { ko: "예약 가능", en: "Available" },
  { ko: "조용한 채널", en: "Quiet channel" },
  { ko: "다음 방송", en: "Next stream" },
];

export function emptySlotHint(tone: number, locale?: string): string {
  const row = EMPTY_HINTS[((tone % EMPTY_HINTS.length) + EMPTY_HINTS.length) % EMPTY_HINTS.length]!;
  return uiText(locale, row.ko, row.en);
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
