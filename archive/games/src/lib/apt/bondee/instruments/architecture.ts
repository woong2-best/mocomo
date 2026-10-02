import type { InstrumentKind, InstrumentSpec } from "./types";

/** 악기별 연주 스펙 — 가구 아키텍처와 별도 레이어 */
export const INSTRUMENT_SPECS: Record<InstrumentKind, InstrumentSpec> = {
  acoustic_guitar: {
    label: "어쿠스틱 기타",
    emoji: "🎸",
    family: "string_fret",
    layout: { family: "string_fret", frets: 15 },
    baseMidi: 40,
    playPose: "sit",
  },
  electric_guitar: {
    label: "일렉트릭 기타",
    emoji: "🎸",
    family: "string_fret",
    layout: { family: "string_fret", frets: 15 },
    baseMidi: 40,
    playPose: "stand",
  },
  bass_guitar: {
    label: "베이스 기타",
    emoji: "🎸",
    family: "string_fret",
    layout: { family: "string_fret", frets: 12 },
    baseMidi: 28,
    playPose: "stand",
  },
  violin: {
    label: "바이올린",
    emoji: "🎻",
    family: "bowed",
    layout: { family: "bowed", notes: 16 },
    baseMidi: 55,
    playPose: "stand",
  },
  cello: {
    label: "첼로",
    emoji: "🎻",
    family: "bowed",
    layout: { family: "bowed", notes: 14 },
    baseMidi: 36,
    playPose: "sit",
  },
  harp: {
    label: "하프",
    emoji: "🪕",
    family: "harp",
    layout: { family: "harp", strings: 19 },
    baseMidi: 48,
    playPose: "sit",
  },
  piano: {
    label: "피아노",
    emoji: "🎹",
    family: "keyboard",
    layout: { family: "keyboard", keys: 24 },
    baseMidi: 48,
    playPose: "sit",
  },
  upright_piano: {
    label: "업라이트 피아노",
    emoji: "🎹",
    family: "keyboard",
    layout: { family: "keyboard", keys: 24 },
    baseMidi: 48,
    playPose: "sit",
  },
  grand_piano: {
    label: "그랜드 피아노",
    emoji: "🎹",
    family: "keyboard",
    layout: { family: "keyboard", keys: 24 },
    baseMidi: 48,
    playPose: "sit",
  },
  synthesizer: {
    label: "신시사이저",
    emoji: "🎛️",
    family: "keyboard",
    layout: { family: "keyboard", keys: 24 },
    baseMidi: 48,
    playPose: "stand",
  },
  marimba: {
    label: "마림바",
    emoji: "🪵",
    family: "mallet",
    layout: { family: "mallet", bars: 15 },
    baseMidi: 48,
    playPose: "stand",
  },
  drum_set: {
    label: "드럼 세트",
    emoji: "🥁",
    family: "percussion_kit",
    layout: {
      family: "percussion_kit",
      pads: ["킥", "스네어", "하이햇", "탐1", "탐2", "크래시", "라이드"],
    },
    baseMidi: 36,
    playPose: "sit",
  },
  timpani: {
    label: "팀파니",
    emoji: "🥁",
    family: "timpani",
    layout: { family: "timpani", heads: 4 },
    baseMidi: 48,
    playPose: "stand",
  },
  xylophone: {
    label: "실로폰",
    emoji: "🎵",
    family: "mallet",
    layout: { family: "mallet", bars: 15 },
    baseMidi: 60,
    playPose: "stand",
  },
  accordion: {
    label: "아코디언",
    emoji: "🪗",
    family: "wind_reed",
    layout: { family: "wind_reed", notes: 20 },
    baseMidi: 48,
    playPose: "stand",
  },
  pan_flute: {
    label: "팬플루트",
    emoji: "🎶",
    family: "pan_flute",
    layout: { family: "pan_flute", tubes: 8 },
    baseMidi: 60,
    playPose: "stand",
    diy: {
      materials: [
        { id: "bamboo", label: "대나무", qty: 3 },
        { id: "string", label: "실", qty: 1 },
        { id: "wax", label: "밀랍", qty: 1 },
      ],
      craftLabel: "팬플루트 제작",
      hint: "길이 다른 대나무 관을 묶어 만듭니다",
    },
  },
  ocarina: {
    label: "오카리나",
    emoji: "🫧",
    family: "ocarina",
    layout: { family: "ocarina", holes: 12 },
    baseMidi: 60,
    playPose: "stand",
    diy: {
      materials: [
        { id: "clay", label: "점토", qty: 2 },
        { id: "glaze", label: "유약", qty: 1 },
      ],
      craftLabel: "오카리나 제작",
      hint: "점토를 구워 손바닥 크기의 관악기를 빚습니다",
    },
  },
  saxophone: {
    label: "색소폰",
    emoji: "🎷",
    family: "wind_reed",
    layout: { family: "wind_reed", notes: 18 },
    baseMidi: 46,
    playPose: "stand",
  },
  trumpet: {
    label: "트럼펫",
    emoji: "🎺",
    family: "wind_brass",
    layout: { family: "wind_brass", notes: 16 },
    baseMidi: 55,
    playPose: "stand",
  },
  french_horn: {
    label: "프렌치 호른",
    emoji: "📯",
    family: "wind_brass",
    layout: { family: "wind_brass", notes: 16 },
    baseMidi: 48,
    playPose: "stand",
  },
};

export function specForInstrument(kind: InstrumentKind): InstrumentSpec {
  return INSTRUMENT_SPECS[kind];
}

export function requiresDiy(kind: InstrumentKind): boolean {
  return !!INSTRUMENT_SPECS[kind].diy;
}

export function isDiyCrafted(
  kind: InstrumentKind,
  crafted?: Partial<Record<InstrumentKind, boolean>>
): boolean {
  if (!requiresDiy(kind)) return true;
  return crafted?.[kind] === true;
}
