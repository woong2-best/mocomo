import type { TowerMapId } from "./tower-rush-logic";

export type TowerMapTheme = {
  skyTop: string;
  skyBottom: string;
  ground: string;
  accent: string;
  blockGlow: string;
  envLabel: string;
};

export const TOWER_MAP_THEMES: Record<TowerMapId, TowerMapTheme> = {
  city: {
    skyTop: "#1e3a5f",
    skyBottom: "#64748b",
    ground: "#334155",
    accent: "#38bdf8",
    blockGlow: "#0ea5e9",
    envLabel: "도심 · 미풍",
  },
  desert: {
    skyTop: "#f59e0b",
    skyBottom: "#fde68a",
    ground: "#d97706",
    accent: "#fbbf24",
    blockGlow: "#fb923c",
    envLabel: "사막 · 강풍",
  },
  ice: {
    skyTop: "#bae6fd",
    skyBottom: "#e0f2fe",
    ground: "#94a3b8",
    accent: "#67e8f9",
    blockGlow: "#22d3ee",
    envLabel: "빙하 · 미끄럼",
  },
  space: {
    skyTop: "#020617",
    skyBottom: "#1e1b4b",
    ground: "#312e81",
    accent: "#a78bfa",
    blockGlow: "#818cf8",
    envLabel: "우주 · 무중력",
  },
  ocean: {
    skyTop: "#0284c7",
    skyBottom: "#7dd3fc",
    ground: "#0c4a6e",
    accent: "#38bdf8",
    blockGlow: "#06b6d4",
    envLabel: "바다 · 파도",
  },
  volcano: {
    skyTop: "#7f1d1d",
    skyBottom: "#fb923c",
    ground: "#451a03",
    accent: "#ef4444",
    blockGlow: "#f97316",
    envLabel: "화산 · 지진",
  },
  clouds: {
    skyTop: "#93c5fd",
    skyBottom: "#f8fafc",
    ground: "#cbd5e1",
    accent: "#6366f1",
    blockGlow: "#818cf8",
    envLabel: "구름 · 흔들림",
  },
};

export const TOWER_MAPS = Object.entries(TOWER_MAP_THEMES).map(([id, t]) => ({
  id: id as TowerMapId,
  name: t.envLabel.split(" · ")[0] ?? id,
}));
