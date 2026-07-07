import type Konva from "konva";
import type { CropRect, EditorProject } from "@/lib/media-editor/types";

/**
 * 편집기 콘텐츠(배경 + 오버레이)를 원본 해상도로 내보낸다.
 *
 * `contentNode`는 화면에 축소(viewportZoom)되어 그려진 Konva 그룹이므로,
 * crop 영역을 화면 절대 픽셀 좌표로 변환하고 pixelRatio 로 원본 해상도를 복원한다.
 */
export async function exportStageToBlob(
  project: EditorProject,
  contentNode: Konva.Node,
  crop: CropRect,
  opts: {
    mimeType: "image/jpeg" | "image/png" | "image/webp";
    quality?: number;
    maxWidth: number;
    maxHeight: number;
    viewportOffset: { x: number; y: number };
    viewportZoom: number;
  }
): Promise<Blob> {
  void project;
  const zoom = opts.viewportZoom > 0 ? opts.viewportZoom : 1;

  // Konva toCanvas 의 x/y/width/height 는 스테이지 절대 픽셀 좌표계,
  // pixelRatio 는 출력 캔버스 해상도 배율. pixelRatio=1/zoom 이면 원본 크기 복원.
  const rendered = (contentNode as Konva.Group).toCanvas({
    x: opts.viewportOffset.x + crop.x * zoom,
    y: opts.viewportOffset.y + crop.y * zoom,
    width: Math.max(1, crop.width * zoom),
    height: Math.max(1, crop.height * zoom),
    pixelRatio: 1 / zoom,
    imageSmoothingEnabled: true,
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(crop.width));
  canvas.height = Math.max(1, Math.round(crop.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(rendered, 0, 0, canvas.width, canvas.height);

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
