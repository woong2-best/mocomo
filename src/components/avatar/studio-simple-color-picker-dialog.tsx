"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clamp, hexToHsv, hsvToHex, normalizeHex, type Hsv } from "@/lib/color-picker-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type StudioSimpleColorPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  title?: string;
  onLiveChange: (hex: string) => void;
};

export function StudioSimpleColorPickerDialog({
  open,
  onOpenChange,
  value,
  title = "색 선택",
  onLiveChange,
}: StudioSimpleColorPickerDialogProps) {
  const initialHex = useRef(normalizeHex(value) ?? "#000000");
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(initialHex.current));
  const mainRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const hex = normalizeHex(value) ?? "#000000";
    initialHex.current = hex;
    setHsv(hexToHsv(hex));
  }, [open, value]);

  const pickMain = useCallback(
    (clientX: number, clientY: number) => {
      const el = mainRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const h = clamp(((clientX - rect.left) / rect.width) * 360, 0, 359.9);
      const s = clamp(100 - ((clientY - rect.top) / rect.height) * 100, 0, 100);
      setHsv((prev) => {
        const next = { h, s, v: prev.v };
        onLiveChange(hsvToHex(next));
        return next;
      });
    },
    [onLiveChange]
  );

  const pickValue = useCallback(
    (clientY: number) => {
      const el = valueRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const v = clamp(100 - ((clientY - rect.top) / rect.height) * 100, 0, 100);
      setHsv((prev) => {
        const next = { ...prev, v };
        onLiveChange(hsvToHex(next));
        return next;
      });
    },
    [onLiveChange]
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

  const cancel = () => {
    onLiveChange(initialHex.current);
    onOpenChange(false);
  };

  const preview = hsvToHex(hsv);

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : cancel())}>
      <DialogContent
        layer="stack"
        className="max-w-[320px] gap-3 p-4 bg-[#1e1e1e] border-neutral-700 text-neutral-100"
      >
        <DialogHeader className="space-y-0">
          <DialogTitle className="text-sm text-neutral-100">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <div
            ref={mainRef}
            className="relative h-[200px] flex-1 cursor-crosshair touch-none rounded border border-neutral-600"
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
            className="relative w-7 h-[200px] cursor-ns-resize touch-none rounded border border-neutral-600"
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
          <span className="h-8 w-8 shrink-0 rounded border border-neutral-600" style={{ backgroundColor: preview }} />
          <input
            value={preview.toUpperCase()}
            readOnly
            className="flex-1 h-8 rounded border border-neutral-600 bg-neutral-900 px-2 text-xs font-mono"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-neutral-600 bg-neutral-800 text-neutral-100 hover:bg-neutral-700"
            onClick={cancel}
          >
            취소
          </Button>
          <Button type="button" size="sm" className="h-8 bg-[#0078d4] hover:bg-[#006cbd] text-white" onClick={() => onOpenChange(false)}>
            확인
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
