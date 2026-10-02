import { BONDEE_COLORS } from "@/lib/apt/style/bondee-color-bible";

export type RoomTheme = {
  wallTop: string;
  wallBottom: string;
  floorA: string;
  floorB: string;
  accent: string;
  ambient: string;
  label: string;
};

/**
 * Bondee Color Bible 기반 방 테마 — 채도·명도 통일
 */
export const ROOM_THEMES: Record<string, RoomTheme> = {
  living: {
    wallTop: "#FAF6F0",
    wallBottom: "#F0EBE3",
    floorA: "#E8C9A0",
    floorB: "#D4BC98",
    accent: "#C9956A",
    ambient: "rgba(255, 244, 231, 0.22)",
    label: "거실",
  },
  bedroom: {
    wallTop: "#FAF6F0",
    wallBottom: "#EEEAF4",
    floorA: "#D4C4E8",
    floorB: "#C5B8DE",
    accent: "#9BB89A",
    ambient: "rgba(168, 196, 212, 0.14)",
    label: "침실",
  },
  kitchen: {
    wallTop: "#FAF8F4",
    wallBottom: "#EDF2E8",
    floorA: "#D4E0C4",
    floorB: "#C5D4B0",
    accent: "#9BB89A",
    ambient: "rgba(155, 184, 154, 0.12)",
    label: "부엌",
  },
  bathroom: {
    wallTop: "#F4FAFA",
    wallBottom: "#E4EEF2",
    floorA: "#B8D8E8",
    floorB: "#A8CCD8",
    accent: "#A8C4D4",
    ambient: "rgba(168, 196, 212, 0.14)",
    label: "욕실",
  },
};

export function getRoomTheme(roomType: string): RoomTheme {
  return ROOM_THEMES[roomType] ?? ROOM_THEMES.living;
}

export const BONDEE_ROOM_VIGNETTE = `radial-gradient(ellipse at 50% 28%, ${BONDEE_COLORS.ambientCream}55, transparent 62%)`;
