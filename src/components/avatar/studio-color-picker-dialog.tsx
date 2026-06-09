"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BASIC_COLORS,
  CUSTOM_COLOR_SLOTS,
  clamp,
  hexToHsv,
  hexToRgb,
  hsvToHex,
  loadCustomColors,
  normalizeHex,
  rgbToHex,
  saveCustomColors,
  type Hsv,
} from "@/lib/color-picker-utils";
import { StudioColorPickerPlane } from "@/components/avatar/studio-color-picker-plane";
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

          <div className="flex flex-1 gap-2 min-w-0 items-start">
            <div className="min-w-0 flex-1">
              <StudioColorPickerPlane hsv={hsv} onChange={applyHsv} height={220} />
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
