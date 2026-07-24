"use client";

import Link from "next/link";
import { Gamepad2, Radio, Search, Tags } from "lucide-react";
import { cn } from "@/lib/utils";
import { isLiveFeatureEnabled } from "@/lib/live-feature";
import { useLocale } from "@/components/providers/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

const TILES = [
  {
    href: "/discover",
    labelKey: "nav.discover" as MessageKey,
    subKey: "explore.matchSub" as MessageKey,
    icon: Search,
    className:
      "border-folk-terracotta/35 bg-folk-terracotta/8 text-folk-cobalt dark:text-foreground",
    iconClass: "text-folk-terracotta",
  },
  {
    href: "/live",
    labelKey: "nav.live" as MessageKey,
    subKey: "explore.liveSub" as MessageKey,
    icon: Radio,
    className: "border-folk-terracotta/35 bg-folk-terracotta/8 text-folk-cobalt",
    iconClass: "text-folk-terracotta",
    liveOnly: true,
  },
  {
    href: "/games",
    labelKey: "nav.games" as MessageKey,
    subKey: "explore.gamesSub" as MessageKey,
    icon: Gamepad2,
    className: "border-folk-cobalt/30 bg-folk-gold/15 text-folk-cobalt",
    iconClass: "text-folk-cobalt",
  },
  {
    href: "/used",
    labelKey: "nav.used" as MessageKey,
    subKey: "explore.usedSub" as MessageKey,
    icon: Tags,
    className: "border-border/70 bg-muted/30 text-foreground",
    iconClass: "text-muted-foreground",
  },
] as const;

export function ExploreQuickNav({ className }: { className?: string }) {
  const { t } = useLocale();
  const liveOn = isLiveFeatureEnabled();
  const tiles = TILES.filter((tile) => !("liveOnly" in tile && tile.liveOnly) || liveOn);

  return (
    <nav
      className={cn("grid grid-cols-2 gap-2 sm:grid-cols-4 moco-stagger", className)}
      aria-label={t("explore.quickNavAria")}
    >
      {tiles.map(({ href, labelKey, subKey, icon: Icon, className: tileClass, iconClass }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "folk-card-interactive flex flex-col gap-1 rounded-2xl border-2 p-3 min-h-[4.5rem]",
            tileClass
          )}
        >
          <Icon className={cn("h-5 w-5", iconClass)} aria-hidden />
          <span className="font-display font-bold text-sm leading-tight">{t(labelKey)}</span>
          <span className="text-[10px] text-muted-foreground leading-tight">{t(subKey)}</span>
        </Link>
      ))}
    </nav>
  );
}
