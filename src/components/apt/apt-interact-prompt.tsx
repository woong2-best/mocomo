"use client";

import { cn } from "@/lib/utils";

/** 가구·악기 근처 — 게임 스타일 E키 상호작용 프롬프트 */
export function AptInteractPrompt({
  label,
  visible,
  className,
}: {
  label: string;
  visible: boolean;
  className?: string;
}) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "pointer-events-none flex flex-col items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200",
        className
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-white/80 bg-black/55 text-lg font-black text-white shadow-lg backdrop-blur-sm ring-2 ring-white/20">
        E
      </div>
      <span className="rounded-full border border-white/30 bg-black/50 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-sm shadow-md">
        {label}
      </span>
    </div>
  );
}
