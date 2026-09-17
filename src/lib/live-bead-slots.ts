import type { LiveHubChannel } from "@/lib/live-hub-data";

export const LIVE_BEAD_MIN_SLOTS = 8;

export type LiveBeadSlot =
  | { kind: "live"; key: string; channel: LiveHubChannel }
  | { kind: "empty"; key: string; tone: number };

const EMPTY_HINTS = [
  "다음 방송",
  "빈 슬롯",
  "곧 시작",
  "준비 중",
  "오프라인",
  "예약 가능",
  "조용한 채널",
  "대기 중",
] as const;

export function emptySlotHint(tone: number): string {
  return EMPTY_HINTS[((tone % EMPTY_HINTS.length) + EMPTY_HINTS.length) % EMPTY_HINTS.length]!;
}

/** Pad live rows to at least 8 bead slots; extras are empty placeholders. */
export function buildLiveBeadSlots(channels: LiveHubChannel[]): LiveBeadSlot[] {
  const lives: LiveBeadSlot[] = channels.map((channel) => ({
    kind: "live" as const,
    key: `live-${channel.id}`,
    channel,
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
