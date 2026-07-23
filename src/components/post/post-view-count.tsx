"use client";

import { Eye } from "lucide-react";
import { formatNumber, cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";

/** Instagram-style: eye icon + count (no "조회수" label) */
export function PostViewCount({
  count,
  className,
  size = "sm",
}: {
  count: number;
  className?: string;
  size?: "sm" | "detail";
}) {
  const { t } = useLocale();
  const n = Math.max(0, count);
  const iconClass = size === "detail" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 tabular-nums text-muted-foreground whitespace-nowrap",
        size === "detail" ? "text-sm" : "text-xs",
        className
      )}
      aria-label={t("post.views", { count: String(n) })}
    >
      <Eye className={iconClass} aria-hidden strokeWidth={2} />
      <span>{formatNumber(n)}</span>
    </span>
  );
}
