"use client";

import { formatNumber, cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";

/** Instagram-style view label: 조회수 1.2K회 / 1.2K views */
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

  return (
    <span
      className={cn(
        "tabular-nums text-muted-foreground whitespace-nowrap",
        size === "detail" ? "text-sm" : "text-xs",
        className
      )}
      aria-label={t("post.views", { count: String(n) })}
    >
      {t("post.views", { count: formatNumber(n) })}
    </span>
  );
}
