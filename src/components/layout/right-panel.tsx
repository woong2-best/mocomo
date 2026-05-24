import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Tv, Megaphone } from "lucide-react";
import { getTipRanking } from "@/actions/monetization";
import { sanitizeAdLink, isExternalUrl } from "@/lib/safe-link";

export async function RightPanel() {
  let animes: { id: string; slug: string; title: string; coverUrl: string | null }[] = [];
  let tips: Awaited<ReturnType<typeof getTipRanking>> = [];
  let sidebarAds: { id: string; title: string; imageUrl: string; linkUrl: string; ctaLabel: string | null }[] = [];

  try {
    [animes, tips, sidebarAds] = await Promise.all([
      db.anime.findMany({ take: 5, orderBy: { followerCount: "desc" } }),
      getTipRanking(5),
      db.adSlot.findMany({
        where: { active: true, position: "right" },
        take: 2,
        select: { id: true, title: true, imageUrl: true, linkUrl: true, ctaLabel: true },
      }),
    ]);
  } catch {
    animes = [];
    tips = [];
    sidebarAds = [];
  }

  return (
    <aside className="hidden xl:block w-72 shrink-0 p-4 space-y-3 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto bg-muted/20 border-l border-border">
      {sidebarAds.length > 0 && (
        <Card className="rounded-2xl shadow-sm border-amber-500/20 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 font-semibold text-amber-600">
              <Megaphone className="h-4 w-4" />
              Sponsored
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sidebarAds.map((ad) => {
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
      )}

      <Card className="rounded-2xl shadow-sm border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 font-semibold">
            <Tv className="h-4 w-4 text-[#1e88e5]" />
            인기 애니
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {animes.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              <Link href="/anime/new" className="text-primary hover:underline">
                애니 등록하기
              </Link>
            </p>
          ) : (
            animes.map((a) => (
              <Link
                key={a.id}
                href={`/anime/${a.slug}`}
                className="block text-sm hover:text-[#1e88e5] truncate py-0.5"
              >
                {a.title}
              </Link>
            ))
          )}
          <Link href="/anime" className="text-xs font-medium text-[#5e35b1] hover:underline">
            더보기
          </Link>
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
            <p className="text-xs text-muted-foreground">아직 후원 랭킹이 없습니다</p>
          ) : (
            tips.map((t) => (
              <div key={t.rank} className="flex justify-between text-xs py-0.5">
                <span>#{t.rank} {t.user?.username}</span>
                <span className="text-muted-foreground tabular-nums">
                  {(t.total ?? 0).toLocaleString()}원
                </span>
              </div>
            ))
          )}
          <Link href="/rankings" className="text-xs font-medium text-[#5e35b1] hover:underline">
            더보기
          </Link>
        </CardContent>
      </Card>
    </aside>
  );
}
