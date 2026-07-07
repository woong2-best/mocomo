import type { EditorLayer, EditorProject } from "@/lib/media-editor/types";

const SNAP_THRESHOLD = 8;

export type GuideLine = { orientation: "h" | "v"; position: number };

export function getLayerBounds(layer: EditorLayer, _project: EditorProject) {
  const w = getLayerWidth(layer);
  const h = getLayerHeight(layer);
  const { x, y } = layer.transform;
  return { left: x, top: y, right: x + w, bottom: y + h, cx: x + w / 2, cy: y + h / 2, width: w, height: h };
}

function getLayerWidth(layer: EditorLayer): number {
  switch (layer.type) {
    case "background":
    case "image":
      return layer.data.naturalWidth * Math.abs(layer.transform.scaleX);
    case "sticker":
      return layer.data.naturalWidth * Math.abs(layer.transform.scaleX);
    case "text":
      return layer.data.width * Math.abs(layer.transform.scaleX);
    case "emoji":
      return layer.data.fontSize * Math.abs(layer.transform.scaleX);
    case "shape":
    case "blur":
    case "overlay":
      return layer.data.width * Math.abs(layer.transform.scaleX);
    case "brush": {
      const xs = layer.data.strokes.flatMap((s) => s.points.filter((_, i) => i % 2 === 0));
      if (!xs.length) return 1;
      return Math.max(...xs) - Math.min(...xs) + 1;
    }
    default:
      return 100;
  }
}

function getLayerHeight(layer: EditorLayer): number {
  switch (layer.type) {
    case "background":
    case "image":
      return layer.data.naturalHeight * Math.abs(layer.transform.scaleY);
    case "sticker":
      return layer.data.naturalHeight * Math.abs(layer.transform.scaleY);
    case "text":
      return layer.data.fontSize * layer.data.lineHeight * 3 * Math.abs(layer.transform.scaleY);
    case "emoji":
      return layer.data.fontSize * Math.abs(layer.transform.scaleY);
    case "shape":
    case "blur":
    case "overlay":
      return layer.data.height * Math.abs(layer.transform.scaleY);
    case "brush": {
      const ys = layer.data.strokes.flatMap((s) => s.points.filter((_, i) => i % 2 === 1));
      if (!ys.length) return 1;
      return Math.max(...ys) - Math.min(...ys) + 1;
    }
    default:
      return 100;
  }
}

export function snapPosition(
  layer: EditorLayer,
  project: EditorProject,
  x: number,
  y: number
): { x: number; y: number; guides: GuideLine[] } {
  if (!project.snapEnabled) return { x, y, guides: [] };
  const w = getLayerWidth(layer);
  const h = getLayerHeight(layer);
  const guides: GuideLine[] = [];
  let nx = x;
  let ny = y;

  const targetsX = [0, project.width / 2, project.width, project.crop.x, project.crop.x + project.crop.width];
  const targetsY = [0, project.height / 2, project.height, project.crop.y, project.crop.y + project.crop.height];
  const pointsX = [nx, nx + w / 2, nx + w];
  const pointsY = [ny, ny + h / 2, ny + h];

  for (const tx of targetsX) {
    for (const px of pointsX) {
      if (Math.abs(px - tx) <= SNAP_THRESHOLD) {
        nx += tx - px;
        guides.push({ orientation: "v", position: tx });
        break;
      }
    }
  }
  for (const ty of targetsY) {
    for (const py of pointsY) {
      if (Math.abs(py - ty) <= SNAP_THRESHOLD) {
        ny += ty - py;
        guides.push({ orientation: "h", position: ty });
        break;
      }
    }
  }
  return { x: nx, y: ny, guides };
}

export type AlignMode = "left" | "right" | "top" | "bottom" | "center-h" | "center-v";

export function alignLayer(project: EditorProject, layerId: string, mode: AlignMode): EditorProject {
  const layer = project.layers.find((l) => l.id === layerId);
  if (!layer) return project;
  const b = getLayerBounds(layer, project);
  const { crop } = project;
  let x = layer.transform.x;
  let y = layer.transform.y;
  switch (mode) {
    case "left":
      x = crop.x;
      break;
    case "right":
      x = crop.x + crop.width - b.width;
      break;
    case "top":
      y = crop.y;
      break;
    case "bottom":
      y = crop.y + crop.height - b.height;
      break;
    case "center-h":
      x = crop.x + (crop.width - b.width) / 2;
      break;
    case "center-v":
      y = crop.y + (crop.height - b.height) / 2;
      break;
  }
  return {
    ...project,
    layers: project.layers.map((l) =>
      l.id === layerId ? { ...l, transform: { ...l.transform, x, y } } : l
    ),
  };
}

export function alignLayersToCanvas(project: EditorProject, layerIds: string[], mode: AlignMode): EditorProject {
  let next = project;
  for (const id of layerIds) next = alignLayer(next, id, mode);
  return next;
}
