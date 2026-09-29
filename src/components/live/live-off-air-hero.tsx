"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

export const OFF_AIR_TV_SRC = "/images/live/off-air-tv.png?v=3";

/** Off-air hero — uses the SMPTE TV artwork as-is (no CSS recreation). */
export function LiveOffAirHero({ className }: { className?: string }) {
  const { t } = useLocale();

  return (
    <div
      className={cn(
        "flex w-full flex-1 flex-col items-center justify-center bg-black px-4 py-6 min-h-0",
        className
      )}
    >
      <div className="relative w-full max-w-[min(920px,96vw)] aspect-[16/10] max-h-[min(58vh,calc(100dvh-var(--header-h,3.5rem)-14rem))]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={OFF_AIR_TV_SRC}
          alt={t("live.noBroadcastEmptyHub")}
          className="h-full w-full object-contain object-center"
          decoding="async"
          fetchPriority="high"
        />
      </div>
    </div>
  );
}

export function LiveHubNeonDivider() {
  return (
    <div
      className="live-hub-neon-green-line shrink-0"
      role="presentation"
      aria-hidden
    />
  );
}
