"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SpotShape } from "@/lib/minigames/spot-diff-logic";
import { cn } from "@/lib/utils";

type FoundMark = { x: number; y: number; radius: number; foundBy?: string };

type Props = {
  width: number;
  height: number;
  left: SpotShape[];
  right: SpotShape[];
  found: FoundMark[];
  hintFlash?: { x: number; y: number } | null;
  disabled?: boolean;
  placing?: boolean;
  onTap: (side: "left" | "right", x: number, y: number) => void;
};

function drawShape(ctx: CanvasRenderingContext2D, s: SpotShape) {
  ctx.save();
  if (s.kind === "rect" && s.rot) {
    ctx.translate(s.x + s.w / 2, s.y + s.h / 2);
    ctx.rotate((s.rot * Math.PI) / 180);
    ctx.fillStyle = s.fill;
    ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
    if (s.stroke) {
      ctx.strokeStyle = s.stroke;
      ctx.strokeRect(-s.w / 2, -s.h / 2, s.w, s.h);
    }
    ctx.restore();
    return;
  }

  if (s.kind === "circle") {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = s.fill;
    ctx.fill();
    if (s.stroke) {
      ctx.strokeStyle = s.stroke;
      ctx.stroke();
    }
  } else if (s.kind === "rect") {
    ctx.fillStyle = s.fill;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    if (s.stroke) {
      ctx.strokeStyle = s.stroke;
      ctx.strokeRect(s.x, s.y, s.w, s.h);
    }
  } else if (s.kind === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, s.rx, s.ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = s.fill;
    ctx.fill();
    if (s.stroke) {
      ctx.strokeStyle = s.stroke;
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  shapes: SpotShape[],
  found: FoundMark[],
  hintFlash: { x: number; y: number } | null | undefined,
  w: number,
  h: number
) {
  ctx.clearRect(0, 0, w, h);
  for (const s of shapes) drawShape(ctx, s);

  for (const f of found) {
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "rgba(34,197,94,0.15)";
    ctx.fill();
  }

  if (hintFlash) {
    ctx.beginPath();
    ctx.arc(hintFlash.x, hintFlash.y, 32, 0, Math.PI * 2);
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(245,158,11,0.2)";
    ctx.fill();
  }
}

function SceneCanvas({
  shapes,
  found,
  hintFlash,
  width,
  height,
  disabled,
  placing,
  side,
  onTap,
}: {
  shapes: SpotShape[];
  found: FoundMark[];
  hintFlash?: { x: number; y: number } | null;
  width: number;
  height: number;
  disabled?: boolean;
  placing?: boolean;
  side: "left" | "right";
  onTap: (side: "left" | "right", x: number, y: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = wrap.getBoundingClientRect();
    const cssW = rect.width;
    const cssH = (height / width) * cssW;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.scale(cssW / width, cssH / height);
    drawScene(ctx, shapes, found, hintFlash, width, height);
  }, [found, height, hintFlash, shapes, width]);

  useEffect(() => {
    draw();
    const ro = new ResizeObserver(draw);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [draw]);

  function pointerToLogical(e: React.PointerEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;
    if (x < 0 || y < 0 || x > width || y > height) return null;
    return { x, y };
  }

  return (
    <div ref={wrapRef} className="w-full touch-none select-none">
      <canvas
        ref={canvasRef}
        className={cn(
          "w-full rounded-xl ring-1 ring-black/15 shadow-md",
          !disabled && !placing && "cursor-crosshair"
        )}
        onPointerDown={(e) => {
          if (disabled || placing) return;
          const p = pointerToLogical(e);
          if (!p) return;
          onTap(side, p.x, p.y);
        }}
      />
    </div>
  );
}

export function SpotDiffBoard({
  width,
  height,
  left,
  right,
  found,
  hintFlash,
  disabled,
  placing,
  onTap,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground px-1">
        <span>좌·우 그림 모두 클릭 가능</span>
        <div className="flex gap-1">
          <button
            type="button"
            className="px-2 py-1 rounded border hover:bg-muted"
            onClick={() => {
              setZoom((z) => Math.min(2.5, z + 0.25));
            }}
          >
            +
          </button>
          <button
            type="button"
            className="px-2 py-1 rounded border hover:bg-muted"
            onClick={() => {
              setZoom((z) => Math.max(1, z - 0.25));
              if (zoom <= 1.25) setPan({ x: 0, y: 0 });
            }}
          >
            −
          </button>
          <button
            type="button"
            className="px-2 py-1 rounded border hover:bg-muted"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-xl border bg-muted/20"
        onPointerDown={(e) => {
          if (e.pointerType !== "touch" || zoom <= 1) return;
          // pan with one finger when zoomed — handled on move
        }}
        onTouchStart={(e) => {
          if (e.touches.length === 2) {
            const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
            const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
            pinchRef.current = { dist: Math.hypot(dx, dy), zoom };
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 2 && pinchRef.current) {
            const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
            const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
            const dist = Math.hypot(dx, dy);
            const next = pinchRef.current.zoom * (dist / pinchRef.current.dist);
            setZoom(Math.min(2.5, Math.max(1, next)));
          }
        }}
        onTouchEnd={() => {
          pinchRef.current = null;
        }}
      >
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 origin-center transition-transform"
          style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
        >
          <div>
            <p className="text-[10px] font-medium text-center mb-1 text-muted-foreground">왼쪽</p>
            <SceneCanvas
              shapes={left}
              found={found}
              hintFlash={hintFlash}
              width={width}
              height={height}
              disabled={disabled}
              placing={placing}
              side="left"
              onTap={onTap}
            />
          </div>
          <div>
            <p className="text-[10px] font-medium text-center mb-1 text-muted-foreground">오른쪽</p>
            <SceneCanvas
              shapes={right}
              found={found}
              hintFlash={hintFlash}
              width={width}
              height={height}
              disabled={disabled}
              placing={placing}
              side="right"
              onTap={onTap}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
