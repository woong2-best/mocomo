"use client";

import { Grid3x3, Stamp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WatermarkOptions } from "@/lib/media-watermark";

type Props = {
  value: WatermarkOptions;
  onChange: (next: WatermarkOptions) => void;
  disabled?: boolean;
  className?: string;
};

export function WatermarkToggleButtons({ value, onChange, disabled, className }: Props) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={value.diagonal}
        onClick={() => onChange({ ...value, diagonal: !value.diagonal })}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
          value.diagonal
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/70"
        )}
      >
        <Grid3x3 className="h-3.5 w-3.5" />
        사선 워터마크
      </button>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={value.corner}
        onClick={() => onChange({ ...value, corner: !value.corner })}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
          value.corner
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/70"
        )}
      >
        <Stamp className="h-3.5 w-3.5" />
        하단 워터마크
      </button>
    </div>
  );
}
