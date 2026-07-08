export type VideoFilterPreset = {
  id: string;
  label: string;
  css: string;
};

export const VIDEO_FILTER_PRESETS: VideoFilterPreset[] = [
  { id: "none", label: "원본", css: "" },
  { id: "vivid", label: "선명", css: "contrast(1.12) saturate(1.28)" },
  { id: "film", label: "필름", css: "contrast(1.08) sepia(0.18) saturate(0.92)" },
  { id: "warm", label: "웜", css: "sepia(0.12) saturate(1.15) brightness(1.04)" },
  { id: "cool", label: "쿨", css: "hue-rotate(-8deg) saturate(1.1) brightness(1.03)" },
  { id: "mono", label: "흑백", css: "grayscale(1) contrast(1.05)" },
  { id: "vintage", label: "빈티지", css: "sepia(0.35) contrast(0.95) brightness(1.05)" },
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
