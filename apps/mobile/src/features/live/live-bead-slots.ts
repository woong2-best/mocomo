import type { LiveListItem } from "@/api/live";
import { translate } from "@/i18n/runtime";

export const LIVE_BEAD_MIN_SLOTS = 8;

export type LiveBeadSlot =
  | { kind: "live"; key: string; item: LiveListItem }
  | { kind: "empty"; key: string; tone: number };

const EMPTY_HINT_KEYS = [
  "m.live.bead_hint.waiting",
  "m.live.bead_hint.empty_slot",
  "m.live.bead_hint.starting_soon",
  "m.live.bead_hint.getting_ready",
  "m.live.bead_hint.offline",
  "m.live.bead_hint.available",
  "m.live.bead_hint.quiet_channel",
  "m.live.bead_hint.next_stream",
] as const;

export function emptySlotHint(tone: number, _locale?: string): string {
  const key = EMPTY_HINT_KEYS[((tone % EMPTY_HINT_KEYS.length) + EMPTY_HINT_KEYS.length) % EMPTY_HINT_KEYS.length]!;
  return translate(key);
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
