"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

/** Small disclosure label for posts with an active sponsored-ad campaign. */
export function PostSponsoredAdBadge({ className }: { className?: string }) {
  const { t } = useLocale();
  return (
    <span
      className={cn("text-[11px] leading-none font-normal text-muted-foreground", className)}
      aria-label={t("feed.sudwv")}
    >
      {t("lib.feed.ads.seb18928264")}
    </span>
  );
}
