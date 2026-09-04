"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
};

/** 모바일 compose와 동일 — NSFW 토글 (클릭형) */
export function NsfwToggleButton({ active, onToggle, disabled, className }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label="NSFW"
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md p-0.5 transition-opacity",
        "hover:opacity-90 disabled:opacity-40",
        !active && "opacity-[0.42]",
        className
      )}
    >
      <Image
        src="/nsfw-button.png"
        alt="NSFW"
        width={50}
        height={28}
        className="h-7 w-[50px] object-contain"
      />
    </button>
  );
}
