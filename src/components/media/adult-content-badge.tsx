"use client";

import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: "sm" | "md";
  variant?: "overlay" | "inline";
};

/** 피드·검색 썸네일용 '성인 콘텐츠' 마크 */
export function AdultContentBadge({ className, size = "sm", variant = "overlay" }: Props) {
  const sizeClass =
    size === "md" ? "px-2 py-1 text-xs" : "px-1.5 py-0.5 text-[10px]";

  if (variant === "inline") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded font-bold uppercase tracking-wide",
          "bg-destructive/15 text-destructive",
          sizeClass,
          className
        )}
      >
        성인 콘텐츠
      </span>
    );
  }

  return (
    <span
      className={cn(
        "absolute left-2 top-2 z-10 inline-flex items-center rounded-md font-bold uppercase tracking-wide",
        "bg-black/70 text-white backdrop-blur-sm ring-1 ring-white/20",
        sizeClass,
        className
      )}
    >
      성인 콘텐츠
    </span>
  );
}
