"use client";

import { cn } from "@/lib/utils";

/**
 * Remaining graphemes for the general-post composer.
 * Under the limit: white. Over the limit: red (Twitter/X overflow).
 */
export function ComposeCharRemaining({
  remaining,
  className,
}: {
  remaining: number;
  className?: string;
}) {
  const over = remaining < 0;
  return (
    <span
      className={cn(
        "min-w-[2.25rem] shrink-0 text-right text-[13px] font-semibold tabular-nums leading-none",
        over
          ? "text-red-500"
          : "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]",
        className
      )}
      aria-live="polite"
    >
      {remaining}
    </span>
  );
}
