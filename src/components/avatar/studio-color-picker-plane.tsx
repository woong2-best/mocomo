"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  clamp,
  drawHueStrip,
  drawSaturationValuePlane,
  hsvToHex,
  hsvToSvPoint,
  svPointToHsv,
  type Hsv,
} from "@/lib/color-picker-utils";

type StudioColorPickerPlaneProps = {
  hsv: Hsv;
  onChange: (next: Hsv) => void;
  height?: number;
};

function bindPointerDrag(
  move: (clientX: number, clientY: number) => void,
  onDone?: () => void
) {
  return (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    move(e.clientX, e.clientY);
    const onMove = (ev: PointerEvent) => move(ev.clientX, ev.clientY);
    const onUp = () => {
      target.releasePointerCapture(e.pointerId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      onDone?.();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
}

function resizeCanvas(canvas: HTMLCanvasElement, cssWidth: number, cssHeight: number) {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const w = Math.max(Math.round(cssWidth * dpr), 1);
  const h = Math.max(Math.round(cssHeight * dpr), 1);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

export function StudioColorPickerPlane({ hsv, onChange, height = 160 }: StudioColorPickerPlaneProps) {
  const svCanvasRef = useRef<HTMLCanvasElement>(null);
  const hueCanvasRef = useRef<HTMLCanvasElement>(null);
  const svWrapRef = useRef<HTMLDivElement>(null);
  const hueWrapRef = useRef<HTMLDivElement>(null);
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;

  const redrawSv = useCallback((hue: number) => {
    const canvas = svCanvasRef.current;
    const wrap = svWrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    resizeCanvas(canvas, rect.width, rect.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawSaturationValuePlane(ctx, canvas.width, canvas.height, hue);
  }, []);

  const redrawHue = useCallback(() => {
    const canvas = hueCanvasRef.current;
    const wrap = hueWrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    resizeCanvas(canvas, rect.width, rect.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawHueStrip(ctx, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    redrawSv(hsv.h);
  }, [hsv.h, redrawSv]);

  useEffect(() => {
    redrawHue();
  }, [redrawHue]);

  useEffect(() => {
    const nodes = [svWrapRef.current, hueWrapRef.current].filter(Boolean) as HTMLDivElement[];
    if (nodes.length === 0) return;
    const observer = new ResizeObserver(() => {
      redrawSv(hsvRef.current.h);
      redrawHue();
    });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [redrawHue, redrawSv]);

  const pickSv = useCallback(
    (clientX: number, clientY: number) => {
      const wrap = svWrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = clamp((clientX - rect.left) / rect.width, 0, 1);
      const y = clamp((clientY - rect.top) / rect.height, 0, 1);
      onChange(svPointToHsv(hsvRef.current.h, x, y));
    },
    [onChange]
  );

  const pickHue = useCallback(
    (clientY: number) => {
      const wrap = hueWrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      if (rect.height <= 0) return;
      const y = clamp((clientY - rect.top) / rect.height, 0, 1);
      const h = y * 360;
      const next = { ...hsvRef.current, h: clamp(h, 0, 359.9) };
      onChange(next);
      redrawSv(next.h);
    },
    [onChange, redrawSv]
  );

  const svPoint = hsvToSvPoint(hsv);

  return (
    <div className="flex gap-2">
      <div
        ref={svWrapRef}
        className="relative min-w-0 flex-1 touch-none cursor-crosshair rounded-md border border-neutral-600"
        style={{ height }}
        onPointerDown={bindPointerDrag(pickSv)}
      >
        <canvas ref={svCanvasRef} className="block h-full w-full rounded-md" />
        <span
          className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
          style={{
            left: `${svPoint.x * 100}%`,
            top: `${svPoint.y * 100}%`,
            backgroundColor: hsvToHex(hsv),
          }}
        />
      </div>

      <div
        ref={hueWrapRef}
        className="relative w-4 shrink-0 touch-none cursor-ns-resize rounded-md border border-neutral-600"
        style={{ height }}
        onPointerDown={bindPointerDrag((_x, y) => pickHue(y))}
      >
        <canvas ref={hueCanvasRef} className="block h-full w-full rounded-md" />
        <span
          className="pointer-events-none absolute left-0 right-0 h-0.5 border border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
          style={{
            top: `${(hsv.h / 360) * 100}%`,
            transform: "translateY(-50%)",
          }}
        />
      </div>
    </div>
  );
}
