import type { LiveHubChannel } from "@/lib/live-hub-data";

export const LIVE_BEAD_MIN_SLOTS = 8;

export type LiveBeadSlot =
  | { kind: "live"; key: string; channel: LiveHubChannel }
  | { kind: "empty"; key: string; tone: number };

const EMPTY_HINTS = [
  "Next stream",
  "Empty slot",
  "Starting soon",
  "Getting ready",
  "Offline",
  "Available to book",
  "Quiet channel",
  "Waiting",
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
