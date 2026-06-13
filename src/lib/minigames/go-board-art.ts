/** 오목·바둑판 공용 캔버스 렌더링 */

import { drawGoStone } from "./alkkagi-board-art";
import { OMOK_BOARD_SIZE } from "./omok-logic";

export const GO_BOARD_FRAME = 36;
export const OMOK_CELL = 28;
export const OMOK_PLAY_SIZE = OMOK_CELL * (OMOK_BOARD_SIZE - 1);
export const OMOK_CANVAS_SIZE = OMOK_PLAY_SIZE + GO_BOARD_FRAME * 2;

export type GoBoardLayout = {
  ox: number;
  oy: number;
  playW: number;
  playH: number;
  s: number;
  frame: number;
  cell: number;
  grid: number;
};

export function computeGoBoardLayout(
  canvasW: number,
  canvasH: number,
  grid = OMOK_BOARD_SIZE,
  playSize = OMOK_PLAY_SIZE
): GoBoardLayout {
  const total = playSize + GO_BOARD_FRAME * 2;
  const s = Math.min(canvasW / total, canvasH / total);
  const frame = GO_BOARD_FRAME * s;
  const pw = playSize * s;
  const ph = playSize * s;
  const ox = (canvasW - pw - frame * 2) / 2 + frame;
  const oy = (canvasH - ph - frame * 2) / 2 + frame;
  const cell = pw / (grid - 1);
  return { ox, oy, playW: pw, playH: ph, s, frame, cell, grid };
}

function woodGradient(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, "#e8c98a");
  g.addColorStop(0.35, "#dcb76a");
  g.addColorStop(0.65, "#c9a052");
  g.addColorStop(1, "#b8893f");
  return g;
}

export function drawGoBoardSurface(ctx: CanvasRenderingContext2D, layout: GoBoardLayout) {
  const { ox, oy, playW: pw, playH: ph, s, frame, cell, grid } = layout;
  const outerX = ox - frame;
  const outerY = oy - frame;
  const outerW = pw + frame * 2;
  const outerH = ph + frame * 2;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 16 * s;
  ctx.shadowOffsetY = 6 * s;
  ctx.fillStyle = "#3d2810";
  ctx.beginPath();
  ctx.roundRect(outerX, outerY, outerW, outerH, 6 * s);
  ctx.fill();
  ctx.restore();

  const frameGrad = ctx.createLinearGradient(outerX, outerY, outerX + outerW, outerY + outerH);
  frameGrad.addColorStop(0, "#6b4423");
  frameGrad.addColorStop(0.5, "#4a2f18");
  frameGrad.addColorStop(1, "#3a2412");
  ctx.fillStyle = frameGrad;
  ctx.beginPath();
  ctx.roundRect(outerX, outerY, outerW, outerH, 6 * s);
  ctx.fill();

  ctx.fillStyle = woodGradient(ctx, ox, oy, pw, ph);
  ctx.fillRect(ox, oy, pw, ph);

  ctx.strokeStyle = "rgba(20,12,4,0.88)";
  ctx.lineWidth = Math.max(1, s * 0.85);
  for (let i = 0; i < grid; i++) {
    const gx = ox + i * cell;
    const gy = oy + i * cell;
    ctx.beginPath();
    ctx.moveTo(gx, oy);
    ctx.lineTo(gx, oy + ph);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox, gy);
    ctx.lineTo(ox + pw, gy);
    ctx.stroke();
  }

  const starSets: Record<number, [number, number][]> = {
    19: [
      [3, 3], [9, 3], [15, 3], [3, 9], [9, 9], [15, 9], [3, 15], [9, 15], [15, 15],
    ],
    15: [
      [3, 3], [7, 3], [11, 3], [3, 7], [7, 7], [11, 7], [3, 11], [7, 11], [11, 11],
    ],
    13: [
      [3, 3], [9, 3], [6, 6], [3, 9], [9, 9],
    ],
    9: [
      [2, 2], [6, 2], [4, 4], [2, 6], [6, 6],
    ],
  };
  const stars = starSets[grid];
  if (stars) {
    ctx.fillStyle = "rgba(20,12,4,0.85)";
    for (const [sx, sy] of stars) {
      ctx.beginPath();
      ctx.arc(ox + sx * cell, oy + sy * cell, Math.max(2, 2.8 * s), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(40,25,10,0.5)";
  ctx.font = `${Math.max(8, 9 * s)}px Georgia, serif`;
  for (let i = 0; i < grid; i += 2) {
    ctx.fillText(String(i + 1), ox + i * cell, oy - frame * 0.42);
    ctx.fillText(String.fromCharCode(65 + i), ox - frame * 0.2, oy + i * cell);
  }
}

export function cellCenter(layout: GoBoardLayout, x: number, y: number) {
  return { cx: layout.ox + x * layout.cell, cy: layout.oy + y * layout.cell };
}

export function boardToCell(
  layout: GoBoardLayout,
  sx: number,
  sy: number
): { x: number; y: number } | null {
  const x = Math.round((sx - layout.ox) / layout.cell);
  const y = Math.round((sy - layout.oy) / layout.cell);
  if (x < 0 || x >= layout.grid || y < 0 || y >= layout.grid) return null;
  return { x, y };
}

export function drawBoardStone(
  ctx: CanvasRenderingContext2D,
  layout: GoBoardLayout,
  x: number,
  y: number,
  black: boolean,
  opts?: { preview?: boolean; last?: boolean; win?: boolean; alpha?: number }
) {
  const { cx, cy } = cellCenter(layout, x, y);
  const r = layout.cell * 0.42;
  if (opts?.win) {
    ctx.save();
    ctx.strokeStyle = "rgba(224,122,95,0.9)";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#e07a5f";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (opts?.last) {
    ctx.save();
    ctx.strokeStyle = "#e07a5f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (opts?.preview) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    drawGoStone(ctx, cx, cy - layout.cell * 0.08, r, black, false);
    ctx.restore();
    return;
  }
  drawGoStone(ctx, cx, cy, r, black, false, opts?.alpha ?? 1);
}

export function drawWinLine(
  ctx: CanvasRenderingContext2D,
  layout: GoBoardLayout,
  line: { x: number; y: number }[]
) {
  if (line.length < 2) return;
  ctx.save();
  ctx.strokeStyle = "rgba(224,122,95,0.95)";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.shadowColor = "#e07a5f";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  const first = cellCenter(layout, line[0]!.x, line[0]!.y);
  ctx.moveTo(first.cx, first.cy);
  for (let i = 1; i < line.length; i++) {
    const p = cellCenter(layout, line[i]!.x, line[i]!.y);
    ctx.lineTo(p.cx, p.cy);
  }
  ctx.stroke();
  ctx.restore();
}
