import type { EditorLayerType } from "@/lib/media-editor/types";
import type {
  BlurLayerData,
  BrushLayerData,
  EditorLayer,
  EmojiLayerData,
  ImageLayerData,
  OverlayLayerData,
  ShapeLayerData,
  StickerLayerData,
  TextLayerData,
} from "@/lib/media-editor/types";

export function newLayerId(): string {
  return `layer-${crypto.randomUUID()}`;
}

export function newProjectId(): string {
  return `proj-${crypto.randomUUID()}`;
}

export function cloneProject<T>(project: T): T {
  return JSON.parse(JSON.stringify(project)) as T;
}

export const defaultTransform = () => ({
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
});

export function createLayer(
  type: "background" | "image",
  data: ImageLayerData,
  opts?: { name?: string; x?: number; y?: number }
): EditorLayer;
export function createLayer(type: "text", data: TextLayerData, opts?: { name?: string; x?: number; y?: number }): EditorLayer;
export function createLayer(type: "emoji", data: EmojiLayerData, opts?: { name?: string; x?: number; y?: number }): EditorLayer;
export function createLayer(type: "sticker", data: StickerLayerData, opts?: { name?: string; x?: number; y?: number }): EditorLayer;
export function createLayer(type: "shape", data: ShapeLayerData, opts?: { name?: string; x?: number; y?: number }): EditorLayer;
export function createLayer(type: "brush", data: BrushLayerData, opts?: { name?: string; x?: number; y?: number }): EditorLayer;
export function createLayer(type: "blur", data: BlurLayerData, opts?: { name?: string; x?: number; y?: number }): EditorLayer;
export function createLayer(type: "overlay", data: OverlayLayerData, opts?: { name?: string; x?: number; y?: number }): EditorLayer;
export function createLayer(
  type: EditorLayerType,
  data: unknown,
  opts?: { name?: string; x?: number; y?: number }
): EditorLayer {
  return {
    id: newLayerId(),
    name: opts?.name ?? layerDefaultName(type),
    type,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: "source-over",
    transform: { ...defaultTransform(), x: opts?.x ?? 0, y: opts?.y ?? 0 },
    data,
  } as EditorLayer;
}

function layerDefaultName(type: EditorLayerType): string {
  const names: Record<EditorLayerType, string> = {
    background: "배경",
    image: "이미지",
    text: "텍스트",
    emoji: "이모지",
    sticker: "스티커",
    shape: "도형",
    brush: "브러시",
    blur: "블러",
    overlay: "오버레이",
  };
  return names[type];
}
