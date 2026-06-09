"use client";

import { useState } from "react";
import { StudioInlineColorPicker } from "@/components/avatar/studio-inline-color-picker";
import { normalizeHex } from "@/lib/color-picker-utils";
import { cn } from "@/lib/utils";
import { ChevronDown, Palette } from "lucide-react";

type StudioColorFieldProps = {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  className?: string;
  compact?: boolean;
};

export function StudioColorField({ label, value, onChange, className, compact }: StudioColorFieldProps) {
  const [expanded, setExpanded] = useState(false);
  const hex = normalizeHex(value) ?? "#000000";

  const applyHex = (next: string) => {
    const normalized = normalizeHex(next) ?? next;
    onChange(normalized);
  };

  return (
    <div
      className={cn(
        "w-full rounded-xl border border-border/70 bg-card/80 overflow-hidden",
        expanded && "ring-2 ring-folk-cobalt/25",
        className
      )}
    >
      <div className={cn("flex items-center gap-2", compact ? "px-2 py-1.5" : "px-3 py-2")}>
        <span
          className={cn("shrink-0 rounded-md border border-black/15 shadow-inner", compact ? "h-7 w-7" : "h-9 w-9")}
          style={{ backgroundColor: hex }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <span className={cn("block font-semibold text-foreground", compact ? "text-[10px]" : "text-xs")}>{label}</span>
          {!compact && <span className="block text-[10px] text-muted-foreground font-mono truncate">{hex.toUpperCase()}</span>}
        </div>
        <button
          type="button"
          title={expanded ? "색상 선택 접기" : "색상 선택 펼치기"}
          aria-label={expanded ? "색상 선택 접기" : "색상 선택 펼치기"}
          aria-expanded={expanded}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded((prev) => !prev);
          }}
          className={cn(
            "shrink-0 inline-flex items-center justify-center rounded-lg border transition-colors cursor-pointer",
            compact ? "h-7 w-7" : "h-9 w-9",
            expanded
              ? "border-folk-cobalt/40 bg-folk-cobalt/10 text-folk-cobalt"
              : "border-border/80 bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {expanded ? (
            <ChevronDown className={cn("transition-transform", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
          ) : (
            <Palette className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          )}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border/70 bg-[#1e1e1e] px-3 py-3">
          <StudioInlineColorPicker value={hex} onChange={applyHex} />
        </div>
      )}
    </div>
  );
}
