"use client";

import Image from "next/image";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

const OFF_AIR_TV_SRC = "/images/live/off-air-tv.png";

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
        <Image
          src={OFF_AIR_TV_SRC}
          alt={t("live.noBroadcastEmptyHub")}
          fill
          priority
          className="object-contain object-center"
          sizes="(max-width: 920px) 96vw, 920px"
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
