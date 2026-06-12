"use client";

import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSortedGames, isGamesPath } from "@/lib/games-catalog";
import { useLocale } from "@/components/providers/locale-provider";

export function GamesNavSection({
  pathname,
  onNavigate,
  variant = "sidebar",
}: {
  pathname: string;
  onNavigate?: () => void;
  variant?: "sidebar" | "drawer";
}) {
  const { t } = useLocale();
  const games = getSortedGames();
  const sectionActive = isGamesPath(pathname);

  return (
    <div className={cn("space-y-2", variant === "drawer" && "pt-1")}>
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

      <div className="grid grid-cols-3 gap-1.5 px-0.5">
        {games.map((game) => {
          const active = pathname === game.href || pathname.startsWith(`${game.href}/`);
          const Icon = game.icon;
          return (
            <Link
              key={game.id}
              href={game.href}
              onClick={onNavigate}
              title={game.name}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-xl border-2 p-2 min-h-[4.25rem] text-center transition-colors",
                active
                  ? "border-folk-terracotta/60 bg-folk-terracotta/10 text-folk-cobalt"
                  : "border-folk-cobalt/15 bg-folk-cream/80 text-folk-cobalt hover:border-folk-cobalt/30 hover:bg-folk-gold/10"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg border shrink-0",
                  active
                    ? "bg-folk-terracotta text-white border-folk-cobalt/30"
                    : "bg-white/80 border-folk-cobalt/10"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="text-[10px] font-medium leading-tight line-clamp-2">{game.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
