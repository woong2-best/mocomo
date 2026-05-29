import Link from "next/link";
import type { SupportTierLevel } from "@prisma/client";
import { FALLBACK_SIDEBAR_ADS } from "@/lib/default-ads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Tv, Megaphone } from "lucide-react";
import { sanitizeAdLink, isExternalUrl } from "@/lib/safe-link";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";

export type SidebarPanelData = {
  animes: { id: string; slug: string; title: string; viewCount: number }[];
  tips: {
    rank: number;
    total: number;
    user?: {
      id: string;
      username: string;
      image: string | null;
      supportTierSent: SupportTierLevel;
    } | null;
  }[];
  sidebarAds: { id: string; title: string; imageUrl: string; linkUrl: string; ctaLabel: string | null }[];
};

export function RightPanelSkeleton() {
  return (
    <aside className="hidden xl:block w-72 shrink-0 p-4 space-y-3 sticky top-14 h-[calc(100vh-3.5rem)] overflow-hidden bg-muted/20 border-l border-border animate-pulse">
      <div className="h-48 rounded-2xl bg-muted" />
      <div className="h-36 rounded-2xl bg-muted" />
      <div className="h-36 rounded-2xl bg-muted" />
    </aside>
  );
}

export function RightPanelContent({ animes, tips, sidebarAds }: SidebarPanelData) {
  const ads =
    sidebarAds.length > 0
      ? sidebarAds
      : FALLBACK_SIDEBAR_ADS.map((a) => ({ ...a, ctaLabel: a.ctaLabel ?? null }));

  return (
    <aside className="hidden xl:block w-72 shrink-0 p-4 space-y-3 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto bg-muted/20 border-l border-border">
      <Card className="rounded-2xl shadow-sm border-amber-500/20 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 font-semibold text-amber-600">
            <Megaphone className="h-4 w-4" />
            Sponsored
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ads.map((ad) => {
            const href = sanitizeAdLink(ad.linkUrl);
            const external = isExternalUrl(href);
            return (
              <Link
                key={ad.id}
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="block rounded-xl overflow-hidden border border-border/60 hover:border-primary/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ad.imageUrl} alt={ad.title} className="w-full aspect-[4/3] object-cover" />
                <p className="text-xs p-2 font-medium">{ad.title}</p>
              </Link>
            );
          })}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 font-semibold">
            <Tv className="h-4 w-4 text-[#1e88e5]" />
            인기 애니
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {animes.length === 0 ? (
            <Link href="/anime" className="text-xs text-primary hover:underline">
              애니 허브 가기 →
            </Link>
          ) : (
            animes.map((a, i) => (
              <Link
                key={a.id}
                href={`/anime/${a.slug}`}
                className="flex items-baseline gap-2 text-sm hover:text-[#1e88e5] min-w-0 group"
              >
                <span className="shrink-0 w-5 text-right font-semibold tabular-nums text-[#1e88e5] group-hover:underline">
                  {i + 1}
                </span>
                <span className="truncate">{a.title}</span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 font-semibold">
            <TrendingUp className="h-4 w-4 text-[#fb8c00]" />
            후원 랭킹
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tips.length === 0 ? (
            <p className="text-xs text-muted-foreground">아직 랭킹 없음</p>
          ) : (
            tips.map((t) => (
              <div key={t.rank} className="flex justify-between items-center gap-2 text-xs">
                <span className="flex items-center gap-1 min-w-0">
                  <span className="shrink-0">#{t.rank}</span>
                  {t.user ? (
                    <DisplayNameWithSupportTier
                      name={t.user.username}
                      tier={t.user.supportTierSent ?? "PEBBLE"}
                      compact
                      className="min-w-0"
                    />
                  ) : (
                    "—"
                  )}
                </span>
                <span className="text-muted-foreground">{(t.total ?? 0).toLocaleString()}원</span>
              </div>
            ))
          )}
          <Link href="/rankings" className="text-xs text-primary hover:underline">
            더보기
          </Link>
        </CardContent>
      </Card>
    </aside>
  );
}
