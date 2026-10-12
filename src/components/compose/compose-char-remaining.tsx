"use client";

import { cn } from "@/lib/utils";

/**
 * Remaining graphemes for the general-post composer.
 * Under the limit: green. Over the limit: red.
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
        over ? "text-red-500" : "text-green-500",
        className
      )}
      aria-live="polite"
    >
      {remaining}
    </span>
  );
}
