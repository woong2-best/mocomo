"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BASIC_COLORS,
  CUSTOM_COLOR_SLOTS,
  clamp,
  hexToHsv,
  hexToRgb,
  hsvToHex,
  hueToHex,
  loadCustomColors,
  normalizeHex,
  rgbToHex,
  saveCustomColors,
  type Hsv,
} from "@/lib/color-picker-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Pipette } from "lucide-react";

type StudioColorPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  title?: string;
  onConfirm: (hex: string) => void;
};

function NumInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex flex-col items-center gap-0.5 text-[10px] text-neutral-300">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={Math.round(value)}
        onChange={(e) => onChange(clamp(Number(e.target.value) || 0, min, max))}
        className="w-12 h-6 rounded border border-neutral-600 bg-neutral-900 text-neutral-100 text-center text-[11px] tabular-nums"
      />
    </label>
  );
}

export function StudioColorPickerDialog({
  open,
  onOpenChange,
  value,
  title = "색 선택",
  onConfirm,
}: StudioColorPickerDialogProps) {
  const [draft, setDraft] = useState(() => normalizeHex(value) ?? "#000000");
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(normalizeHex(value) ?? "#000000"));
  const [customColors, setCustomColors] = useState<string[]>(() => loadCustomColors());
  const [htmlInput, setHtmlInput] = useState(draft);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const lumRef = useRef<HTMLDivElement>(null);

  const syncFromHex = useCallback((hex: string) => {
    const next = normalizeHex(hex) ?? "#000000";
    setDraft(next);
    setHsv(hexToHsv(next));
    setHtmlInput(next);
  }, []);

  useEffect(() => {
    if (open) syncFromHex(value);
  }, [open, value, syncFromHex]);

  const applyHsv = useCallback((next: Hsv) => {
    const hex = hsvToHex(next);
    setHsv(next);
    setDraft(hex);
    setHtmlInput(hex);
  }, []);

  const rgb = useMemo(() => hexToRgb(draft), [draft]);

  const pickFromSv = useCallback(
    (clientX: number, clientY: number) => {
      const el = svRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const s = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
      const v = clamp(100 - ((clientY - rect.top) / rect.height) * 100, 0, 100);
      applyHsv({ ...hsv, s, v });
    },
    [applyHsv, hsv]
  );

  const pickFromHue = useCallback(
    (clientY: number) => {
      const el = hueRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const h = clamp(((clientY - rect.top) / rect.height) * 360, 0, 359.9);
      applyHsv({ ...hsv, h });
    },
    [applyHsv, hsv]
  );

  const pickFromLum = useCallback(
    (clientY: number) => {
      const el = lumRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const v = clamp(100 - ((clientY - rect.top) / rect.height) * 100, 0, 100);
      applyHsv({ ...hsv, v });
    },
    [applyHsv, hsv]
  );

  const bindDrag = useCallback(
    (move: (x: number, y: number) => void) => (e: React.PointerEvent) => {
      e.preventDefault();
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

  const addToCustom = () => {
    const next = [...customColors];
    const empty = next.findIndex((c) => normalizeHex(c) === "#ffffff" || !c);
    const slot = empty >= 0 ? empty : 0;
    next[slot] = draft;
    setCustomColors(next);
    saveCustomColors(next);
  };

  const pickScreenColor = async () => {
    const EyeDropperCtor = (window as Window & { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
    if (!EyeDropperCtor) return;
    try {
      const dropper = new EyeDropperCtor();
      const result = await dropper.open();
      if (result?.sRGBHex) syncFromHex(result.sRGBHex);
    } catch {
      /* cancelled */
    }
  };

  const confirm = () => {
    onConfirm(draft);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[520px] gap-0 p-0 overflow-hidden bg-[#2b2b2b] border-neutral-600 text-neutral-100 shadow-2xl"
        layer="stack"
      >
        <DialogHeader className="px-4 py-3 border-b border-neutral-600 bg-[#323232] space-y-0">
          <DialogTitle className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
            <span className="text-base">🎨</span>
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-3 p-3">
          <div className="shrink-0 w-[200px] space-y-2">
            <p className="text-[10px] text-neutral-400">기본 색상(B)</p>
            <div className="grid grid-cols-8 gap-px border border-neutral-600 bg-neutral-600">
              {BASIC_COLORS.map((color, i) => (
                <button
                  key={`${color}-${i}`}
                  type="button"
                  title={color}
                  onClick={() => syncFromHex(color)}
                  className={cn(
                    "h-4 w-4 hover:ring-1 hover:ring-white/80",
                    draft === color && "ring-2 ring-white"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => void pickScreenColor()}
              className="w-full flex items-center justify-center gap-1 rounded border border-neutral-500 bg-[#3a3a3a] py-1 text-[10px] hover:bg-[#444]"
            >
              <Pipette className="h-3 w-3" />
              화면 색상 고르기
            </button>

            <p className="text-[10px] text-neutral-400 pt-1">사용자 정의 색상(C)</p>
            <div className="grid grid-cols-8 gap-px border border-neutral-600 bg-neutral-600">
              {Array.from({ length: CUSTOM_COLOR_SLOTS }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => syncFromHex(customColors[i] ?? "#ffffff")}
                  className="h-4 w-4 hover:ring-1 hover:ring-white/80"
                  style={{ backgroundColor: customColors[i] ?? "#ffffff" }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={addToCustom}
              className="w-full rounded border border-neutral-500 bg-[#3a3a3a] py-1 text-[10px] hover:bg-[#444]"
            >
              사용자 정의 색상에 추가(A)
            </button>
          </div>

          <div className="flex flex-1 gap-2 min-w-0">
            <div
              ref={svRef}
              className="relative h-[220px] flex-1 cursor-crosshair rounded border border-neutral-500 touch-none"
              style={{ backgroundColor: hueToHex(hsv.h) }}
              onPointerDown={bindDrag((x, y) => pickFromSv(x, y))}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent rounded" />
              <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent rounded" />
              <span
                className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
                style={{
                  left: `${hsv.s}%`,
                  top: `${100 - hsv.v}%`,
                  backgroundColor: draft,
                }}
              />
            </div>

            <div
              ref={hueRef}
              className="relative w-4 h-[220px] rounded border border-neutral-500 cursor-ns-resize touch-none"
              style={{
                background:
                  "linear-gradient(to bottom,#ff0000 0%,#ffff00 17%,#00ff00 33%,#00ffff 50%,#0000ff 67%,#ff00ff 83%,#ff0000 100%)",
              }}
              onPointerDown={bindDrag((_x, y) => pickFromHue(y))}
            >
              <span
                className="absolute left-1/2 h-1 w-full -translate-x-1/2 -translate-y-1/2 border border-white shadow"
                style={{ top: `${(hsv.h / 360) * 100}%`, backgroundColor: hueToHex(hsv.h) }}
              />
            </div>

            <div
              ref={lumRef}
              className="relative w-4 h-[220px] rounded border border-neutral-500 cursor-ns-resize touch-none"
              style={{
                background: `linear-gradient(to bottom, #000 0%, ${hueToHex(hsv.h)} 100%)`,
              }}
              onPointerDown={bindDrag((_x, y) => pickFromLum(y))}
            >
              <span
                className="absolute left-1/2 h-1 w-full -translate-x-1/2 -translate-y-1/2 border border-white bg-white shadow"
                style={{ top: `${100 - hsv.v}%` }}
              />
            </div>

            <div className="w-10 h-[220px] rounded border border-neutral-500 shrink-0" style={{ backgroundColor: draft }} />
          </div>
        </div>

        <div className="flex items-end justify-center gap-4 px-3 pb-3">
          <NumInput label="색상(E)" value={hsv.h} min={0} max={360} onChange={(h) => applyHsv({ ...hsv, h })} />
          <NumInput label="채도(S)" value={hsv.s} min={0} max={100} onChange={(s) => applyHsv({ ...hsv, s })} />
          <NumInput label="휘도(V)" value={hsv.v} min={0} max={100} onChange={(v) => applyHsv({ ...hsv, v })} />
          <NumInput label="빨강(R)" value={rgb.r} min={0} max={255} onChange={(r) => syncFromHex(rgbToHex({ ...rgb, r }))} />
          <NumInput label="녹색(G)" value={rgb.g} min={0} max={255} onChange={(g) => syncFromHex(rgbToHex({ ...rgb, g }))} />
          <NumInput label="파랑(U)" value={rgb.b} min={0} max={255} onChange={(b) => syncFromHex(rgbToHex({ ...rgb, b }))} />
        </div>

        <div className="flex items-center gap-2 px-3 pb-3">
          <span className="text-[10px] text-neutral-400 shrink-0">HTML(H):</span>
          <input
            value={htmlInput}
            onChange={(e) => setHtmlInput(e.target.value)}
            onBlur={() => {
              const next = normalizeHex(htmlInput);
              if (next) syncFromHex(next);
              else setHtmlInput(draft);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const next = normalizeHex(htmlInput);
                if (next) syncFromHex(next);
              }
            }}
            className="flex-1 h-7 rounded border border-neutral-600 bg-neutral-900 px-2 text-xs font-mono text-neutral-100"
          />
        </div>

        <div className="flex justify-end gap-2 px-3 py-2 border-t border-neutral-600 bg-[#323232]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 bg-[#3a3a3a] border-neutral-500 text-neutral-100 hover:bg-[#444]"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button type="button" size="sm" className="h-8 min-w-16 bg-[#0078d4] hover:bg-[#006cbd] text-white" onClick={confirm}>
            확인
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
