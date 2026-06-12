"use client";

import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isGamesPath } from "@/lib/games-catalog";
import { useLocale } from "@/components/providers/locale-provider";

/** 사이드바 GAME — 게임 목록은 /games 페이지에서만 */
export function GamesNavSection({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const { t } = useLocale();
  const sectionActive = isGamesPath(pathname);

  return (
    <Link
      href="/games"
      onClick={onNavigate}
      className={cn("sidebar-block", sectionActive && "sidebar-block-active")}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg shrink-0 border-2",
          sectionActive
            ? "bg-folk-terracotta text-white border-folk-cobalt/40 shadow-folk-sm"
            : "bg-folk-cream border-folk-cobalt/15 text-folk-cobalt"
        )}
      >
        <Gamepad2 className="h-4 w-4" />
      </span>
      <span className="truncate font-semibold">{t("nav.games")}</span>
    </Link>
  );
}
