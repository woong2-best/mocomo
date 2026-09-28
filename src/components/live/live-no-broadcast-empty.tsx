"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

export function LiveNoBroadcastEmpty({ className }: { className?: string }) {
  const { t } = useLocale();

  return (
    <div
      className={cn(
        "flex w-full flex-1 items-center justify-center bg-black",
        "min-h-[min(560px,calc(100dvh-var(--header-h,3.5rem)-11rem))]",
        className
      )}
    >
      <p className="px-4 text-center text-sm font-semibold text-white sm:text-base">
        {t("live.noBroadcastEmptyHub")}
      </p>
    </div>
  );
}
