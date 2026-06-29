import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { getSupportDashboard, getSupportRankingWithAvatars } from "@/actions/support";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OreTierBadge } from "@/components/support/ore-tier-button";
import { PlatformSupportCard } from "@/components/support/platform-support-card";
import { SupportTierTable } from "@/components/support/support-tier-table";
import { SupportEmoticonsPanel } from "@/components/support/support-emoticons-panel";
import { SupportStoragePanel } from "@/components/support/support-storage-panel";
import { SupportGiftsPanel } from "@/components/support/support-gifts-panel";
import { MarketDbBannerAsync } from "@/components/market/market-db-banner-async";
import { SupportRankingPodium } from "@/components/support/support-ranking-podium";
import { SupportTrophyIcon } from "@/components/icons/support-trophy-icon";
import { SupportPageChrome, SupportPageTitle } from "@/components/support/support-page-chrome";
import { TabPanelSkeleton } from "@/components/ui/content-skeletons";
import { Send, Inbox, Sparkles, Archive, Gift, Gem } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { SupportTierLevel } from "@prisma/client";

const VALID_TABS = [
  "sent",
  "received",
  "tiers",
  "emoticons",
  "storage",
  "gifts",
] as const;

type SupportTab = (typeof VALID_TABS)[number];

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; price?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/support");

  const params = await searchParams;
  const tab: SupportTab = VALID_TABS.includes(params.tab as SupportTab)
    ? (params.tab as SupportTab)
    : "sent";
  const priceFilter = params.price;

  const [dashboard, rankingEntries] = await Promise.all([
    getSupportDashboard(),
    getSupportRankingWithAvatars(20),
  ]);
  if (!dashboard) {
    redirect("/auth/signin");
  }

  const tabs = [
    { id: "sent", label: "후원한 크리에이터", icon: Send },
    { id: "received", label: "받은 후원", icon: Inbox },
    { id: "emoticons", label: "이모티콘", icon: Sparkles },
    { id: "storage", label: "보관함", icon: Archive },
    { id: "gifts", label: "받은 선물", icon: Gift },
    { id: "tiers", label: "등급 안내", icon: Gem },
  ] as const;

  return (
    <SupportPageChrome>
      <SupportPageTitle>
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-folk-cobalt/15 bg-folk-cream text-folk-cobalt">
            <SupportTrophyIcon className="h-5 w-5" />
          </span>
          후원
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          크리에이터 후원 · 광석 등급 · 후원용 이모티콘 구매·선물
        </p>
      </div>
      </SupportPageTitle>

      <SupportRankingPodium entries={rankingEntries} />

      {(tab === "emoticons" || tab === "storage") && (
        <Suspense fallback={null}>
          <MarketDbBannerAsync />
        </Suspense>
      )}

      <nav className="flex border-b border-border/60 gap-1 overflow-x-auto scrollbar-none">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/support?tab=${t.id}`}
            className={`shrink-0 flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4 shrink-0" />
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "emoticons" && (
        <Suspense fallback={<TabPanelSkeleton />}>
          <SupportEmoticonsPanel priceFilter={priceFilter} />
        </Suspense>
      )}

      {tab === "storage" && (
        <Suspense fallback={<TabPanelSkeleton />}>
          <SupportStoragePanel />
        </Suspense>
      )}

      {tab === "gifts" && (
        <Suspense fallback={<TabPanelSkeleton />}>
          <SupportGiftsPanel />
        </Suspense>
      )}

      {tab === "sent" && dashboard && (
        <div className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">후원 중인 크리에이터</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.sentSupports.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  아직 후원한 크리에이터가 없습니다. 프로필에서 후원 버튼을 눌러보세요.
                </p>
              ) : (
                dashboard.sentSupports.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0"
                  >
                    <Link href={`/u/${s.creator.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar>
                        <AvatarImage src={s.creator.image ?? undefined} />
                        <AvatarFallback>{s.creator.username[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{s.creator.name || s.creator.username}</p>
                        <p className="text-sm text-muted-foreground">@{s.creator.username}</p>
                      </div>
                    </Link>
                    <OreTierBadge tier={s.tier as SupportTierLevel} />
                    <span className="text-sm font-semibold shrink-0">
                      {s.totalAmount.toLocaleString()}원
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">최근 후원 내역</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dashboard.sentTips.length === 0 ? (
                <p className="text-sm text-muted-foreground">후원 내역 없음</p>
              ) : (
                dashboard.sentTips.map((t) => (
                  <div key={t.id} className="text-sm py-2 border-b border-border/40 last:border-0">
                    <Link href={`/u/${t.receiver.username}`} className="font-medium text-primary">
                      @{t.receiver.username}
                    </Link>
                    <span className="text-muted-foreground">
                      {" "}
                      · {t.amount.toLocaleString()}원 ·{" "}
                      {formatDistanceToNow(t.createdAt, { addSuffix: true, locale: ko })}
                    </span>
                    {t.message && <p className="text-muted-foreground mt-0.5">{t.message}</p>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "received" && dashboard && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">받은 후원 ({dashboard.receivedTipCount}건)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboard.receivedTips.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                받은 후원이 없습니다. 프로필을 공유해 팬들의 후원을 받아보세요.
              </p>
            ) : (
              dashboard.receivedTips.map((t) => (
                <div key={t.id} className="text-sm py-2 border-b border-border/40 last:border-0">
                  <Link href={`/u/${t.sender.username}`} className="font-medium text-primary">
                    @{t.sender.username}
                  </Link>
                  <span className="text-muted-foreground">
                    {" "}
                    · +{t.amount.toLocaleString()}원 ·{" "}
                    {formatDistanceToNow(t.createdAt, { addSuffix: true, locale: ko })}
                  </span>
                  {t.message && <p className="mt-0.5">{t.message}</p>}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {tab === "tiers" && dashboard && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">광석 등급표 (19단계)</CardTitle>
          </CardHeader>
          <CardContent>
            <SupportTierTable />
          </CardContent>
        </Card>
      )}

      {dashboard?.platform && (
        <PlatformSupportCard
          sentTotal={dashboard.platform.sentTotal}
          sentTier={dashboard.platform.sentTier}
          receivedTotal={dashboard.platform.receivedTotal}
          receivedTier={dashboard.platform.receivedTier}
        />
      )}
    </SupportPageChrome>
  );
}
