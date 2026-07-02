import type { WatermarkOptions } from "@/lib/media-watermark";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function drawDiagonalWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  label: string
): void {
  const short = Math.min(width, height);
  const fontSize = Math.max(14, Math.round(short * 0.032));
  const tileSize = Math.max(11, Math.round(fontSize * 0.72));

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 7.5);
  ctx.font = `600 ${tileSize}px system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = "middle";
  const stepY = Math.max(110, Math.round(short * 0.26));
  const stepX = Math.round(stepY * 1.55);
  for (let y = -height; y < height * 1.5; y += stepY) {
    for (let x = -width; x < width * 1.5; x += stepX) {
      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.lineWidth = 0.8;
      ctx.strokeText(label, x, y);
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fillText(label, x, y);
    }
  }
  ctx.restore();
}

export function drawCornerWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  label: string
): void {
  const short = Math.min(width, height);
  const fontSize = Math.max(14, Math.round(short * 0.032));
  const pad = Math.round(fontSize * 0.55);

  ctx.save();
  ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
  const textW = ctx.measureText(label).width;
  const boxW = Math.min(width * 0.72, textW + pad * 2);
  const boxH = fontSize + pad * 1.2;
  const x = width - boxW - pad;
  const y = height - boxH - pad;
  ctx.fillStyle = "rgba(0,0,0,0.58)";
  roundRect(ctx, x, y, boxW, boxH, 8);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + pad, y + boxH / 2);
  ctx.restore();
}

/** 캔버스 위에 선택한 워터마크 합성 */
export function drawCreditWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  label: string,
  options: WatermarkOptions
): void {
  if (options.diagonal) drawDiagonalWatermark(ctx, width, height, label);
  if (options.corner) drawCornerWatermark(ctx, width, height, label);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("이미지 인코딩에 실패했습니다."))),
      type,
      quality
    );
  });
}

/** 브라우저에서 이미지에 크레딧 라벨 합성 */
export async function applyImageWatermarkBlob(
  blob: Blob,
  label: string,
  options: WatermarkOptions
): Promise<Blob> {
  if (blob.type === "image/gif") return blob;
  if (!options.diagonal && !options.corner) return blob;

  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas를 사용할 수 없습니다.");
  }

  ctx.drawImage(bitmap, 0, 0);
  drawCreditWatermark(ctx, canvas.width, canvas.height, label, options);
  bitmap.close();

  const mime =
    blob.type === "image/png"
      ? "image/png"
      : blob.type === "image/webp"
        ? "image/webp"
        : "image/jpeg";
  const out = await canvasToBlob(canvas, mime, mime === "image/jpeg" ? 0.92 : undefined);
  return out;
}
