import type { EditorLayer, ImageLayerData, ImageEffects } from "@/lib/media-editor/types";

export function patchImageEffects(
  layer: EditorLayer & { type: "background" | "image"; data: ImageLayerData },
  patch: Partial<ImageEffects>
): EditorLayer & { type: "background" | "image"; data: ImageLayerData } {
  return {
    ...layer,
    data: {
      ...layer.data,
      effects: { ...layer.data.effects, ...patch },
    },
  };
}

export const EFFECT_SLIDERS: {
  key: keyof ImageEffects;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}[] = [
  { key: "brightness", label: "밝기", min: -0.5, max: 0.5, step: 0.01, default: 0 },
  { key: "contrast", label: "대비", min: -50, max: 50, step: 1, default: 0 },
  { key: "saturation", label: "채도", min: -1, max: 1, step: 0.01, default: 0 },
  { key: "hue", label: "색조", min: -180, max: 180, step: 1, default: 0 },
  { key: "blur", label: "블러", min: 0, max: 20, step: 0.5, default: 0 },
  { key: "noise", label: "노이즈", min: 0, max: 1, step: 0.01, default: 0 },
  { key: "vignette", label: "비네트", min: 0, max: 1, step: 0.01, default: 0 },
];
