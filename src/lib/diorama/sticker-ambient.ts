/** RC-1 Living Room — 스티커별 ambient 애니메이션 클래스 */
export const STICKER_AMBIENT_CLASS: Record<string, string> = {
  plant: "apt-living-plant-sway",
  "hanging-plant": "apt-living-plant-sway",
  lamp: "apt-living-lamp-glow",
  candle: "apt-living-lamp-glow",
  tv: "apt-living-tv-glow",
  window: "apt-living-window-shimmer",
};

export function ambientClassForSticker(typeId: string, roomType: string): string | undefined {
  if (roomType !== "living") return undefined;
  return STICKER_AMBIENT_CLASS[typeId];
}
