export const EDITOR_PROJECT_VERSION = 2 as const;

export type EditorLayerType =
  | "background"
  | "image"
  | "text"
  | "emoji"
  | "sticker"
  | "shape"
  | "brush"
  | "blur"
  | "overlay";

export type LayerTransform = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
};

export type TextAlign = "left" | "center" | "right";

export type TextLayerData = {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontStyle: "normal" | "bold" | "italic" | "bold italic";
  textDecoration: string;
  fill: string;
  align: TextAlign;
  lineHeight: number;
  letterSpacing: number;
  stroke: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  backgroundColor: string;
  width: number;
};

export type EmojiLayerData = {
  emoji: string;
  fontSize: number;
};

export type StickerLayerData = {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
};

export type ShapeKind =
  | "rect"
  | "circle"
  | "triangle"
  | "line"
  | "arrow"
  | "star"
  | "heart"
  | "speech";

export type ShapeLayerData = {
  kind: ShapeKind;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
};

export type BrushStroke = {
  points: number[];
  color: string;
  size: number;
  opacity: number;
  tool: "pen" | "pencil" | "highlighter" | "brush" | "neon" | "eraser";
};

export type BrushLayerData = {
  strokes: BrushStroke[];
};

export type BlurLayerData = {
  width: number;
  height: number;
  blurRadius: number;
};

export type OverlayLayerData = {
  width: number;
  height: number;
  color: string;
};

export type ImageEffects = {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  hue?: number;
  blur?: number;
  noise?: number;
  vignette?: number;
};

export type ImageLayerData = {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  flipX: boolean;
  flipY: boolean;
  effects?: ImageEffects;
};

type LayerBase = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: GlobalCompositeOperation;
  transform: LayerTransform;
  groupId?: string;
};

export type EditorLayer =
  | (LayerBase & { type: "background"; data: ImageLayerData })
  | (LayerBase & { type: "image"; data: ImageLayerData })
  | (LayerBase & { type: "text"; data: TextLayerData })
  | (LayerBase & { type: "emoji"; data: EmojiLayerData })
  | (LayerBase & { type: "sticker"; data: StickerLayerData })
  | (LayerBase & { type: "shape"; data: ShapeLayerData })
  | (LayerBase & { type: "brush"; data: BrushLayerData })
  | (LayerBase & { type: "blur"; data: BlurLayerData })
  | (LayerBase & { type: "overlay"; data: OverlayLayerData });

export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type EditorToolId =
  | "select"
  | "image"
  | "text"
  | "emoji"
  | "sticker"
  | "shape"
  | "brush"
  | "blur"
  | "overlay";

export type BrushToolId = BrushStroke["tool"];

export type EditorProjectMeta = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type EditorProject = {
  version: typeof EDITOR_PROJECT_VERSION;
  meta: EditorProjectMeta;
  width: number;
  height: number;
  layers: EditorLayer[];
  activeLayerId: string | null;
  crop: CropRect;
  showGuides: boolean;
  snapEnabled: boolean;
};

export type CropAspectPreset = {
  id: string;
  label: string;
  aspect?: number;
};

export type SavedEditorProject = EditorProject & { thumbDataUrl?: string };

export type GuideLine = { orientation: "h" | "v"; position: number };

export function isImageLikeLayer(
  layer: EditorLayer
): layer is EditorLayer & { type: "background" | "image" | "sticker"; data: ImageLayerData | StickerLayerData } {
  return layer.type === "background" || layer.type === "image" || layer.type === "sticker";
}

export function hasFlip(layer: EditorLayer): layer is EditorLayer & { type: "background" | "image"; data: ImageLayerData } {
  return layer.type === "background" || layer.type === "image";
}
