"use client";

import { LIVE_HERO_CARD_ASPECT, OFF_AIR_TV_SRC } from "@/components/live/live-off-air-tv-asset";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

/** Standalone off-air block (hero rail uses the same PNG). */
export function LiveOffAirHero({ className }: { className?: string }) {
  const { t } = useLocale();

  return (
    <div
      className={cn(
        "flex w-full flex-1 flex-col items-center justify-center bg-black px-4 py-6 min-h-0",
        className
      )}
    >
      <div className={cn("relative w-full max-w-[min(400px,88vw)]", LIVE_HERO_CARD_ASPECT)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={OFF_AIR_TV_SRC}
          alt={t("live.noBroadcastEmptyHub")}
          className="h-full w-full object-contain"
          decoding="async"
        />
        <div className="absolute inset-0 flex items-center justify-center p-3">
          <p className="text-center text-xs font-semibold text-white sm:text-sm">
            {t("live.noBroadcastEmptyHub")}
          </p>
        </div>
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
