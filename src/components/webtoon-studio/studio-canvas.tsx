"use client";

import { useCallback, useEffect, useRef } from "react";
import type { WebtoonStudioState } from "@/hooks/use-webtoon-studio";

export function StudioCanvas({ studio }: { studio: WebtoonStudioState }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLCanvasElement>(null);

  const { page, viewport, selection, pointerDown, pointerMove, pointerUp, liveComposite } = studio;

  const redraw = useCallback(() => {
    const canvas = displayRef.current;
    if (!canvas) return;
    const comp = liveComposite();
    canvas.width = page.width;
    canvas.height = page.height;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(comp, 0, 0);
    if (selection) {
      ctx.save();
      ctx.strokeStyle = "#3b82f6";
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(selection.x, selection.y, selection.w, selection.h);
      ctx.restore();
    }
  }, [liveComposite, page.height, page.width, selection]);

  useEffect(() => {
    redraw();
  }, [redraw, page]);

  const toCanvasPoint = (e: React.PointerEvent) => {
    const canvas = displayRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return null;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  return (
    <div ref={wrapRef} className="flex-1 min-h-0 overflow-auto bg-neutral-800/90 rounded-lg border border-border/60">
      <div
        className="relative origin-top-left p-8"
        style={{
          transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
        }}
      >
        <canvas
          ref={displayRef}
          className="touch-none cursor-crosshair shadow-2xl bg-white"
          style={{ width: page.width * 0.5, height: page.height * 0.5 }}
          onPointerDown={(e) => {
            const pt = toCanvasPoint(e);
            if (!pt) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            pointerDown(pt.x, pt.y, e.pressure > 0 ? e.pressure : 1, e.shiftKey);
          }}
          onPointerMove={(e) => {
            const pt = toCanvasPoint(e);
            if (!pt) return;
            pointerMove(pt.x, pt.y, e.pressure > 0 ? e.pressure : 1);
            redraw();
          }}
          onPointerUp={(e) => {
            pointerUp();
            redraw();
            try {
              e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
              /* ignore */
            }
          }}
        />
      </div>
    </div>
  );
}
