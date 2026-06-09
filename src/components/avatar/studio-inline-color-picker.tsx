"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clamp, hexToHsv, hsvToHex, normalizeHex, type Hsv } from "@/lib/color-picker-utils";

type StudioInlineColorPickerProps = {
  value: string;
  onChange: (hex: string) => void;
};

export function StudioInlineColorPicker({ value, onChange }: StudioInlineColorPickerProps) {
  const hex = normalizeHex(value) ?? "#000000";
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(hex));
  const mainRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHsv(hexToHsv(hex));
  }, [hex]);

  const pickMain = useCallback(
    (clientX: number, clientY: number) => {
      const el = mainRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const h = clamp(((clientX - rect.left) / rect.width) * 360, 0, 359.9);
      const s = clamp(100 - ((clientY - rect.top) / rect.height) * 100, 0, 100);
      setHsv((prev) => {
        const next = { h, s, v: prev.v };
        onChange(hsvToHex(next));
        return next;
      });
    },
    [onChange]
  );

  const pickValue = useCallback(
    (clientY: number) => {
      const el = valueRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const v = clamp(100 - ((clientY - rect.top) / rect.height) * 100, 0, 100);
      setHsv((prev) => {
        const next = { ...prev, v };
        onChange(hsvToHex(next));
        return next;
      });
    },
    [onChange]
  );

  const bindDrag = useCallback(
    (move: (x: number, y: number) => void) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const onMove = (ev: PointerEvent) => move(ev.clientX, ev.clientY);
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      move(e.clientX, e.clientY);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    []
  );

  const preview = hsvToHex(hsv);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div
          ref={mainRef}
          className="relative h-[160px] flex-1 cursor-crosshair touch-none rounded-md border border-neutral-600"
          style={{
            background: `linear-gradient(to bottom, #fff, transparent), linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)`,
          }}
          onPointerDown={bindDrag((x, y) => pickMain(x, y))}
        >
          <span
            className="pointer-events-none absolute text-neutral-900 font-bold text-sm leading-none"
            style={{
              left: `${(hsv.h / 360) * 100}%`,
              top: `${100 - hsv.s}%`,
              transform: "translate(-50%, -50%)",
              textShadow: "0 0 2px #fff, 0 0 2px #fff",
            }}
          >
            +
          </span>
        </div>

        <div
          ref={valueRef}
          className="relative w-6 h-[160px] cursor-ns-resize touch-none rounded-md border border-neutral-600"
          style={{
            background: `linear-gradient(to bottom, ${hsvToHex({ h: hsv.h, s: hsv.s, v: 100 })}, #000)`,
          }}
          onPointerDown={bindDrag((_x, y) => pickValue(y))}
        >
          <span
            className="pointer-events-none absolute left-0 right-0 h-0.5 bg-white shadow"
            style={{ top: `${100 - hsv.v}%`, transform: "translateY(-50%)" }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="h-7 w-7 shrink-0 rounded border border-neutral-600" style={{ backgroundColor: preview }} />
        <input
          value={preview.toUpperCase()}
          readOnly
          className="flex-1 h-7 rounded border border-neutral-600 bg-neutral-900 px-2 text-[11px] font-mono text-neutral-100"
        />
      </div>
    </div>
  );
}
