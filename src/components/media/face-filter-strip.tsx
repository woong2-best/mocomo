"use client";

import { FACE_FILTER_PRESETS, type FaceFilterId } from "@/lib/face-filters/presets";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

type FaceFilterStripProps = {
  value: FaceFilterId;
  onChange: (id: FaceFilterId) => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
};

export function FaceFilterStrip({
  value,
  onChange,
  disabled,
  className,
  compact,
}: FaceFilterStripProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-0.5">
        <Sparkles className="h-3.5 w-3.5" />
        <span>얼굴 필터</span>
      </div>
      <div
        className={cn(
          "flex gap-2 overflow-x-auto pb-1 scrollbar-thin",
          compact ? "px-0" : "-mx-1 px-1"
        )}
      >
        {FACE_FILTER_PRESETS.map((preset) => {
          const selected = value === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(preset.id)}
              className={cn(
                "shrink-0 flex flex-col items-center gap-1 rounded-xl border px-2.5 py-2 transition-all min-w-[4.5rem]",
                selected
                  ? "border-primary bg-primary/15 ring-2 ring-primary/40"
                  : "border-border bg-muted/40 hover:border-primary/30",
                disabled && "opacity-50 pointer-events-none"
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-lg",
                  selected ? "bg-primary/20" : "bg-background/80"
                )}
              >
                {preset.emoji}
              </span>
              <span className={cn("text-[10px] font-medium", selected && "text-primary")}>
                {preset.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
