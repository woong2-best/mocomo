import type { ParkingFrame, ParkingLevel, VehicleTypeId } from "./parking-rush-logic";

export function parseParkingFrames(moves: unknown[]): ParkingFrame[] {
  return moves.filter(
    (m): m is ParkingFrame =>
      !!m && typeof m === "object" && (m as ParkingFrame).type === "parking_frame"
  );
}

export function levelFromInitialState(initial: unknown): ParkingLevel | null {
  if (!initial || typeof initial !== "object") return null;
  const gs = initial as { level?: ParkingLevel };
  return gs.level ?? null;
}

export function frameIndexAtTime(frames: ParkingFrame[], tMs: number): number {
  if (!frames.length) return 0;
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (frames[mid]!.t <= tMs) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function carsAtFrame(
  frame: ParkingFrame | undefined,
  playerNames?: Record<string, string>
): { userId: string; name: string; vehicleId: VehicleTypeId; color?: string; x: number; y: number; angle: number; speed: number }[] {
  if (!frame) return [];
  return Object.entries(frame.cars).map(([userId, c]) => ({
    userId,
    name: playerNames?.[userId] ?? userId.slice(0, 6),
    vehicleId: c.vehicleId,
    color: c.color,
    x: c.x,
    y: c.y,
    angle: c.angle,
    speed: c.speed,
  }));
}

export function maxReplayTimeMs(frames: ParkingFrame[]): number {
  return frames.length ? frames[frames.length - 1]!.t : 0;
}
