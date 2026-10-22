/** How long the room keeps a donation on screen. The server is the single clock. */
export function mocoDonationPlayMs(row: {
  type: string;
  segmentPlaySec?: number | null;
  maxPlaySec?: number | null;
}): number {
  if (row.type === "VIDEO") {
    const sec = row.segmentPlaySec ?? row.maxPlaySec ?? 60;
    const clamped = Math.min(Math.max(sec, 1), 180);
    return clamped * 1000 + 800;
  }
  return 4500;
}
