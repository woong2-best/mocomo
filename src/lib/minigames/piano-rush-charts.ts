import type { PianoChart, PianoDifficulty } from "./piano-rush-logic";
import {
  CLASSICAL_CHARTS,
  getClassicalChartById,
  pickClassicalChart,
} from "./piano-rush-classical-charts";

/** 피아노 러쉬 곡 목록 — 퍼블릭 도메인 클래식 전용 */
export const PIANO_CHARTS: PianoChart[] = CLASSICAL_CHARTS;

export { CLASSICAL_CHARTS, CLASSICAL_CHART_IDS } from "./piano-rush-classical-charts";

export function getChartById(id: string): PianoChart | undefined {
  return getClassicalChartById(id);
}

export function pickChart(opts?: {
  chartId?: string;
  difficulty?: PianoDifficulty;
  excludeIds?: string[];
  category?: "classic";
}): PianoChart {
  return pickClassicalChart({
    chartId: opts?.chartId,
    difficulty: opts?.difficulty,
    excludeIds: opts?.excludeIds,
  });
}

export function listChartsForPicker(): {
  id: string;
  title: string;
  artist: string;
  difficulty: PianoDifficulty;
  durationSec: number;
}[] {
  return PIANO_CHARTS.map((c) => ({
    id: c.id,
    title: c.title,
    artist: c.artist,
    difficulty: c.difficulty,
    durationSec: Math.round(c.durationMs / 1000),
  }));
}
