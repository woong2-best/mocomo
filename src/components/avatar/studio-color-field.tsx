"use client";

import { useState } from "react";
import { StudioColorPickerDialog } from "@/components/avatar/studio-color-picker-dialog";
import { normalizeHex } from "@/lib/color-picker-utils";
import { cn } from "@/lib/utils";
import { Palette } from "lucide-react";

type StudioColorFieldProps = {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  className?: string;
  compact?: boolean;
};

export function StudioColorField({ label, value, onChange, className, compact }: StudioColorFieldProps) {
  const [open, setOpen] = useState(false);
  const hex = normalizeHex(value) ?? "#000000";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2 w-full rounded-xl border border-border/70 bg-card/80 hover:bg-muted/40 transition-colors text-left",
          compact ? "px-2 py-1.5" : "px-3 py-2",
          className
        )}
      >
        <span
          className={cn("shrink-0 rounded-md border border-black/15 shadow-inner", compact ? "h-7 w-7" : "h-9 w-9")}
          style={{ backgroundColor: hex }}
        />
        <span className="min-w-0 flex-1">
          <span className={cn("block font-semibold text-foreground", compact ? "text-[10px]" : "text-xs")}>{label}</span>
          {!compact && <span className="block text-[10px] text-muted-foreground font-mono truncate">{hex.toUpperCase()}</span>}
        </span>
        <Palette className={cn("shrink-0 text-muted-foreground", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
      </button>

      <StudioColorPickerDialog
        open={open}
        onOpenChange={setOpen}
        value={hex}
        title={`${label} — 색 선택`}
        onConfirm={onChange}
      />
    </>
  );
}
