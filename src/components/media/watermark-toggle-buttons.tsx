"use client";

import { Grid3x3, Stamp } from "lucide-react";
import { cn } from "@/lib/utils";
import { EMPTY_WATERMARK_OPTIONS, type WatermarkOptions } from "@/lib/media-watermark";

type Props = {
  value: WatermarkOptions;
  onChange: (next: WatermarkOptions) => void;
  disabled?: boolean;
  className?: string;
  creditLabel?: string;
};

export function WatermarkToggleButtons({
  value,
  onChange,
  disabled,
  className,
  creditLabel,
}: Props) {
  const noneOn = !value.diagonal && !value.corner;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
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
          사선
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
          하단
        </button>
        {noneOn ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange({ diagonal: true, corner: true })}
            className="text-[11px] font-semibold text-primary hover:underline disabled:opacity-40"
          >
            기본 켜기
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(EMPTY_WATERMARK_OPTIONS)}
            className="text-[11px] font-semibold text-primary hover:underline disabled:opacity-40"
          >
            끄기
          </button>
        )}
      </div>
      {creditLabel ? (
        <p className="text-[10px] text-muted-foreground font-medium">미리보기: {creditLabel}</p>
      ) : null}
    </div>
  );
}
