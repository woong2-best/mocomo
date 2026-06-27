export type RoomTheme = {
  wallTop: string;
  wallBottom: string;
  floorA: string;
  floorB: string;
  accent: string;
  ambient: string;
  label: string;
};

export const ROOM_THEMES: Record<string, RoomTheme> = {
  living: {
    wallTop: "#faf3ea",
    wallBottom: "#efe6da",
    floorA: "#e8c4a0",
    floorB: "#ddb892",
    accent: "#d97706",
    ambient: "rgba(251, 191, 36, 0.12)",
    label: "거실",
  },
  bedroom: {
    wallTop: "#f0f4ff",
    wallBottom: "#e2e8f8",
    floorA: "#c9d4e8",
    floorB: "#b8c6de",
    accent: "#6366f1",
    ambient: "rgba(99, 102, 241, 0.1)",
    label: "침실",
  },
  kitchen: {
    wallTop: "#f4faf0",
    wallBottom: "#e8f5e0",
    floorA: "#d4e8c4",
    floorB: "#c5ddb0",
    accent: "#65a30d",
    ambient: "rgba(101, 163, 13, 0.1)",
    label: "부엌",
  },
  bathroom: {
    wallTop: "#f0fafb",
    wallBottom: "#e0f2f4",
    floorA: "#b8e0e8",
    floorB: "#a8d4de",
    accent: "#0891b2",
    ambient: "rgba(8, 145, 178, 0.1)",
    label: "욕실",
  },
};

export function getRoomTheme(roomType: string): RoomTheme {
  return ROOM_THEMES[roomType] ?? ROOM_THEMES.living;
}
