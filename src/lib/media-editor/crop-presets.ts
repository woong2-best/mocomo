import type { CropAspectPreset } from "@/lib/media-editor/types";

export const EDITOR_CROP_PRESETS: CropAspectPreset[] = [
  { id: "free", label: "자유" },
  { id: "1:1", label: "1:1", aspect: 1 },
  { id: "3:4", label: "3:4", aspect: 3 / 4 },
  { id: "4:5", label: "4:5", aspect: 4 / 5 },
  { id: "9:16", label: "9:16", aspect: 9 / 16 },
  { id: "16:9", label: "16:9", aspect: 16 / 9 },
  { id: "2:3", label: "2:3", aspect: 2 / 3 },
  { id: "3:2", label: "3:2", aspect: 3 / 2 },
  { id: "ig-feed", label: "IG Feed", aspect: 4 / 5 },
  { id: "ig-story", label: "IG Story", aspect: 9 / 16 },
  { id: "x-header", label: "X Header", aspect: 3 / 1 },
  { id: "yt-thumb", label: "YouTube", aspect: 16 / 9 },
  { id: "discord", label: "Discord", aspect: 16 / 9 },
  { id: "fb-cover", label: "Facebook", aspect: 205 / 78 },
];

export function fitCropRect(
  canvasW: number,
  canvasH: number,
  aspect: number | undefined
): { x: number; y: number; width: number; height: number } {
  if (!aspect) {
    return { x: 0, y: 0, width: canvasW, height: canvasH };
  }
  let width = canvasW;
  let height = width / aspect;
  if (height > canvasH) {
    height = canvasH;
    width = height * aspect;
  }
  return {
    x: (canvasW - width) / 2,
    y: (canvasH - height) / 2,
    width,
    height,
  };
}
