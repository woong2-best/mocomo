import type { LiveOverlayWheelProps } from "@/lib/live-overlays/types";

export const WHEEL_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
] as const;

/** CSS transition과 동일 (ms) */
export const WHEEL_SPIN_MS = 4200;

/** 상단 포인터에 segmentIndex가 오도록 목표 각도 계산 */
export function computeWheelSpinTarget(
  currentRotation: number,
  segmentIndex: number,
  segmentCount: number
): number {
  const segCount = Math.max(1, segmentCount);
  const segAngle = 360 / segCount;
  const extra = 360 * (4 + Math.floor(Math.random() * 3));
  return currentRotation + extra + (segCount - segmentIndex) * segAngle - segAngle / 2;
}

export function createDefaultWheelProps(): LiveOverlayWheelProps {
  return {
    title: "",
    segments: [
      { id: "1", label: "1", weight: 1 },
      { id: "2", label: "2", weight: 1 },
      { id: "3", label: "3", weight: 1 },
      { id: "4", label: "4", weight: 1 },
      { id: "5", label: "5", weight: 1 },
      { id: "6", label: "6", weight: 1 },
    ],
    rotation: 0,
    spinning: false,
    lastResult: null,
  };
}
