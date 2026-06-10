import type { StudioLayer, StudioPage } from "@/lib/webtoon-studio/types";

export function layerCanvas(layer: StudioLayer, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (ctx && layer.pixels) {
    const img = new Image();
    img.src = layer.pixels;
    if (img.complete) ctx.drawImage(img, 0, 0);
    else img.onload = () => ctx.drawImage(img, 0, 0);
  }
  return c;
}

export function syncLayerPixels(layer: StudioLayer, canvas: HTMLCanvasElement): StudioLayer {
  return { ...layer, pixels: canvas.toDataURL("image/png") };
}

export function compositePage(page: StudioPage): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = page.width;
  out.height = page.height;
  const ctx = out.getContext("2d");
  if (!ctx) return out;

  for (const layer of page.layers) {
    if (!layer.visible || layer.type !== "raster") continue;
    const lc = layerCanvas(layer, page.width, page.height);
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = layer.blendMode;
    ctx.drawImage(lc, 0, 0);
    ctx.restore();
  }
  return out;
}

export function mergePageLayers(page: StudioPage, layerIds: string[]): StudioPage {
  if (layerIds.length < 2) return page;
  const targets = page.layers.filter((l) => layerIds.includes(l.id) && l.type === "raster");
  if (targets.length < 2) return page;

  const merged = document.createElement("canvas");
  merged.width = page.width;
  merged.height = page.height;
  const ctx = merged.getContext("2d")!;
  for (const t of targets) {
    const lc = layerCanvas(t, page.width, page.height);
    ctx.drawImage(lc, 0, 0);
  }

  const first = targets[0]!;
  const mergedLayer = syncLayerPixels({ ...first, name: `${first.name} (병합)` }, merged);
  const remove = new Set(layerIds);
  const firstIndex = page.layers.findIndex((l) => l.id === first.id);
  const layers = page.layers.filter((l) => !remove.has(l.id));
  layers.splice(Math.max(0, firstIndex), 0, mergedLayer);
  return { ...page, layers, activeLayerId: mergedLayer.id };
}

export function duplicateLayer(layer: StudioLayer): StudioLayer {
  return {
    ...layer,
    id: crypto.randomUUID(),
    name: `${layer.name} 복사`,
    locked: false,
  };
}

export function reorderLayers(page: StudioPage, from: number, to: number): StudioPage {
  const layers = [...page.layers];
  const [item] = layers.splice(from, 1);
  if (!item) return page;
  layers.splice(to, 0, item);
  return { ...page, layers };
}
