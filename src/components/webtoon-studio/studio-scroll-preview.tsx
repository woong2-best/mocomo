"use client";

import { useEffect, useRef } from "react";
import type { WebtoonStudioState } from "@/hooks/use-webtoon-studio";

export function StudioScrollPreview({ studio }: { studio: WebtoonStudioState }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const totalH = studio.project.pages.reduce((a, p) => a + p.height, 0);
    const w = studio.project.pages[0]?.width ?? 800;
    canvas.width = w;
    canvas.height = totalH;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, totalH);
    let y = 0;
    for (const pg of studio.project.pages) {
      const comp = studio.compositePage(pg);
      ctx.drawImage(comp, 0, y);
      y += pg.height;
      ctx.strokeStyle = "#e5e7eb";
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }, [studio]);

  const totalH = studio.project.pages.reduce((a, p) => a + p.height, 0);
  const w = studio.project.pages[0]?.width ?? 800;

  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-2">
      <p className="text-[10px] font-semibold text-muted-foreground mb-2">세로 스크롤 미리보기</p>
      <div className="max-h-48 overflow-y-auto rounded bg-neutral-900 p-2">
        <canvas
          ref={ref}
          className="mx-auto"
          style={{ width: Math.min(120, w * 0.15), height: totalH * 0.15 }}
        />
      </div>
    </div>
  );
}
