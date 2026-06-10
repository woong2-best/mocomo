export type StudioToolId =
  | "pencil"
  | "pen"
  | "gpen"
  | "mappingPen"
  | "watercolor"
  | "airbrush"
  | "pastel"
  | "ink"
  | "blurBrush"
  | "eraser"
  | "fill"
  | "bucket"
  | "eyedropper"
  | "selectBrush"
  | "rectSelect"
  | "ellipseSelect"
  | "lassoSelect"
  | "move"
  | "text"
  | "speechBubble"
  | "speedLines"
  | "screentone"
  | "ruler";

export type StudioLayerType = "raster" | "text" | "group" | "folder" | "effect";

export type StudioLayer = {
  id: string;
  name: string;
  type: StudioLayerType;
  visible: boolean;
  locked: boolean;
  alphaLock: boolean;
  clipping: boolean;
  opacity: number;
  blendMode: GlobalCompositeOperation;
  /** PNG data URL */
  pixels: string | null;
  colorLabel?: string;
  textContent?: string;
  textFont?: string;
  textSize?: number;
};

export type StudioPage = {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: StudioLayer[];
  activeLayerId: string;
};

export type StudioBrushPreset = {
  id: string;
  name: string;
  tool: StudioToolId;
  size: number;
  opacity: number;
  spacing: number;
  hardness: number;
  pressure: boolean;
  stabilization: number;
  locked?: boolean;
  group?: string;
};

export type StudioDialogue = {
  id: string;
  pageId: string;
  speaker: string;
  text: string;
  x: number;
  y: number;
};

export type StudioProject = {
  id: string;
  name: string;
  pages: StudioPage[];
  activePageIndex: number;
  dialogues: StudioDialogue[];
  createdAt: string;
  updatedAt: string;
  favorite?: boolean;
  cloudId?: string;
};

export type StudioViewport = {
  zoom: number;
  panX: number;
  panY: number;
};

export type StudioSelection = {
  x: number;
  y: number;
  w: number;
  h: number;
} | null;

export type StudioThemeMode = "light" | "dark" | "system";
