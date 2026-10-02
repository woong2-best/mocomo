/** 알까기 보드 캔버스 렌더링 (바둑판 스타일) */

import { ALKKAGI_FRAME, ALKKAGI_GRID, ALKKAGI_STONE_R, powerColor } from "./alkkagi-physics";
import type { AlkkagiStone } from "./alkkagi-physics";

export type BoardLayout = {
  ox: number;
  oy: number;
  playW: number;
  playH: number;
  s: number;
  frame: number;
  cell: number;
};

export function computeBoardLayout(
  canvasW: number,
  canvasH: number,
  playW: number,
  playH: number
): BoardLayout {
  const totalW = playW + ALKKAGI_FRAME * 2;
  const totalH = playH + ALKKAGI_FRAME * 2;
  const s = Math.min(canvasW / totalW, canvasH / totalH);
  const frame = ALKKAGI_FRAME * s;
  const pw = playW * s;
  const ph = playH * s;
  const ox = (canvasW - pw - frame * 2) / 2 + frame;
  const oy = (canvasH - ph - frame * 2) / 2 + frame;
  const cell = pw / (ALKKAGI_GRID - 1);
  return { ox, oy, playW: pw, playH: ph, s, frame, cell };
}

function woodGradient(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, "#e8c98a");
  g.addColorStop(0.35, "#dcb76a");
  g.addColorStop(0.65, "#c9a052");
  g.addColorStop(1, "#b8893f");
  return g;
}

function drawWoodGrain(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = "#5c3a12";
  for (let i = 0; i < 28; i++) {
    const yy = y + (h / 28) * i + Math.sin(i * 0.7) * 3;
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.bezierCurveTo(x + w * 0.3, yy + 2, x + w * 0.7, yy - 2, x + w, yy + 1);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawAlkkagiBoardSurface(
  ctx: CanvasRenderingContext2D,
  layout: BoardLayout,
  playW: number,
  playH: number
) {
  const { ox, oy, playW: pw, playH: ph, s, frame, cell } = layout;
  const outerX = ox - frame;
  const outerY = oy - frame;
  const outerW = pw + frame * 2;
  const outerH = ph + frame * 2;

  // drop shadow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 18 * s;
  ctx.shadowOffsetY = 8 * s;
  ctx.fillStyle = "#3d2810";
  ctx.beginPath();
  ctx.roundRect(outerX, outerY, outerW, outerH, 6 * s);
  ctx.fill();
  ctx.restore();

  // outer frame (dark wood)
  const frameGrad = ctx.createLinearGradient(outerX, outerY, outerX + outerW, outerY + outerH);
  frameGrad.addColorStop(0, "#6b4423");
  frameGrad.addColorStop(0.5, "#4a2f18");
  frameGrad.addColorStop(1, "#3a2412");
  ctx.fillStyle = frameGrad;
  ctx.beginPath();
  ctx.roundRect(outerX, outerY, outerW, outerH, 6 * s);
  ctx.fill();

  // inner bevel
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(outerX + 2, outerY + 2, outerW - 4, outerH - 4, 4 * s);
  ctx.stroke();

  // play surface
  ctx.fillStyle = woodGradient(ctx, ox, oy, pw, ph);
  ctx.fillRect(ox, oy, pw, ph);
  drawWoodGrain(ctx, ox, oy, pw, ph);

  // grid
  ctx.strokeStyle = "rgba(20,12,4,0.88)";
  ctx.lineWidth = Math.max(1, s * 0.9);
  for (let i = 0; i < ALKKAGI_GRID; i++) {
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

  // star points (4-4, 4-10, 4-16 in 1-indexed → 3, 9, 15)
  const stars = [3, 9, 15];
  ctx.fillStyle = "rgba(20,12,4,0.9)";
  for (const sy of stars) {
    for (const sx of stars) {
      ctx.beginPath();
      ctx.arc(ox + sx * cell, oy + sy * cell, Math.max(2.5, 3.5 * s), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // coordinate labels
  ctx.fillStyle = "rgba(40,25,10,0.55)";
  ctx.font = `${Math.max(9, 10 * s)}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < ALKKAGI_GRID; i++) {
    const gx = ox + i * cell;
    if (i % 2 === 0 || i === 0 || i === ALKKAGI_GRID - 1) {
      ctx.fillText(String(i + 1), gx, oy - frame * 0.45);
    }
  }
  ctx.textAlign = "right";
  for (let i = 0; i < ALKKAGI_GRID; i++) {
    const gy = oy + i * cell;
    const letter = String.fromCharCode(65 + i);
    if (i % 2 === 0 || i === 0 || i === ALKKAGI_GRID - 1) {
      ctx.fillText(letter, ox - frame * 0.22, gy);
    }
  }

  // play boundary (subtle — stones fall past this edge)
  ctx.strokeStyle = "rgba(180,120,40,0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(ox, oy, pw, ph);

  void playW;
  void playH;
}

export function drawGoStone(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  r: number,
  black: boolean,
  selected: boolean,
  alpha = 1
) {
  ctx.save();
  ctx.globalAlpha = alpha;

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(sx + r * 0.12, sy + r * 0.18, r * 0.95, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  const grad = ctx.createRadialGradient(
    sx - r * 0.35,
    sy - r * 0.35,
    r * 0.1,
    sx,
    sy,
    r
  );
  if (black) {
    grad.addColorStop(0, "#4a4a4a");
    grad.addColorStop(0.45, "#1a1a1a");
    grad.addColorStop(1, "#050505");
  } else {
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.5, "#ececec");
    grad.addColorStop(1, "#b8b8b8");
  }

  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = black ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // highlight
  ctx.fillStyle = black ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.65)";
  ctx.beginPath();
  ctx.arc(sx - r * 0.28, sy - r * 0.28, r * 0.22, 0, Math.PI * 2);
  ctx.fill();

  if (selected) {
    ctx.strokeStyle = "#e07a5f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx, sy, r + 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawRubberBand(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  pullDist: number,
  angle: number,
  power: number
) {
  const bandEndX = sx - Math.cos(angle) * pullDist;
  const bandEndY = sy - Math.sin(angle) * pullDist;
  const color = powerColor(power);

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(bandEndX, bandEndY);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(bandEndX, bandEndY, 5, 0, Math.PI * 2);
  ctx.fill();

  const arrowLen = 24 + power * 40;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx + Math.cos(angle) * arrowLen, sy + Math.sin(angle) * arrowLen);
  ctx.stroke();
}

export function stoneScreenPos(stone: AlkkagiStone, layout: BoardLayout) {
  return {
    x: layout.ox + stone.x * layout.s,
    y: layout.oy + stone.y * layout.s,
    r: ALKKAGI_STONE_R * layout.s,
  };
}
