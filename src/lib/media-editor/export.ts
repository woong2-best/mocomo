import type Konva from "konva";
import type { CropRect, EditorProject } from "@/lib/media-editor/types";

export async function exportStageToBlob(
  stage: Konva.Stage,
  crop: CropRect,
  opts: {
    mimeType: "image/jpeg" | "image/png";
    quality?: number;
    maxWidth: number;
    maxHeight: number;
  }
): Promise<Blob> {
  const pixelRatio = 1;
  const canvas = stage.toCanvas({
    x: crop.x,
    y: crop.y,
    width: crop.width,
    height: crop.height,
    pixelRatio,
  });

  let { width, height } = canvas;
  const scale = Math.min(1, opts.maxWidth / width, opts.maxHeight / height);
  if (scale < 1) {
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    const out = document.createElement("canvas");
    out.width = width;
    out.height = height;
    const ctx = out.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(canvas, 0, 0, width, height);
    return canvasToBlob(out, opts.mimeType, opts.quality ?? 0.92);
  }

  return canvasToBlob(canvas, opts.mimeType, opts.quality ?? 0.92);
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: "image/jpeg" | "image/png",
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
