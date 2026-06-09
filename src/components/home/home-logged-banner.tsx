import Link from "next/link";
import { PenSquare, Compass } from "lucide-react";
import { ComposeOpenButton } from "@/components/compose/compose-open-button";
import { FolkBrushDivider } from "@/components/brand/folk-decor";
import { FolkThemeCelestial } from "@/components/brand/folk-theme-celestial";

export function HomeLoggedBanner() {
  return (
    <div className="folk-hero-banner !p-4 sm:!p-5 !mb-5">
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div>
          <p className="font-display font-bold text-lg text-folk-cobalt folk-chunky-text">
            오늘의 캔버스
          </p>
          <p className="text-sm text-folk-forest/80 mt-0.5">새 이야기를 그려 보세요</p>
        </div>
        <FolkThemeCelestial size={44} className="opacity-80 shrink-0" />
      </div>
      <FolkBrushDivider className="my-3 opacity-50" />
      <div className="flex flex-wrap gap-2 relative z-10">
        <ComposeOpenButton className="folk-nav-tile !flex-row !py-2 !px-4 gap-2 text-sm">
          <PenSquare className="h-4 w-4 text-folk-terracotta" />
          글쓰기
        </ComposeOpenButton>
        <Link href="/explore" className="folk-nav-tile !flex-row !py-2 !px-4 gap-2 text-sm">
          <Compass className="h-4 w-4 text-folk-cobalt" />
          탐색
        </Link>
      </div>
    </div>
  );
}
