import { buildVideoCssFilter } from "@/lib/video-editor/filters";
import type { VideoEditState, VideoSticker } from "@/lib/video-editor/types";

export type OutputDimensions = {
  width: number;
  height: number;
  /** source crop rect in video pixel space (before rotation) */
  cropSx: number;
  cropSy: number;
  cropSw: number;
  cropSh: number;
};

export function computeOutputDimensions(
  videoW: number,
  videoH: number,
  rotation: VideoEditState["rotation"],
  cropAspect?: number
): OutputDimensions {
  const rotW = rotation === 90 || rotation === 270 ? videoH : videoW;
  const rotH = rotation === 90 || rotation === 270 ? videoW : videoH;

  if (!cropAspect || cropAspect <= 0) {
    return {
      width: rotW,
      height: rotH,
      cropSx: 0,
      cropSy: 0,
      cropSw: videoW,
      cropSh: videoH,
    };
  }

  let outW: number;
  let outH: number;
  if (rotW / rotH > cropAspect) {
    outH = rotH;
    outW = rotH * cropAspect;
  } else {
    outW = rotW;
    outH = rotW / cropAspect;
  }

  const cropRotW = outW;
  const cropRotH = outH;
  const cropRotX = (rotW - cropRotW) / 2;
  const cropRotY = (rotH - cropRotH) / 2;

  // map back to unrotated video source rect (center crop)
  let cropSx: number;
  let cropSy: number;
  let cropSw: number;
  let cropSh: number;

  if (rotation === 0) {
    cropSx = cropRotX;
    cropSy = cropRotY;
    cropSw = cropRotW;
    cropSh = cropRotH;
  } else if (rotation === 180) {
    cropSx = rotW - cropRotX - cropRotW;
    cropSy = rotH - cropRotY - cropRotH;
    cropSw = cropRotW;
    cropSh = cropRotH;
  } else if (rotation === 90) {
    cropSx = cropRotY;
    cropSy = rotW - cropRotX - cropRotW;
    cropSw = cropRotH;
    cropSh = cropRotW;
  } else {
    cropSx = rotH - cropRotY - cropRotH;
    cropSy = cropRotX;
    cropSw = cropRotH;
    cropSh = cropRotW;
  }

  return {
    width: Math.max(2, Math.round(outW)),
    height: Math.max(2, Math.round(outH)),
    cropSx: Math.max(0, cropSx),
    cropSy: Math.max(0, cropSy),
    cropSw: Math.min(videoW, cropSw),
    cropSh: Math.min(videoH, cropSh),
  };
}

function drawStickers(
  ctx: CanvasRenderingContext2D,
  stickers: VideoSticker[],
  width: number,
  height: number
) {
  for (const s of stickers) {
    const size = Math.max(18, Math.round(Math.min(width, height) * 0.1 * s.scale));
    ctx.save();
    ctx.font = `${size}px system-ui, Apple Color Emoji, Segoe UI Emoji, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.content, s.x * width, s.y * height);
    ctx.restore();
  }
}

/** 단일 프레임을 편집 상태에 맞게 캔버스에 그린다 */
export function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  edit: VideoEditState,
  dims: OutputDimensions
) {
  const { width, height, cropSx, cropSy, cropSw, cropSh } = dims;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  const filter = buildVideoCssFilter(
    edit.filterId,
    edit.brightness,
    edit.contrast,
    edit.saturation
  );

  ctx.save();
  ctx.filter = filter || "none";
  ctx.translate(width / 2, height / 2);
  ctx.rotate((edit.rotation * Math.PI) / 180);
  ctx.scale(edit.flipX ? -1 : 1, edit.flipY ? -1 : 1);

  const drawW = edit.rotation === 90 || edit.rotation === 270 ? height : width;
  const drawH = edit.rotation === 90 || edit.rotation === 270 ? width : height;

  ctx.drawImage(
    video,
    cropSx,
    cropSy,
    cropSw,
    cropSh,
    -drawW / 2,
    -drawH / 2,
    drawW,
    drawH
  );
  ctx.restore();

  drawStickers(ctx, edit.stickers, width, height);
}
