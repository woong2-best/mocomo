"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";

const CANVAS_HEIGHT = 168;

export function SignatureCanvas({ onChange }: { onChange: (png: string | null) => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const onChangeRef = useRef(onChange);
  const [empty, setEmpty] = useState(true);
  onChangeRef.current = onChange;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const pad = new SignaturePad(canvas, {
      penColor: "#000000",
      backgroundColor: "rgba(255,255,255,0)",
      minWidth: 1.6,
      maxWidth: 3.2,
      throttle: 8,
    });
    padRef.current = pad;

    const publish = () => {
      const isEmpty = pad.isEmpty();
      setEmpty(isEmpty);
      onChangeRef.current(isEmpty ? null : pad.toDataURL("image/png"));
    };

    const fit = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const width = Math.max(240, wrap.clientWidth);
      const strokes = pad.toData();
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(CANVAS_HEIGHT * ratio);
      canvas.style.width = "100%";
      canvas.style.height = `${CANVAS_HEIGHT}px`;
      const ctx = canvas.getContext("2d");
      ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
      pad.clear();
      if (strokes.length > 0) pad.fromData(strokes);
      publish();
    };

    pad.addEventListener("endStroke", publish);
    const observer = new ResizeObserver(fit);
    observer.observe(wrap);
    fit();

    return () => {
      observer.disconnect();
      pad.removeEventListener("endStroke", publish);
      pad.off();
      padRef.current = null;
    };
  }, []);

  function clear() {
    const pad = padRef.current;
    pad?.clear();
    setEmpty(true);
    onChangeRef.current(null);
  }

  return (
    <div
      ref={wrapRef}
      className="relative overflow-hidden rounded-lg border border-neutral-400 bg-white"
    >
      <button
        type="button"
        className="absolute right-3 top-2 z-10 text-sm font-semibold text-black underline underline-offset-4"
        onClick={clear}
      >
        Clear
      </button>
      <canvas ref={canvasRef} className="block w-full touch-none" />
      {empty ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-neutral-400">
          Sign here with your mouse or touch
        </p>
      ) : null}
    </div>
  );
}
