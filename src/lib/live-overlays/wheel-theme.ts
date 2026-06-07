import type { LiveOverlayWheelProps } from "@/lib/live-overlays/types";

/** 참고 UI와 동일한 파스텔 6색 */
export const WHEEL_PASTEL_COLORS = [
  "#98D8A8",
  "#F5E6A3",
  "#F5C896",
  "#F5A8A8",
  "#C9B8F5",
  "#A8D4F5",
] as const;

export function createDefaultWheelProps(): LiveOverlayWheelProps {
  return {
    title: "",
    segments: [
      { id: "1", label: "4,000원", weight: 1 },
      { id: "2", label: "5,000원", weight: 1 },
      { id: "3", label: "1,000원", weight: 1 },
      { id: "4", label: "2,000원", weight: 1 },
      { id: "5", label: "3,000원", weight: 1 },
      { id: "6", label: "0원", weight: 1 },
    ],
    rotation: 0,
    spinning: false,
    lastResult: null,
  };
}
