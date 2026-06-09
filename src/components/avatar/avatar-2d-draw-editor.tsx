"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { floodFillCanvas } from "@/lib/avatar-2d/flood-fill";
import {
  AVATAR_2D_DRAW_TOOLS,
  AVATAR_2D_SIZE,
  type Avatar2dDrawTool,
} from "@/lib/avatar-2d/types";
import { cn } from "@/lib/utils";

function hexToRgba(hex: string, alpha: number): [number, number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, Math.round(alpha * 255)];
}

function parseHexColor(hex: string) {
  const h = hex.replace("#", "");
  if (h.length === 3) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  return `#${h.slice(0, 6)}`;
}

type Avatar2dDrawEditorProps = {
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
};

export function Avatar2dDrawEditor({ onCanvasReady }: Avatar2dDrawEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  const [tool, setTool] = useState<Avatar2dDrawTool>("pen");
  const [color, setColor] = useState("#1a1a2e");
  const [size, setSize] = useState(8);
  const [opacity, setOpacity] = useState(100);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onCanvasReady?.(canvas);
  }, [onCanvasReady]);

  const canvasPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  }, []);

  const applyStrokeStyle = useCallback(
    (ctx: CanvasRenderingContext2D, t: Avatar2dDrawTool) => {
      const alpha = opacity / 100;
      if (t === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = `rgba(0,0,0,${alpha})`;
        ctx.lineWidth = size * 1.4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        return;
      }
      ctx.globalCompositeOperation = "source-over";
      const rgba = hexToRgba(color, alpha);
      ctx.strokeStyle = `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3] / 255})`;
      if (t === "pencil") {
        ctx.lineWidth = size * 0.7;
        ctx.globalAlpha = alpha * 0.65;
      } else if (t === "gpen") {
        ctx.lineWidth = size * 1.1;
        ctx.globalAlpha = alpha;
      } else if (t === "airbrush") {
        ctx.lineWidth = size * 2.2;
        ctx.globalAlpha = alpha * 0.35;
      } else {
        ctx.lineWidth = size;
        ctx.globalAlpha = alpha;
      }
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    },
    [color, opacity, size]
  );

  const strokeTo = useCallback(
    (x: number, y: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const last = lastRef.current;
      if (!ctx || !last) return;
      applyStrokeStyle(ctx, tool);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      lastRef.current = { x, y };
    },
    [applyStrokeStyle, tool]
  );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = canvasPoint(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!pt || !ctx || !canvas) return;

    if (tool === "eyedropper") {
      const d = ctx.getImageData(Math.floor(pt.x), Math.floor(pt.y), 1, 1).data;
      setColor(
        `#${[d[0], d[1], d[2]].map((v) => v!.toString(16).padStart(2, "0")).join("")}`
      );
      return;
    }

    if (tool === "fill") {
      const rgba = hexToRgba(color, opacity / 100);
      floodFillCanvas(ctx, pt.x, pt.y, rgba, 36);
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastRef.current = pt;
    const pressure = e.pressure > 0 ? e.pressure : 1;
    applyStrokeStyle(ctx, tool);
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, (size * pressure) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || tool === "fill" || tool === "eyedropper") return;
    const pt = canvasPoint(e);
    if (!pt) return;
    strokeTo(pt.x, pt.y);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    lastRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const importImage = (file: File) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="flex flex-col gap-3 min-h-0">
      <div className="flex flex-wrap gap-1.5">
        {AVATAR_2D_DRAW_TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTool(t.id)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors",
              tool === t.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:border-primary/40"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground shrink-0">색</span>
          <input
            type="color"
            value={parseHexColor(color)}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-10 rounded border border-border cursor-pointer"
          />
          <Input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-24 text-xs font-mono"
          />
        </label>
        <label className="flex items-center gap-2 min-w-[120px]">
          <span className="text-muted-foreground shrink-0">크기</span>
          <input
            type="range"
            min={1}
            max={48}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="flex-1"
          />
        </label>
        <label className="flex items-center gap-2 min-w-[120px]">
          <span className="text-muted-foreground shrink-0">불투명</span>
          <input
            type="range"
            min={5}
            max={100}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="flex-1"
          />
        </label>
      </div>

      <div
        className="relative rounded-xl border-2 border-border overflow-hidden bg-[length:16px_16px] bg-[position:0_0,8px_8px]"
        style={{
          backgroundImage:
            "linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%)",
        }}
      >
        <canvas
          ref={canvasRef}
          width={AVATAR_2D_SIZE}
          height={AVATAR_2D_SIZE}
          className="w-full max-h-[min(52vh,640px)] aspect-square touch-none cursor-crosshair bg-transparent"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={clearCanvas}>
          캔버스 비우기
        </Button>
        <label className="inline-flex">
          <Button type="button" variant="outline" size="sm" className="rounded-xl" asChild>
            <span>PNG 가져오기</span>
          </Button>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importImage(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}