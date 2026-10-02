import type { StudioBrushPreset, StudioProject, StudioPage, StudioToolId } from "@/lib/webtoon-studio/types";

export const WEBTOON_PAGE_WIDTH = 800;
export const WEBTOON_PAGE_HEIGHT = 3000;
export const HISTORY_MAX = 40;
export const AUTOSAVE_MS = 30_000;
export const STORAGE_DB = "mocomo-webtoon-studio";
export const STORAGE_STORE = "projects";

export const STUDIO_TOOLS: { id: StudioToolId; label: string; group: string }[] = [
  { id: "pencil", label: "Pencil", group: "draw" },
  { id: "pen", label: "Pen", group: "draw" },
  { id: "gpen", label: "G pen", group: "draw" },
  { id: "mappingPen", label: "Mapping pen", group: "draw" },
  { id: "watercolor", label: "Watercolor", group: "draw" },
  { id: "airbrush", label: "Airbrush", group: "draw" },
  { id: "pastel", label: "Pastel", group: "draw" },
  { id: "ink", label: "Ink", group: "draw" },
  { id: "blurBrush", label: "Blur", group: "draw" },
  { id: "eraser", label: "Eraser", group: "draw" },
  { id: "fill", label: "Fill", group: "draw" },
  { id: "bucket", label: "Bucket", group: "draw" },
  { id: "eyedropper", label: "Eyedropper", group: "draw" },
  { id: "selectBrush", label: "Selection brush", group: "draw" },
  { id: "rectSelect", label: "Rectangular selection", group: "select" },
  { id: "ellipseSelect", label: "Elliptical selection", group: "select" },
  { id: "lassoSelect", label: "Lasso", group: "select" },
  { id: "move", label: "Move", group: "select" },
  { id: "text", label: "Text", group: "text" },
  { id: "speechBubble", label: "Speech bubble", group: "manga" },
  { id: "speedLines", label: "Speed lines", group: "manga" },
  { id: "screentone", label: "Screentone", group: "manga" },
  { id: "ruler", label: "Straight line guide", group: "guide" },
];

export const DEFAULT_BRUSHES: StudioBrushPreset[] = [
  { id: "b-pencil", name: "Pencil", tool: "pencil", size: 4, opacity: 80, spacing: 0.15, hardness: 0.4, pressure: true, stabilization: 2 },
  { id: "b-gpen", name: "G pen", tool: "gpen", size: 8, opacity: 100, spacing: 0.08, hardness: 0.95, pressure: true, stabilization: 3 },
  { id: "b-ink", name: "Ink", tool: "ink", size: 6, opacity: 100, spacing: 0.05, hardness: 1, pressure: true, stabilization: 4 },
  { id: "b-air", name: "Whisper", tool: "airbrush", size: 24, opacity: 35, spacing: 0.2, hardness: 0.2, pressure: true, stabilization: 1 },
  { id: "b-erase", name: "Eraser", tool: "eraser", size: 20, opacity: 100, spacing: 0.1, hardness: 0.5, pressure: true, stabilization: 0 },
];

export const STUDIO_PALETTE_KEY = "mocomo-webtoon-palette";
export const STUDIO_RECENT_COLORS_KEY = "mocomo-webtoon-recent-colors";

export const SPEECH_BUBBLE_TEMPLATES = [
  { id: "normal", label: "Normal" },
  { id: "think", label: "Thought" },
  { id: "shout", label: "Shout" },
] as const;

export const LAYER_FILTERS = [
  { id: "blur", label: "Gaussian blur" },
  { id: "sharpen", label: "Sharpen" },
  { id: "grayscale", label: "B&W" },
  { id: "brightness", label: "Brightness" },
  { id: "saturation", label: "Saturation" },
] as const;

export const SCREENTONE_PATTERNS = [
  { id: "dots", label: "Dot tone" },
  { id: "lines", label: "Line tone" },
  { id: "cross", label: "Cross tone" },
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
        name: "Layer 1",
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

export function createDefaultProject(name = "New webtoon"): StudioProject {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    pages: [createEmptyPage("Page 1", 0)],
    activePageIndex: 0,
    dialogues: [],
    createdAt: now,
    updatedAt: now,
  };
}
