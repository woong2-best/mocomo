"use client";

import { useEffect, useRef } from "react";
import SignaturePad from "signature_pad";

export function SignatureCanvas({ onChange }: { onChange: (png: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = Math.max(280, canvas.parentElement?.clientWidth ?? 480);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(112 * ratio);
    canvas.style.width = "100%";
    canvas.style.height = "112px";
    const ctx = canvas.getContext("2d");
    ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
    const pad = new SignaturePad(canvas, {
      penColor: "#111111",
      backgroundColor: "rgba(0,0,0,0)",
      minWidth: 1.1,
      maxWidth: 2.4,
    });
    const publish = () => {
      onChangeRef.current(pad.isEmpty() ? null : pad.toDataURL("image/png"));
    };
    pad.addEventListener("endStroke", publish);
    padRef.current = pad;
    return () => {
      pad.removeEventListener("endStroke", publish);
      pad.off();
      padRef.current = null;
    };
  }, []);

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-neutral-300 bg-white">
        <canvas ref={canvasRef} className="block w-full touch-none" />
      </div>
      <button
        type="button"
        className="text-sm font-semibold underline underline-offset-4"
        onClick={() => {
          padRef.current?.clear();
          onChangeRef.current(null);
        }}
      >
        Clear signature
      </button>
    </div>
  );
}
