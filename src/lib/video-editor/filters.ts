export type VideoFilterPreset = {
  id: string;
  label: string;
  css: string;
};

export const VIDEO_FILTER_PRESETS: VideoFilterPreset[] = [
  { id: "none", label: "Original", css: "" },
  { id: "vivid", label: "Vivid", css: "contrast(1.12) saturate(1.28)" },
  { id: "film", label: "Film", css: "contrast(1.08) sepia(0.18) saturate(0.92)" },
  { id: "warm", label: "Warm", css: "sepia(0.12) saturate(1.15) brightness(1.04)" },
  { id: "cool", label: "Cool", css: "hue-rotate(-8deg) saturate(1.1) brightness(1.03)" },
  { id: "mono", label: "B&W", css: "grayscale(1) contrast(1.05)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.35) contrast(0.95) brightness(1.05)" },
];

export function buildVideoCssFilter(
  filterId: string,
  brightness: number,
  contrast: number,
  saturation: number
): string {
  const preset = VIDEO_FILTER_PRESETS.find((p) => p.id === filterId)?.css ?? "";
  const adj = [
    `brightness(${100 + brightness}%)`,
    `contrast(${100 + contrast}%)`,
    `saturate(${100 + saturation}%)`,
  ].join(" ");
  return [preset, adj].filter(Boolean).join(" ").trim();
}
