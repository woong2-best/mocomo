import type { StudioBrushPreset, StudioToolId } from "@/lib/webtoon-studio/types";

export type BrushRuntime = Pick<
  StudioBrushPreset,
  "size" | "opacity" | "spacing" | "hardness" | "pressure" | "stabilization" | "tool"
>;

function hexToRgba(hex: string, alpha: number): [number, number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, Math.round(alpha * 255)];
}

function pressureSize(base: number, pressure: number, enabled: boolean) {
  const p = enabled ? pressure : 1;
  return base * (0.25 + 0.75 * Math.pow(p, 1.4));
}

export function applyBrushStyle(
  ctx: CanvasRenderingContext2D,
  tool: StudioToolId,
  color: string,
  brush: BrushRuntime,
  pressure: number
) {
  const alpha = brush.opacity / 100;
  const w = pressureSize(brush.size, pressure, brush.pressure);

  if (tool === "eraser" || tool === "selectBrush") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = `rgba(0,0,0,${alpha})`;
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.lineWidth = w * 1.2;
  } else {
    ctx.globalCompositeOperation = "source-over";
    const rgba = hexToRgba(color, alpha);
    const stroke = `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3] / 255})`;
    ctx.strokeStyle = stroke;
    ctx.fillStyle = stroke;
    if (tool === "airbrush" || tool === "watercolor" || tool === "pastel") {
      ctx.lineWidth = w * 2;
      ctx.globalAlpha = alpha * 0.35;
    } else if (tool === "pencil") {
      ctx.lineWidth = w * 0.65;
      ctx.globalAlpha = alpha * 0.7;
    } else if (tool === "gpen" || tool === "mappingPen" || tool === "ink") {
      ctx.lineWidth = w * 1.05;
      ctx.globalAlpha = alpha;
    } else if (tool === "blurBrush") {
      ctx.filter = "blur(2px)";
      ctx.lineWidth = w;
      ctx.globalAlpha = alpha * 0.5;
    } else {
      ctx.lineWidth = w;
      ctx.globalAlpha = alpha;
    }
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

export function resetBrushStyle(ctx: CanvasRenderingContext2D) {
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.filter = "none";
}

export function drawBrushDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tool: StudioToolId,
  color: string,
  brush: BrushRuntime,
  pressure: number
) {
  applyBrushStyle(ctx, tool, color, brush, pressure);
  const w = pressureSize(brush.size, pressure, brush.pressure);
  ctx.beginPath();
  ctx.arc(x, y, w / 2, 0, Math.PI * 2);
  ctx.fill();
  resetBrushStyle(ctx);
}

export function drawBrushLine(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  tool: StudioToolId,
  color: string,
  brush: BrushRuntime,
  pressure: number
) {
  applyBrushStyle(ctx, tool, color, brush, pressure);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  resetBrushStyle(ctx);
}

export function stabilizePoint(
  history: { x: number; y: number }[],
  x: number,
  y: number,
  level: number
) {
  if (level <= 0) return { x, y };
  const slice = history.slice(-level);
  slice.push({ x, y });
  const sx = slice.reduce((a, p) => a + p.x, 0) / slice.length;
  const sy = slice.reduce((a, p) => a + p.y, 0) / slice.length;
  return { x: sx, y: sy };
}

export function isDrawingTool(tool: StudioToolId) {
  return ![
    "eyedropper",
    "fill",
    "bucket",
    "rectSelect",
    "ellipseSelect",
    "lassoSelect",
    "move",
    "text",
    "speechBubble",
    "speedLines",
    "ruler",
  ].includes(tool);
}
