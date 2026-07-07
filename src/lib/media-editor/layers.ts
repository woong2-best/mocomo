import type { CropRect, EditorLayer, EditorProject, ImageLayerData, LayerTransform } from "@/lib/media-editor/types";

export function newLayerId(): string {
  return `layer-${crypto.randomUUID()}`;
}

export function cloneProject(project: EditorProject): EditorProject {
  return JSON.parse(JSON.stringify(project)) as EditorProject;
}

const defaultTransform = (): LayerTransform => ({
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
});

export function createImageLayer(
  src: string,
  naturalWidth: number,
  naturalHeight: number,
  opts?: { name?: string; type?: "background" | "image" }
): EditorLayer {
  return {
    id: newLayerId(),
    name: opts?.name ?? "이미지",
    type: opts?.type ?? "image",
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: "source-over",
    transform: defaultTransform(),
    data: {
      src,
      naturalWidth,
      naturalHeight,
      flipX: false,
      flipY: false,
    },
  };
}

export function fitLayerToCanvas(layer: EditorLayer, canvasW: number, canvasH: number): EditorLayer {
  const { naturalWidth, naturalHeight } = layer.data;
  const scale = Math.min(canvasW / naturalWidth, canvasH / naturalHeight);
  const w = naturalWidth * scale;
  const h = naturalHeight * scale;
  return {
    ...layer,
    transform: {
      ...layer.transform,
      x: (canvasW - w) / 2,
      y: (canvasH - h) / 2,
      scaleX: scale,
      scaleY: scale,
    },
  };
}

export function fitLayerCoverCanvas(layer: EditorLayer, canvasW: number, canvasH: number): EditorLayer {
  const { naturalWidth, naturalHeight } = layer.data;
  const scale = Math.max(canvasW / naturalWidth, canvasH / naturalHeight);
  const w = naturalWidth * scale;
  const h = naturalHeight * scale;
  return {
    ...layer,
    transform: {
      ...layer.transform,
      x: (canvasW - w) / 2,
      y: (canvasH - h) / 2,
      scaleX: scale,
      scaleY: scale,
    },
  };
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
      return typeof patch === "function" ? patch(l) : { ...l, ...patch };
    }),
  };
}

export function setActiveLayer(project: EditorProject, layerId: string | null): EditorProject {
  return { ...project, activeLayerId: layerId };
}

export function addLayer(project: EditorProject, layer: EditorLayer): EditorProject {
  return {
    ...project,
    layers: [...project.layers, layer],
    activeLayerId: layer.id,
  };
}

export function removeLayer(project: EditorProject, layerId: string): EditorProject {
  const layers = project.layers.filter((l) => l.id !== layerId);
  const activeLayerId =
    project.activeLayerId === layerId ? (layers.at(-1)?.id ?? null) : project.activeLayerId;
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

export function moveLayer(project: EditorProject, layerId: string, direction: "up" | "down"): EditorProject {
  const idx = project.layers.findIndex((l) => l.id === layerId);
  if (idx < 0) return project;
  const next = [...project.layers];
  const swap = direction === "up" ? idx + 1 : idx - 1;
  if (swap < 0 || swap >= next.length) return project;
  [next[idx], next[swap]] = [next[swap]!, next[idx]!];
  return { ...project, layers: next };
}

export function reorderLayers(project: EditorProject, fromIndex: number, toIndex: number): EditorProject {
  const next = [...project.layers];
  const [item] = next.splice(fromIndex, 1);
  if (!item) return project;
  next.splice(toIndex, 0, item);
  return { ...project, layers: next };
}

export function setCrop(project: EditorProject, crop: CropRect): EditorProject {
  return { ...project, crop };
}

export function loadImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}

export async function createProjectFromImageSrc(
  src: string,
  opts: { maxWidth: number; maxHeight: number; defaultAspect?: number }
): Promise<EditorProject> {
  const { width: nw, height: nh } = await loadImageSize(src);
  const aspect = opts.defaultAspect ?? 4 / 5;
  let canvasW = Math.min(nw, opts.maxWidth);
  let canvasH = Math.round(canvasW / aspect);
  if (canvasH > opts.maxHeight) {
    canvasH = opts.maxHeight;
    canvasW = Math.round(canvasH * aspect);
  }
  const bg = fitLayerCoverCanvas(
    createImageLayer(src, nw, nh, { name: "배경", type: "background" }),
    canvasW,
    canvasH
  );
  const crop = {
    x: 0,
    y: 0,
    width: canvasW,
    height: canvasH,
  };
  return {
    version: 1,
    width: canvasW,
    height: canvasH,
    layers: [bg],
    activeLayerId: bg.id,
    crop,
  };
}

export async function createLayerFromFile(file: File): Promise<EditorLayer> {
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const { width, height } = await loadImageSize(src);
  return createImageLayer(src, width, height, { name: file.name.replace(/\.[^.]+$/, "") || "이미지" });
}

export function layerDisplaySize(layer: EditorLayer): { width: number; height: number } {
  const flipX = layer.data.flipX ? -1 : 1;
  const flipY = layer.data.flipY ? -1 : 1;
  return {
    width: layer.data.naturalWidth * Math.abs(layer.transform.scaleX) * (flipX < 0 ? -1 : 1),
    height: layer.data.naturalHeight * Math.abs(layer.transform.scaleY) * (flipY < 0 ? -1 : 1),
  };
}

export type { ImageLayerData };
