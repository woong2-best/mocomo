"use client";

import Link from "next/link";
import { Mailbox } from "lucide-react";
import { FolkBrushDivider } from "@/components/brand/folk-decor";
import { FolkThemeCelestial } from "@/components/brand/folk-theme-celestial";
import { AptMailboxLink } from "@/components/compose/apt-mailbox-link";
import { APT_GAME_PATH } from "@/lib/site-routes";

export function HomeLoggedBanner() {
  return (
    <div className="folk-hero-banner !p-4 sm:!p-5 !mb-5">
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div>
          <p className="font-display font-bold text-lg text-folk-cobalt folk-chunky-text">
            오늘의 캔버스
          </p>
          <p className="text-sm text-folk-forest/80 mt-0.5">
            APT 우편함에서 새 이야기를 올려 보세요
          </p>
        </div>
        <FolkThemeCelestial size={44} className="opacity-80 shrink-0" />
      </div>
      <FolkBrushDivider className="my-3 opacity-50" />
      <div className="relative z-10 flex flex-wrap items-center gap-3">
        <AptMailboxLink className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Mailbox className="h-4 w-4" />
          우편함 만들기
        </AptMailboxLink>
        <Link href={APT_GAME_PATH} className="text-sm text-muted-foreground hover:text-folk-cobalt underline-offset-2 hover:underline">
          내 집 꾸미기
        </Link>
      </div>
    </div>
  );
}
