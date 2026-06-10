import type { StudioBrushPreset, StudioProject, StudioPage, StudioToolId } from "@/lib/webtoon-studio/types";

export const WEBTOON_PAGE_WIDTH = 800;
export const WEBTOON_PAGE_HEIGHT = 3000;
export const HISTORY_MAX = 40;
export const AUTOSAVE_MS = 30_000;
export const STORAGE_DB = "mocomo-webtoon-studio";
export const STORAGE_STORE = "projects";

export const STUDIO_TOOLS: { id: StudioToolId; label: string; group: string }[] = [
  { id: "pencil", label: "연필", group: "draw" },
  { id: "pen", label: "펜", group: "draw" },
  { id: "gpen", label: "G펜", group: "draw" },
  { id: "mappingPen", label: "매핑펜", group: "draw" },
  { id: "watercolor", label: "수채화", group: "draw" },
  { id: "airbrush", label: "에어브러시", group: "draw" },
  { id: "pastel", label: "파스텔", group: "draw" },
  { id: "ink", label: "잉크", group: "draw" },
  { id: "blurBrush", label: "흐림", group: "draw" },
  { id: "eraser", label: "지우개", group: "draw" },
  { id: "fill", label: "채우기", group: "draw" },
  { id: "bucket", label: "버킷", group: "draw" },
  { id: "eyedropper", label: "스포이드", group: "draw" },
  { id: "selectBrush", label: "선택 브러시", group: "draw" },
  { id: "rectSelect", label: "사각 선택", group: "select" },
  { id: "ellipseSelect", label: "원형 선택", group: "select" },
  { id: "lassoSelect", label: "올가미", group: "select" },
  { id: "move", label: "이동", group: "select" },
  { id: "text", label: "텍스트", group: "text" },
  { id: "speechBubble", label: "말풍선", group: "manga" },
  { id: "speedLines", label: "속도선", group: "manga" },
  { id: "screentone", label: "스크린톤", group: "manga" },
  { id: "ruler", label: "직선 보조", group: "guide" },
];

export const DEFAULT_BRUSHES: StudioBrushPreset[] = [
  { id: "b-pencil", name: "연필", tool: "pencil", size: 4, opacity: 80, spacing: 0.15, hardness: 0.4, pressure: true, stabilization: 2 },
  { id: "b-gpen", name: "G펜", tool: "gpen", size: 8, opacity: 100, spacing: 0.08, hardness: 0.95, pressure: true, stabilization: 3 },
  { id: "b-ink", name: "잉크", tool: "ink", size: 6, opacity: 100, spacing: 0.05, hardness: 1, pressure: true, stabilization: 4 },
  { id: "b-air", name: "에어", tool: "airbrush", size: 24, opacity: 35, spacing: 0.2, hardness: 0.2, pressure: true, stabilization: 1 },
  { id: "b-erase", name: "지우개", tool: "eraser", size: 20, opacity: 100, spacing: 0.1, hardness: 0.5, pressure: true, stabilization: 0 },
];

export const STUDIO_PALETTE_KEY = "mocomo-webtoon-palette";
export const STUDIO_RECENT_COLORS_KEY = "mocomo-webtoon-recent-colors";

export const SPEECH_BUBBLE_TEMPLATES = [
  { id: "normal", label: "일반" },
  { id: "think", label: "생각" },
  { id: "shout", label: "비명" },
] as const;

export const LAYER_FILTERS = [
  { id: "blur", label: "가우시안 블러" },
  { id: "sharpen", label: "선명화" },
  { id: "grayscale", label: "흑백" },
  { id: "brightness", label: "밝기" },
  { id: "saturation", label: "채도" },
] as const;

export const SCREENTONE_PATTERNS = [
  { id: "dots", label: "점 ton" },
  { id: "lines", label: "선 ton" },
  { id: "cross", label: "교차 ton" },
] as const;

export type ScreentonePatternId = (typeof SCREENTONE_PATTERNS)[number]["id"];

export function createEmptyPage(name: string, index: number): StudioPage {
  const layerId = crypto.randomUUID();
  return {
    id: crypto.randomUUID(),
    name: name || `${index + 1}페이지`,
    width: WEBTOON_PAGE_WIDTH,
    height: WEBTOON_PAGE_HEIGHT,
    activeLayerId: layerId,
    layers: [
      {
        id: layerId,
        name: "레이어 1",
        type: "raster",
        visible: true,
        locked: false,
        alphaLock: false,
        clipping: false,
        opacity: 1,
        blendMode: "source-over",
        pixels: null,
      },
    ],
  };
}

export function createDefaultProject(name = "새 웹툰"): StudioProject {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    pages: [createEmptyPage("1페이지", 0)],
    activePageIndex: 0,
    dialogues: [],
    createdAt: now,
    updatedAt: now,
  };
}
