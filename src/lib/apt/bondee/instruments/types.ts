/** Bondee 홈 연주 악기 — 가구 kind와 1:1 */

export const INSTRUMENT_KINDS = [
  "acoustic_guitar",
  "electric_guitar",
  "bass_guitar",
  "violin",
  "cello",
  "harp",
  "piano",
  "upright_piano",
  "grand_piano",
  "synthesizer",
  "marimba",
  "drum_set",
  "timpani",
  "xylophone",
  "accordion",
  "pan_flute",
  "ocarina",
  "saxophone",
  "trumpet",
  "french_horn",
] as const;

export type InstrumentKind = (typeof INSTRUMENT_KINDS)[number];

export type InstrumentPlayFamily =
  | "keyboard"
  | "string_fret"
  | "bowed"
  | "harp"
  | "percussion_kit"
  | "mallet"
  | "timpani"
  | "wind_reed"
  | "wind_brass"
  | "pan_flute"
  | "ocarina";

export type InstrumentPlayLayout =
  | { family: "keyboard"; keys: number }
  | { family: "string_fret"; frets: number }
  | { family: "bowed"; notes: number }
  | { family: "harp"; strings: number }
  | { family: "percussion_kit"; pads: string[] }
  | { family: "mallet"; bars: number }
  | { family: "timpani"; heads: number }
  | { family: "wind_reed"; notes: number }
  | { family: "wind_brass"; notes: number }
  | { family: "pan_flute"; tubes: number }
  | { family: "ocarina"; holes: number };

export type DiyMaterial = { id: string; label: string; qty: number };

export type InstrumentSpec = {
  label: string;
  emoji: string;
  family: InstrumentPlayFamily;
  layout: InstrumentPlayLayout;
  baseMidi: number;
  /** DIY 제작 가능 악기 */
  diy?: {
    materials: DiyMaterial[];
    craftLabel: string;
    hint: string;
  };
  /** 연주 시 아바타 포즈 */
  playPose: "stand" | "sit";
};

export function isInstrumentKind(kind: string): kind is InstrumentKind {
  return (INSTRUMENT_KINDS as readonly string[]).includes(kind);
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** 레이아웃별 MIDI 노트 배열 생성 */
export function notesForLayout(layout: InstrumentPlayLayout, baseMidi: number): number[] {
  switch (layout.family) {
    case "keyboard":
      return Array.from({ length: layout.keys }, (_, i) => baseMidi + i);
    case "string_fret":
      return Array.from({ length: layout.frets }, (_, i) => baseMidi + i);
    case "bowed":
      return Array.from({ length: layout.notes }, (_, i) => baseMidi + i);
    case "harp":
      return Array.from({ length: layout.strings }, (_, i) => baseMidi + i * 2);
    case "mallet":
      return Array.from({ length: layout.bars }, (_, i) => baseMidi + i * 2);
    case "timpani":
      return [48, 50, 52, 55].slice(0, layout.heads);
    case "wind_reed":
    case "wind_brass":
      return Array.from({ length: layout.notes }, (_, i) => baseMidi + i);
    case "pan_flute":
      return [60, 62, 64, 65, 67, 69, 71, 72].slice(0, layout.tubes);
    case "ocarina":
      return [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79].slice(0, layout.holes);
    case "percussion_kit":
      return layout.pads.map((_, i) => 36 + i);
  }
}

export const NOTE_LABELS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

export function midiLabel(midi: number): string {
  const name = NOTE_LABELS[((midi % 12) + 12) % 12];
  const oct = Math.floor(midi / 12) - 1;
  return `${name}${oct}`;
}
