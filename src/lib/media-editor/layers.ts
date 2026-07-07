import type { EditorLayer, EditorProject, ImageLayerData, LayerTransform } from "@/lib/media-editor/types";
import { createLayer, cloneProject, defaultTransform, newLayerId, newProjectId } from "@/lib/media-editor/layer-factories";
import { DEFAULT_TEXT_STYLE } from "@/lib/media-editor/constants";
import type { BrushStroke, ShapeKind } from "@/lib/media-editor/types";
import type { StickerItem } from "@/lib/media-editor/stickers";
import { normalizeEditorImageSrc, readImageDimensions } from "@/lib/media-editor/load-image";

export { cloneProject, newLayerId, newProjectId, defaultTransform };

export function createImageLayer(
  src: string,
  naturalWidth: number,
  naturalHeight: number,
  opts?: { name?: string; type?: "background" | "image" }
): EditorLayer {
  const type = opts?.type ?? "image";
  return createLayer(type, {
    src,
    naturalWidth,
    naturalHeight,
    flipX: false,
    flipY: false,
    effects: {},
  }, { name: opts?.name ?? (type === "background" ? "배경" : "이미지") });
}

export function createTextLayer(text = "텍스트", x = 40, y = 40): EditorLayer {
  return createLayer("text", { text, ...DEFAULT_TEXT_STYLE, width: 280 }, { name: "텍스트", x, y });
}

export function createEmojiLayer(emoji: string, x = 80, y = 80, fontSize = 72): EditorLayer {
  return createLayer("emoji", { emoji, fontSize }, { name: emoji, x, y });
}

export function createStickerLayer(item: StickerItem, x = 60, y = 60): EditorLayer {
  if (item.kind === "emoji") return createEmojiLayer(item.src, x, y, 80);
  const w = item.width ?? 120;
  const h = item.height ?? 120;
  return createLayer("sticker", { src: item.src, naturalWidth: w, naturalHeight: h }, { name: item.label, x, y });
}

export function createShapeLayer(kind: ShapeKind, x = 100, y = 100): EditorLayer {
  return createLayer(
    "shape",
    {
      kind,
      width: kind === "line" || kind === "arrow" ? 160 : 120,
      height: kind === "line" || kind === "arrow" ? 8 : 120,
      fill: kind === "line" || kind === "arrow" ? "transparent" : "rgba(59,130,246,0.35)",
      stroke: "#3b82f6",
      strokeWidth: kind === "line" || kind === "arrow" ? 6 : 3,
      cornerRadius: 12,
    },
    { name: "도형", x, y }
  );
}

export function createBrushLayer(): EditorLayer {
  return createLayer("brush", { strokes: [] }, { name: "브러시" });
}

export function createBlurLayer(w: number, h: number, x: number, y: number): EditorLayer {
  return createLayer("blur", { width: w, height: h, blurRadius: 12 }, { name: "블러", x, y });
}

export function createOverlayLayer(w: number, h: number, x: number, y: number, color = "rgba(0,0,0,0.25)"): EditorLayer {
  return createLayer("overlay", { width: w, height: h, color }, { name: "오버레이", x, y });
}

export function fitLayerToCanvas(layer: EditorLayer, canvasW: number, canvasH: number): EditorLayer {
  if (layer.type !== "image" && layer.type !== "sticker" && layer.type !== "background") return layer;
  const nw = layer.data.naturalWidth;
  const nh = layer.data.naturalHeight;
  const scale = Math.min(canvasW / nw, canvasH / nh);
  const w = nw * scale;
  const h = nh * scale;
  return {
    ...layer,
    transform: { ...layer.transform, x: (canvasW - w) / 2, y: (canvasH - h) / 2, scaleX: scale, scaleY: scale },
  };
}

export function fitLayerCoverCanvas(layer: EditorLayer & { type: "background" | "image" }, canvasW: number, canvasH: number) {
  const nw = layer.data.naturalWidth;
  const nh = layer.data.naturalHeight;
  const scale = Math.max(canvasW / nw, canvasH / nh);
  const w = nw * scale;
  const h = nh * scale;
  return {
    ...layer,
    transform: { ...layer.transform, x: (canvasW - w) / 2, y: (canvasH - h) / 2, scaleX: scale, scaleY: scale },
  };
}

/**
 * 지정한 회전 각도에서 이미지(nw×nh)가 박스(boxW×boxH)를 완전히 덮는 최소 배율.
 * 회전 시 빈 모서리가 생기지 않도록 회전된 경계 상자 기준으로 계산한다.
 */
export function minCoverScale(
  nw: number,
  nh: number,
  boxW: number,
  boxH: number,
  rotationDeg = 0
): number {
  if (nw <= 0 || nh <= 0) return 1;
  const rad = (Math.abs(rotationDeg) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const needW = (boxW * cos + boxH * sin) / nw;
  const needH = (boxW * sin + boxH * cos) / nh;
  return Math.max(needW, needH);
}

/**
 * 배경 이미지를 중심 피벗으로 박스 중앙에 배치하고, 최소 커버 배율 이상으로 맞춘다.
 * offsetX/offsetY 를 이미지 중심으로 두는 렌더링과 짝을 이룬다(회전/줌이 항상 중앙 기준).
 */
export function coverBackgroundTransform(
  layer: EditorLayer & { type: "background" | "image" },
  boxW: number,
  boxH: number,
  opts?: { scale?: number; rotation?: number }
): LayerTransform {
  const nw = layer.data.naturalWidth;
  const nh = layer.data.naturalHeight;
  const rotation = opts?.rotation ?? layer.transform.rotation ?? 0;
  const cover = minCoverScale(nw, nh, boxW, boxH, rotation);
  const scale = Math.max(opts?.scale ?? cover, cover);
  return { x: boxW / 2, y: boxH / 2, scaleX: scale, scaleY: scale, rotation };
}

export function updateLayer(
  project: EditorProject,
  layerId: string,
  patch: Partial<EditorLayer> | ((layer: EditorLayer) => EditorLayer)
): EditorProject {
  return {
    ...project,
    layers: project.layers.map((l) => {
      if (l.id !== layerId) return l;
      return typeof patch === "function" ? patch(l) : ({ ...l, ...patch } as EditorLayer);
    }),
  };
}

export function setActiveLayer(project: EditorProject, layerId: string | null): EditorProject {
  return { ...project, activeLayerId: layerId };
}

export function addLayer(project: EditorProject, layer: EditorLayer): EditorProject {
  return { ...project, layers: [...project.layers, layer], activeLayerId: layer.id };
}

export function removeLayer(project: EditorProject, layerId: string): EditorProject {
  const layers = project.layers.filter((l) => l.id !== layerId);
  const activeLayerId = project.activeLayerId === layerId ? (layers.at(-1)?.id ?? null) : project.activeLayerId;
  return { ...project, layers, activeLayerId };
}

export function duplicateLayer(project: EditorProject, layerId: string): EditorProject {
  const source = project.layers.find((l) => l.id === layerId);
  if (!source) return project;
  const copy: EditorLayer = {
    ...cloneProject({ ...project, layers: [source] }).layers[0]!,
    id: newLayerId(),
    name: `${source.name} 복사`,
    transform: { ...source.transform, x: source.transform.x + 24, y: source.transform.y + 24 },
  };
  return addLayer(project, copy);
}

export function groupLayers(project: EditorProject, layerIds: string[]): EditorProject {
  const groupId = `group-${crypto.randomUUID()}`;
  return {
    ...project,
    layers: project.layers.map((l) => (layerIds.includes(l.id) ? { ...l, groupId } : l)),
  };
}

export function renameLayer(project: EditorProject, layerId: string, name: string): EditorProject {
  return updateLayer(project, layerId, { name });
}

export function moveLayer(project: EditorProject, layerId: string, direction: "up" | "down"): EditorProject {
  const idx = project.layers.findIndex((l) => l.id === layerId);
  if (idx < 0) return project;
  const next = [...project.layers];
  const swap = direction === "up" ? idx + 1 : idx - 1;
  if (swap < 0 || swap >= next.length) return project;
  [next[idx], next[swap]] = [next[swap]!, next[idx]!];
  return { ...project, layers: next };
}

export function bringLayerToFront(project: EditorProject, layerId: string): EditorProject {
  const idx = project.layers.findIndex((l) => l.id === layerId);
  if (idx < 0 || idx === project.layers.length - 1) return project;
  const layer = project.layers[idx]!;
  if (layer.type === "background") return project;
  const next = project.layers.filter((l) => l.id !== layerId);
  next.push(layer);
  return { ...project, layers: next };
}

export function sendLayerToBack(project: EditorProject, layerId: string): EditorProject {
  const idx = project.layers.findIndex((l) => l.id === layerId);
  if (idx <= 0) return project;
  const layer = project.layers[idx]!;
  if (layer.type === "background") return project;
  const next = project.layers.filter((l) => l.id !== layerId);
  const insertAt = next[0]?.type === "background" ? 1 : 0;
  next.splice(insertAt, 0, layer);
  return { ...project, layers: next };
}

export function setCrop(project: EditorProject, crop: import("@/lib/media-editor/types").CropRect): EditorProject {
  return { ...project, crop };
}

export function appendBrushStroke(project: EditorProject, layerId: string, stroke: BrushStroke): EditorProject {
  return updateLayer(project, layerId, (layer) => {
    if (layer.type !== "brush") return layer;
    return { ...layer, data: { strokes: [...layer.data.strokes, stroke] } };
  });
}

export async function createProjectFromImageSrc(
  src: string,
  opts: {
    maxWidth: number;
    maxHeight: number;
    defaultAspect?: number;
    title?: string;
    /** true면 캔버스를 업로드 이미지의 실제 비율에 맞춰 생성(검은 여백 없음) */
    fitToImage?: boolean;
  }
): Promise<EditorProject> {
  const normalizedSrc = await normalizeEditorImageSrc(src);
  const { width: nw, height: nh } = await readImageDimensions(normalizedSrc);
  let canvasW: number;
  let canvasH: number;
  if (opts.fitToImage) {
    // 이미지 자체 비율로 캔버스를 만들고 최대 크기 안으로 축소한다.
    const scale = Math.min(1, opts.maxWidth / nw, opts.maxHeight / nh);
    canvasW = Math.max(1, Math.round(nw * scale));
    canvasH = Math.max(1, Math.round(nh * scale));
  } else {
    const aspect = opts.defaultAspect ?? 4 / 5;
    canvasW = Math.min(nw, opts.maxWidth);
    canvasH = Math.round(canvasW / aspect);
    if (canvasH > opts.maxHeight) {
      canvasH = opts.maxHeight;
      canvasW = Math.round(canvasH * aspect);
    }
  }
  const now = new Date().toISOString();
  const bgLayer = createImageLayer(normalizedSrc, nw, nh, { name: "배경", type: "background" });
  const bg = {
    ...bgLayer,
    transform: coverBackgroundTransform(bgLayer as EditorLayer & { type: "background" | "image" }, canvasW, canvasH),
  } as EditorLayer;
  return {
    version: 2,
    meta: { id: newProjectId(), title: opts.title ?? "편집", createdAt: now, updatedAt: now },
    width: canvasW,
    height: canvasH,
    layers: [bg],
    activeLayerId: bg.id,
    crop: { x: 0, y: 0, width: canvasW, height: canvasH },
    showGuides: true,
    snapEnabled: true,
  };
}

export async function createLayerFromFile(file: File): Promise<EditorLayer> {
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const { width, height } = await readImageDimensions(src);
  return createImageLayer(src, width, height, { name: file.name.replace(/\.[^.]+$/, "") || "이미지" });
}

export type { ImageLayerData, LayerTransform };
