"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StudioColorPickerPlane } from "@/components/avatar/studio-color-picker-plane";
import { clamp, hexToHsv, hsvToHex, normalizeHex, type Hsv } from "@/lib/color-picker-utils";

type StudioInlineColorPickerProps = {
  value: string;
  onChange: (hex: string) => void;
};

export function StudioInlineColorPicker({ value, onChange }: StudioInlineColorPickerProps) {
  const hex = normalizeHex(value) ?? "#000000";
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(hex));
  const [htmlInput, setHtmlInput] = useState(hex);
  const lastEmittedRef = useRef(hex);

  useEffect(() => {
    if (hex === lastEmittedRef.current) return;
    lastEmittedRef.current = hex;
    setHsv(hexToHsv(hex));
    setHtmlInput(hex);
  }, [hex]);

  const applyHsv = useCallback(
    (next: Hsv) => {
      const normalized: Hsv = {
        h: clamp(next.h, 0, 359.9),
        s: clamp(next.s, 0, 100),
        v: clamp(next.v, 0, 100),
      };
      const nextHex = hsvToHex(normalized);
      lastEmittedRef.current = nextHex;
      setHsv(normalized);
      setHtmlInput(nextHex);
      onChange(nextHex);
    },
    [onChange]
  );

  const preview = hsvToHex(hsv);

  return (
    <div className="space-y-2">
      <StudioColorPickerPlane hsv={hsv} onChange={applyHsv} />

      <div className="flex items-center gap-2">
        <span
          className="h-7 w-7 shrink-0 rounded border border-neutral-600"
          style={{ backgroundColor: preview }}
          aria-hidden
        />
        <input
          value={htmlInput.toUpperCase()}
          onChange={(e) => setHtmlInput(e.target.value)}
          onBlur={() => {
            const next = normalizeHex(htmlInput);
            if (next) applyHsv(hexToHsv(next));
            else setHtmlInput(preview);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const next = normalizeHex(htmlInput);
              if (next) applyHsv(hexToHsv(next));
            }
          }}
          spellCheck={false}
          className="flex-1 h-7 rounded border border-neutral-600 bg-neutral-900 px-2 text-[11px] font-mono text-neutral-100"
        />
      </div>
    </div>
  );
}
