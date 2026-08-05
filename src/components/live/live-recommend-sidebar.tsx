"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Heart, Home, LayoutGrid } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { localizedLiveCategoryLabel } from "@/lib/live-categories-i18n";
import type { LiveHubChannel, LiveHubHost } from "@/lib/live-hub-data";
import { cn } from "@/lib/utils";

function formatCompactViewers(n: number, locale: string) {
  if (n >= 10000) {
    const man = n / 10000;
    return locale.startsWith("ko")
      ? `${man >= 10 ? Math.round(man) : man.toFixed(1).replace(/\.0$/, "")}만`
      : `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}${locale.startsWith("ko") ? "천" : "K"}`;
  }
  return String(n);
}

export function LiveRecommendSidebar({
  recommendedStreamers,
  liveByHostId,
}: {
  recommendedStreamers: LiveHubHost[];
  liveByHostId: Record<string, LiveHubChannel>;
}) {
  const { locale, t } = useLocale();
  const [expanded, setExpanded] = useState(false);

  const ranked = useMemo(() => {
    return [...recommendedStreamers].sort((a, b) => {
      const aLive = liveByHostId[a.id] ? 1 : 0;
      const bLive = liveByHostId[b.id] ? 1 : 0;
      if (aLive !== bLive) return bLive - aLive;
      return b.followerCount - a.followerCount;
    });
  }, [recommendedStreamers, liveByHostId]);

  const visible = expanded ? ranked : ranked.slice(0, 8);

  return (
    <aside className="rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm">
      <nav className="flex border-b border-border/60">
        <Link
          href="/live"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold bg-muted/50 text-foreground"
        >
          <Home className="h-3.5 w-3.5" />
          {t("live.sideHome")}
        </Link>
        <Link
          href="/live"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          {t("live.sideBrowse")}
        </Link>
        <Link
          href="/feed"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Heart className="h-3.5 w-3.5" />
          {t("live.sideFollowing")}
        </Link>
      </nav>

      <div className="p-3 space-y-2">
        <h3 className="text-sm font-bold px-1">{t("live.tailoredRecs")}</h3>
        {visible.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1 py-4">
            {t("live.noRecommendations")}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {visible.map((host) => {
              const live = liveByHostId[host.id];
              const href = live ? `/voice/${live.id}` : `/u/${host.username}`;
              return (
                <li key={host.id}>
                  <Link
                    href={href}
                    className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-muted/60 transition-colors"
                  >
                    <div className="relative h-9 w-9 shrink-0">
                      <div className="h-9 w-9 rounded-full overflow-hidden bg-muted ring-2 ring-[hsl(var(--folk-cobalt)/0.2)]">
                        {host.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={host.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                            {host.username.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      {live ? (
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{host.username}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {live
                          ? localizedLiveCategoryLabel(live.category, locale)
                          : t("live.followers", {
                              count: host.followerCount.toLocaleString(),
                            })}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {live ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {formatCompactViewers(live.viewerCount, locale)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">OFF</span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {ranked.length > 8 ? (
          <div className="flex items-center justify-between pt-1 px-1">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className={cn(
                "text-[11px] font-medium text-muted-foreground hover:text-foreground",
                expanded && "invisible"
              )}
            >
              {t("live.showMore")}
            </button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className={cn(
                "text-[11px] font-medium text-muted-foreground hover:text-foreground ml-auto",
                !expanded && "invisible"
              )}
            >
              {t("live.showLess")}
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
