export type PreviewPresetId = "pastel" | "cozy" | "apt";

export const PREVIEW_PRESETS: Record<
  PreviewPresetId,
  { label: string; background: number; hemiSky: number; hemiGround: number; floor: number }
> = {
  pastel: {
    label: "파스텔",
    background: 0xfef6f8,
    hemiSky: 0xfff0f5,
    hemiGround: 0xc8d8ff,
    floor: 0xf5e8ef,
  },
  cozy: {
    label: "아늑함",
    background: 0xfff8f0,
    hemiSky: 0xffecd9,
    hemiGround: 0xe8d4c4,
    floor: 0xf0e0d0,
  },
  apt: {
    label: "APT 홈",
    background: 0xf5f0ff,
    hemiSky: 0xe8f0ff,
    hemiGround: 0xd8e8f8,
    floor: 0xeae4f8,
  },
};

export const PREVIEW_PRESET_IDS = Object.keys(PREVIEW_PRESETS) as PreviewPresetId[];
