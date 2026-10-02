"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SketchStroke } from "@/lib/sketch-quiz-types";
import { cn } from "@/lib/utils";

const COLORS = ["#1e3a5f", "#c45c3e", "#2d6a4f", "#5c4033", "#7b2cbf", "#000000"];
const WIDTHS = [3, 6, 10];

type SketchCanvasProps = {
  strokes: SketchStroke[];
  canDraw: boolean;
  onStroke: (stroke: SketchStroke) => void;
  onClear: () => void;
  className?: string;
};

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: SketchStroke,
  w: number,
  h: number
) {
  if (stroke.points.length < 2) return;
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width * Math.min(w, h) * 0.004;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  const [first, ...rest] = stroke.points;
  ctx.moveTo(first.x * w, first.y * h);
  for (const p of rest) {
    ctx.lineTo(p.x * w, p.y * h);
  }
  ctx.stroke();
}

export function SketchCanvas({
  strokes,
  canDraw,
  onStroke,
  onClear,
  className,
}: SketchCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [lineWidth, setLineWidth] = useState(WIDTHS[1]);
  const colorRef = useRef(COLORS[0]);
  const widthRef = useRef(WIDTHS[1]);
  const drawingRef = useRef(false);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const strokeIdRef = useRef(0);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fffef8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokes) {
      drawStroke(ctx, stroke, rect.width, rect.height);
    }
  }, [strokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [redraw]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const normPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  };

  const finishStroke = () => {
    if (pointsRef.current.length < 2) {
      pointsRef.current = [];
      drawingRef.current = false;
      return;
    }
    const stroke: SketchStroke = {
      id: `${Date.now()}-${strokeIdRef.current++}`,
      points: [...pointsRef.current],
      color: colorRef.current,
      width: widthRef.current,
    };
    onStroke(stroke);
    pointsRef.current = [];
    drawingRef.current = false;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!canDraw) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    pointsRef.current = [normPoint(e.clientX, e.clientY)];
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!canDraw || !drawingRef.current) return;
    e.preventDefault();
    pointsRef.current.push(normPoint(e.clientX, e.clientY));
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const pts = pointsRef.current;
    if (pts.length < 2) return;
    const stroke: SketchStroke = {
      id: "preview",
      points: pts.slice(-2),
      color: colorRef.current,
      width: widthRef.current,
    };
    drawStroke(ctx, stroke, rect.width, rect.height);
  };

  const onPointerUp = () => {
    if (!drawingRef.current) return;
    finishStroke();
    redraw();
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {canDraw && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={cn(
                  "h-7 w-7 rounded-full border-2",
                  color === c ? "border-folk-cobalt scale-110" : "border-transparent"
                )}
                style={{ backgroundColor: c }}
                onClick={() => {
                  setColor(c);
                  colorRef.current = c;
                }}
                aria-label={`색 ${c}`}
              />
            ))}
          </div>
          <div className="flex gap-1">
            {WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                className={cn(
                  "h-8 px-2 rounded-lg border-2 text-xs font-medium",
                  lineWidth === w
                    ? "border-folk-terracotta bg-folk-gold/20"
                    : "border-folk-cobalt/20"
                )}
                onClick={() => {
                  setLineWidth(w);
                  widthRef.current = w;
                }}
              >
                {w === 3 ? "가늘게" : w === 6 ? "보통" : "굵게"}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="text-xs px-3 py-1.5 rounded-lg border-2 border-folk-cobalt/25 hover:bg-muted"
            onClick={onClear}
          >
            전체 지우기
          </button>
        </div>
      )}
      <div className="relative rounded-xl border-2 border-folk-cobalt/25 overflow-hidden bg-[#fffef8] shadow-folk-sm aspect-[4/3] touch-none">
        <canvas
          ref={canvasRef}
          className={cn(
            "absolute inset-0 w-full h-full",
            canDraw ? "cursor-crosshair" : "cursor-default"
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
        {!canDraw && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-muted-foreground bg-background/70 px-3 py-1 rounded-lg">
              출제자가 그리는 중…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
