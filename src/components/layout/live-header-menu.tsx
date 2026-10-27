"use client";

import Link from "next/link";
import { MonitorPlay, Radio } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/components/providers/locale-provider";
import {
  isExternalLiveEnabled,
  isFirstPartyLiveEnabled,
  isLiveFeatureEnabled,
} from "@/lib/live-feature";

function liveNowHref() {
  if (isExternalLiveEnabled()) return "/live/external/new";
  if (isFirstPartyLiveEnabled()) return "/voice/new";
  return "/live/studio";
}

export function LiveHeaderMenu() {
  const { t } = useLocale();

  if (!isLiveFeatureEnabled()) return null;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative z-[2] inline-flex h-9 shrink-0 items-center justify-center rounded-xl bg-folk-terracotta px-3 text-[12px] font-extrabold tracking-wide text-white shadow-folk-sm outline-none transition-colors hover:bg-folk-terracotta/90 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("nav.plusLive")}
        >
          {t("nav.plusLive")}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        collisionPadding={12}
        className="z-[250] min-w-[12.5rem] py-1.5"
      >
        <DropdownMenuItem asChild>
          <Link href={liveNowHref()}>
            <Radio className="h-4 w-4 shrink-0" />
            {t("nav.liveNow")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/live/studio">
            <MonitorPlay className="h-4 w-4 shrink-0" />
            {t("nav.liveMenuStudio")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
