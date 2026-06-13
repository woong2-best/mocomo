/** 장기판 캔버스 렌더링 */

import {
  JANGGI_H,
  JANGGI_W,
  type JanggiBoard,
  type JanggiCoord,
  type JanggiMove,
  type JanggiPiece,
  isRedPiece,
  janggiPieceLabel,
} from "./janggi-logic";

export const JANGGI_CANVAS_SIZE = 420;

export type JanggiLayout = {
  pad: number;
  cellW: number;
  cellH: number;
  width: number;
  height: number;
  pointX: (x: number) => number;
  pointY: (y: number) => number;
};

export function computeJanggiLayout(cssW: number, cssH: number): JanggiLayout {
  const pad = Math.min(cssW, cssH) * 0.06;
  const innerW = cssW - pad * 2;
  const innerH = cssH - pad * 2;
  const cellW = innerW / (JANGGI_W - 1);
  const cellH = innerH / (JANGGI_H - 1);
  return {
    pad,
    cellW,
    cellH,
    width: cssW,
    height: cssH,
    pointX: (x) => pad + x * cellW,
    pointY: (y) => pad + y * cellH,
  };
}

function drawPalace(ctx: CanvasRenderingContext2D, layout: JanggiLayout, yStart: number) {
  const x0 = 3;
  const x1 = 5;
  const y0 = yStart;
  const y1 = yStart + 2;
  const tl = { x: layout.pointX(x0), y: layout.pointY(y0) };
  const tr = { x: layout.pointX(x1), y: layout.pointY(y0) };
  const bl = { x: layout.pointX(x0), y: layout.pointY(y1) };
  const br = { x: layout.pointX(x1), y: layout.pointY(y1) };
  const mid = { x: layout.pointX(4), y: layout.pointY(yStart + 1) };

  ctx.strokeStyle = "rgba(120, 60, 30, 0.55)";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(tl.x, tl.y, tr.x - tl.x, bl.y - tl.y);
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y);
  ctx.lineTo(br.x, br.y);
  ctx.moveTo(tr.x, tr.y);
  ctx.lineTo(bl.x, bl.y);
  ctx.stroke();
  ctx.fillStyle = "rgba(180, 120, 60, 0.08)";
  ctx.fillRect(tl.x, tl.y, tr.x - tl.x, bl.y - tl.y);
}

export function drawJanggiBoardSurface(ctx: CanvasRenderingContext2D, layout: JanggiLayout) {
  ctx.strokeStyle = "rgba(90, 50, 25, 0.85)";
  ctx.lineWidth = 1.4;

  for (let y = 0; y < JANGGI_H; y++) {
    ctx.beginPath();
    ctx.moveTo(layout.pointX(0), layout.pointY(y));
    ctx.lineTo(layout.pointX(JANGGI_W - 1), layout.pointY(y));
    ctx.stroke();
  }
  for (let x = 0; x < JANGGI_W; x++) {
    ctx.beginPath();
    ctx.moveTo(layout.pointX(x), layout.pointY(0));
    ctx.lineTo(layout.pointX(x), layout.pointY(JANGGI_H - 1));
    ctx.stroke();
  }

  drawPalace(ctx, layout, 0);
  drawPalace(ctx, layout, 7);

  // 강 표시
  const riverY = layout.pointY(4.5);
  ctx.fillStyle = "rgba(70, 130, 180, 0.12)";
  ctx.fillRect(layout.pointX(0), riverY - layout.cellH * 0.45, layout.width - layout.pad * 2, layout.cellH * 0.9);
  ctx.fillStyle = "rgba(70, 100, 140, 0.35)";
  ctx.font = `${Math.max(10, layout.cellW * 0.22)}px serif`;
  ctx.textAlign = "center";
  ctx.fillText("楚 河 漢", layout.pointX(4), riverY + 4);
}

export function drawJanggiPiece(
  ctx: CanvasRenderingContext2D,
  layout: JanggiLayout,
  x: number,
  y: number,
  piece: JanggiPiece,
  opts?: { selected?: boolean; last?: boolean; check?: boolean }
) {
  const px = layout.pointX(x);
  const py = layout.pointY(y);
  const r = Math.min(layout.cellW, layout.cellH) * 0.38;
  const red = isRedPiece(piece);

  ctx.save();
  if (opts?.selected) {
    ctx.beginPath();
    ctx.arc(px, py, r + 5, 0, Math.PI * 2);
    ctx.strokeStyle = "#e85d04";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  if (opts?.last) {
    ctx.beginPath();
    ctx.arc(px, py, r + 3, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(46, 125, 50, 0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  if (opts?.check && pieceKind(piece) === "K") {
    ctx.beginPath();
    ctx.arc(px, py, r + 6, 0, Math.PI * 2);
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fillStyle = red ? "#fde8e8" : "#e8eef8";
  ctx.fill();
  ctx.strokeStyle = red ? "#b91c1c" : "#1d4ed8";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = red ? "#991b1b" : "#1e3a8a";
  ctx.font = `bold ${Math.max(12, r * 1.05)}px "Noto Serif KR", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(janggiPieceLabel(piece), px, py + 1);
  ctx.restore();
}

function pieceKind(p: JanggiPiece) {
  return p[1] ?? "";
}

export function drawMoveHint(
  ctx: CanvasRenderingContext2D,
  layout: JanggiLayout,
  x: number,
  y: number,
  capture?: boolean
) {
  const px = layout.pointX(x);
  const py = layout.pointY(y);
  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, capture ? 10 : 7, 0, Math.PI * 2);
  ctx.fillStyle = capture ? "rgba(220, 38, 38, 0.35)" : "rgba(34, 197, 94, 0.45)";
  ctx.fill();
  ctx.restore();
}

export function janggiCoordFromPointer(
  layout: JanggiLayout,
  clientX: number,
  clientY: number,
  rect: DOMRect
): JanggiCoord | null {
  const lx = clientX - rect.left;
  const ly = clientY - rect.top;
  const x = Math.round((lx - layout.pad) / layout.cellW);
  const y = Math.round((ly - layout.pad) / layout.cellH);
  if (x < 0 || x >= JANGGI_W || y < 0 || y >= JANGGI_H) return null;
  return { x, y };
}

export function drawJanggiScene(
  ctx: CanvasRenderingContext2D,
  layout: JanggiLayout,
  board: JanggiBoard,
  opts: {
    selected?: JanggiCoord | null;
    legalMoves?: JanggiCoord[];
    lastMove?: JanggiMove | null;
    checkKing?: JanggiCoord | null;
  }
) {
  const { selected, legalMoves = [], lastMove, checkKing } = opts;

  for (const m of legalMoves) {
    const target = board[m.y]?.[m.x];
    drawMoveHint(ctx, layout, m.x, m.y, !!target);
  }

  for (let y = 0; y < JANGGI_H; y++) {
    for (let x = 0; x < JANGGI_W; x++) {
      const piece = board[y]?.[x];
      if (!piece) continue;
      const isLastFrom = lastMove && lastMove.fromX === x && lastMove.fromY === y;
      const isLastTo = lastMove && lastMove.toX === x && lastMove.toY === y;
      const isCheck =
        checkKing && checkKing.x === x && checkKing.y === y && pieceKind(piece) === "K";
      drawJanggiPiece(ctx, layout, x, y, piece, {
        selected: selected?.x === x && selected?.y === y,
        last: !!(isLastFrom || isLastTo),
        check: !!isCheck,
      });
    }
  }
}
