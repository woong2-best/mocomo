export type VideoFilterPreset = {
  id: string;
  label: string;
  /** ffmpeg video filter fragment (no leading -vf) */
  vf: string;
  /** Preview tint on top of VideoView */
  preview?: { color: string; opacity: number };
};

/** Instagram Reels-style filter names (reference screenshots). */
export const MOBILE_VIDEO_FILTERS: VideoFilterPreset[] = [
  { id: "none", label: "일반", vf: "" },
  {
    id: "fade",
    label: "Fade",
    vf: "eq=brightness=0.06:contrast=0.92:saturation=0.72",
    preview: { color: "#C8C8C8", opacity: 0.18 },
  },
  {
    id: "paris",
    label: "Paris",
    vf: "colorbalance=rs=0.1:gs=0.04:bs=-0.08",
    preview: { color: "#E8C4B0", opacity: 0.22 },
  },
  {
    id: "simple",
    label: "Simple",
    vf: "eq=contrast=1.04:brightness=0.02:saturation=0.88",
    preview: { color: "#F0F0F0", opacity: 0.12 },
  },
  {
    id: "los_angeles",
    label: "Los Angeles",
    vf: "eq=brightness=0.1:saturation=1.22:contrast=1.06",
    preview: { color: "#FFD8A8", opacity: 0.2 },
  },
  {
    id: "midnight",
    label: "Midnight",
    vf: "eq=brightness=-0.1:contrast=1.18:saturation=0.82",
    preview: { color: "#1A2848", opacity: 0.28 },
  },
  {
    id: "jakarta",
    label: "Jakarta",
    vf: "eq=saturation=0.94:contrast=1.02:brightness=0.01",
    preview: { color: "#D8E8D0", opacity: 0.14 },
  },
  {
    id: "grainy",
    label: "Grainy",
    vf: "noise=alls=18:allf=t+u,eq=contrast=1.06",
    preview: { color: "#808080", opacity: 0.1 },
  },
  {
    id: "zoom_blur",
    label: "Zoom Blur",
    vf: "boxblur=2:1",
    preview: { color: "#FFFFFF", opacity: 0.08 },
  },
  {
    id: "soft_light",
    label: "Soft Light",
    vf: "eq=brightness=0.14:contrast=0.86:saturation=1.08",
    preview: { color: "#FFF8F0", opacity: 0.24 },
  },
  {
    id: "rio",
    label: "Rio de Janeiro",
    vf: "colorbalance=rs=0.14:gs=0.06:bs=-0.02:rm=0.1",
    preview: { color: "#FFB8C8", opacity: 0.22 },
  },
  {
    id: "handheld",
    label: "Handheld",
    vf: "eq=contrast=1.1:saturation=0.92:brightness=-0.02",
    preview: { color: "#A0A0A0", opacity: 0.12 },
  },
  {
    id: "lo_res",
    label: "Lo-Res",
    vf: "scale=iw/4:ih/4,scale=iw*4:ih*4:flags=neighbor",
    preview: { color: "#606060", opacity: 0.15 },
  },
  {
    id: "gritty",
    label: "Gritty",
    vf: "eq=contrast=1.38:saturation=0.55:brightness=-0.06",
    preview: { color: "#404040", opacity: 0.2 },
  },
  {
    id: "graphite",
    label: "Graphite",
    vf: "hue=s=0,eq=contrast=1.12:brightness=0.02",
    preview: { color: "#888888", opacity: 0.35 },
  },
  {
    id: "hyper",
    label: "Hyper",
    vf: "eq=saturation=1.48:contrast=1.22:brightness=0.05",
    preview: { color: "#FF6080", opacity: 0.16 },
  },
];

export function getVideoFilter(id: string): VideoFilterPreset {
  return MOBILE_VIDEO_FILTERS.find((f) => f.id === id) ?? MOBILE_VIDEO_FILTERS[0]!;
}
