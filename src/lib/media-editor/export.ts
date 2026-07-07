import type Konva from "konva";
import type { CropRect, EditorProject } from "@/lib/media-editor/types";
import { loadHtmlImage } from "@/lib/media-editor/load-image";

export async function exportStageToBlob(
  project: EditorProject,
  overlayNode: Konva.Node,
  crop: CropRect,
  opts: {
    mimeType: "image/jpeg" | "image/png" | "image/webp";
    quality?: number;
    maxWidth: number;
    maxHeight: number;
  }
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(crop.width);
  canvas.height = Math.round(crop.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const bg = project.layers.find((l) => l.type === "background");
  if (bg && bg.type === "background") {
    const img = await loadHtmlImage(bg.data.src);
    const { transform, data } = bg;
    ctx.save();
    ctx.translate(-crop.x, -crop.y);
    ctx.translate(transform.x, transform.y);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.scale(
      transform.scaleX * (data.flipX ? -1 : 1),
      transform.scaleY * (data.flipY ? -1 : 1)
    );
    ctx.drawImage(img, 0, 0, data.naturalWidth, data.naturalHeight);
    ctx.restore();
  }

  const overlayCanvas = overlayNode.toCanvas({
    x: crop.x,
    y: crop.y,
    width: crop.width,
    height: crop.height,
    pixelRatio: 1,
  });
  ctx.drawImage(overlayCanvas, 0, 0);

  let { width, height } = canvas;
  const scale = Math.min(1, opts.maxWidth / width, opts.maxHeight / height);
  if (scale < 1) {
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    const out = document.createElement("canvas");
    out.width = width;
    out.height = height;
    const outCtx = out.getContext("2d");
    if (!outCtx) throw new Error("Canvas not supported");
    outCtx.drawImage(canvas, 0, 0, width, height);
    return canvasToBlob(out, opts.mimeType, opts.quality ?? 0.92);
  }

  return canvasToBlob(canvas, opts.mimeType, opts.quality ?? 0.92);
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: "image/jpeg" | "image/png" | "image/webp",
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("이미지보내기에 실패했습니다."))),
      mimeType,
      quality
    );
  });
}

export function projectToJson(project: EditorProject): string {
  return JSON.stringify(project);
}
