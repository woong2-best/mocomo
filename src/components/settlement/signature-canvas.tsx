"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import SignaturePad from "signature_pad";

const CANVAS_HEIGHT = 168;
const PEN_CURSOR =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23000000' d='M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z'/%3E%3Cpath fill='%23333333' d='M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'/%3E%3C/svg%3E\") 3 21, crosshair";

export type SignatureCanvasHandle = {
  clear: () => void;
  isEmpty: () => boolean;
};

export const SignatureCanvas = forwardRef<SignatureCanvasHandle, { onChange: (png: string | null) => void }>(
  function SignatureCanvas({ onChange }, ref) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const padRef = useRef<SignaturePad | null>(null);
    const onChangeRef = useRef(onChange);
    const [empty, setEmpty] = useState(true);
    onChangeRef.current = onChange;

    useImperativeHandle(ref, () => ({
      clear: () => {
        padRef.current?.clear();
        setEmpty(true);
        onChangeRef.current(null);
      },
      isEmpty: () => padRef.current?.isEmpty() ?? true,
    }));

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

      let lastWidth = 0;
      const fit = () => {
        const cssWidth = Math.floor(wrap.clientWidth);
        if (cssWidth < 32 || cssWidth === lastWidth) return;
        lastWidth = cssWidth;
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const strokes = pad.toData();
        canvas.width = Math.floor(cssWidth * ratio);
        canvas.height = Math.floor(CANVAS_HEIGHT * ratio);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${CANVAS_HEIGHT}px`;
        const ctx = canvas.getContext("2d");
        ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
        pad.clear();
        if (strokes.length > 0) pad.fromData(strokes);
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

    return (
      <div
        ref={wrapRef}
        data-functional-canvas=""
        className="relative overflow-hidden rounded-lg border border-neutral-400 bg-white"
      >
        <canvas
          ref={canvasRef}
          data-functional-canvas=""
          className="block touch-none"
          style={{ height: CANVAS_HEIGHT, width: "100%", cursor: PEN_CURSOR }}
        />
        {empty ? (
          <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-neutral-400">
            Sign here with your mouse or touch
          </p>
        ) : null}
      </div>
    );
  },
);
