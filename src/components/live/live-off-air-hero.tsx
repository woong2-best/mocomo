"use client";

import { LiveOffAirTvGraphic } from "@/components/live/live-off-air-tv-graphic";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

/** Off-air hero — vector CRT (same as hero rail center card). */
export function LiveOffAirHero({ className }: { className?: string }) {
  const { t } = useLocale();

  return (
    <div
      className={cn(
        "flex w-full flex-1 flex-col items-center justify-center bg-black px-4 py-6 min-h-0",
        className
      )}
    >
      <div className="relative w-full max-w-[min(640px,92vw)]">
        <LiveOffAirTvGraphic variant="bars" message={t("live.noBroadcastEmptyHub")} />
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
