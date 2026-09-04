"use client";

import { cn } from "@/lib/utils";

type Props = {
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
};

/** NSFW 토글 — 둥근 직사각형 (PNG 검은 배경 없음) */
export function NsfwToggleButton({ active, onToggle, disabled, className }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label="NSFW"
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 min-w-[50px] shrink-0 items-center justify-center rounded-lg px-2.5",
        "bg-[#e84545] text-[11px] font-extrabold tracking-wide text-white transition-opacity",
        "hover:opacity-90 disabled:opacity-40",
        active ? "opacity-100" : "opacity-[0.42]",
        className
      )}
    >
      NSFW
    </button>
  );
}
