import type { PianoChart, PianoDifficulty } from "./piano-rush-logic";
import {
  AUDIO_CHARTS,
  getAudioChartById,
  pickAudioChart,
} from "./piano-rush-audio-charts";
import {
  CLASSICAL_CHARTS,
  getClassicalChartById,
  pickClassicalChart,
} from "./piano-rush-classical-charts";

/** Musopen CC PD 녹음 + 기존 합성 차트 */
export const PIANO_CHARTS: PianoChart[] = [...AUDIO_CHARTS, ...CLASSICAL_CHARTS];

export { AUDIO_CHARTS, AUDIO_CHART_IDS } from "./piano-rush-audio-charts";
export { CLASSICAL_CHARTS, CLASSICAL_CHART_IDS } from "./piano-rush-classical-charts";

export function getChartById(id: string): PianoChart | undefined {
  return getAudioChartById(id) ?? getClassicalChartById(id);
}

export function pickChart(opts?: {
  chartId?: string;
  difficulty?: PianoDifficulty;
  excludeIds?: string[];
  category?: "classic";
}): PianoChart {
  if (opts?.chartId) {
    const fixed = getChartById(opts.chartId);
    if (fixed) return fixed;
  }
  const audio = pickAudioChart(opts);
  if (audio) return audio;
  return pickClassicalChart(opts);
}

export function listChartsForPicker(): {
  id: string;
  title: string;
  artist: string;
  difficulty: PianoDifficulty;
  durationSec: number;
  hasAudio: boolean;
  license?: string;
}[] {
  return PIANO_CHARTS.map((c) => ({
    id: c.id,
    title: c.title,
    artist: c.artist,
    difficulty: c.difficulty,
    durationSec: Math.round(c.durationMs / 1000),
    hasAudio: !!c.audioUrl,
    license: c.license,
  }));
}
