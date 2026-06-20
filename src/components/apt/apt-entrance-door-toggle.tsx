"use client";

import { DoorClosed, DoorOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export function AptEntranceDoorToggle({
  doorOpen,
  onToggle,
  compact = false,
  className,
}: {
  doorOpen: boolean;
  onToggle: () => void;
  compact?: boolean;
  className?: string;
}) {
  const Icon = doorOpen ? DoorOpen : DoorClosed;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-xl border transition-colors",
        compact ? "px-2 py-1.5" : "px-3 py-2.5",
        doorOpen
          ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
          : "border-[hsl(var(--folk-cobalt)/0.15)] bg-background/80 hover:bg-[hsl(var(--folk-gold)/0.08)]",
        className
      )}
    >
      <span
        className={cn(
          "font-semibold text-folk-cobalt flex items-center gap-1.5",
          compact ? "text-[10px]" : "text-xs"
        )}
      >
        <Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        현관문
      </span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 font-bold",
          compact ? "text-[9px]" : "text-[10px]",
          doorOpen ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        {doorOpen ? "열림 · 구경 가능" : "닫힘 · 구경 불가"}
      </span>
    </button>
  );
}
