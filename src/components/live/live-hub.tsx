"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LiveStreamCardMemo } from "@/components/live/live-channel-grid";
import {
  Eye,
  Radio,
  User,
  Video,
  MessageSquare,
  Shield,
  Search,
  Users,
  Heart,
  TrendingUp,
  BadgeCheck,
  Calendar,
} from "lucide-react";
import { LivePageActions } from "@/components/live/live-page-actions";
import { LiveCategoryFilter } from "@/components/live/live-category-filter";
import { LiveScheduledCard } from "@/components/live/live-scheduled-card";
import type { LiveStreamCategory } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { LiveHubChannel, LiveHubHost } from "@/lib/live-hub-data";
import { COMMUNITY_FEED_PATH } from "@/lib/site-routes";
import { LivePageChrome, LivePageTitle } from "@/components/live/live-page-chrome";
import { useLocale } from "@/components/providers/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

const FEATURE_KEYS: { icon: typeof Video; key: MessageKey }[] = [
  { icon: Video, key: "live.feature.webcam" },
  { icon: MessageSquare, key: "live.feature.chat" },
  { icon: Shield, key: "live.feature.moderation" },
  { icon: Eye, key: "live.feature.support" },
];

function StreamerChip({ host }: { host: LiveHubHost }) {
  const { t } = useLocale();

  return (
    <Link
      href={`/u/${host.username}`}
      className="flex items-center gap-2 shrink-0 rounded-xl border border-border/60 bg-card px-3 py-2 hover:border-primary/30 transition-colors"
    >
      <div className="h-9 w-9 rounded-[28%] bg-muted overflow-hidden shrink-0 ring-2 ring-[hsl(var(--folk-cobalt)/0.28)]">
        {host.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={host.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            <User className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate flex items-center gap-1">
          @{host.username}
          {host.isPartner && <BadgeCheck className="h-3.5 w-3.5 text-sky-500" />}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {t("live.followers", { count: host.followerCount.toLocaleString() })}
        </p>
      </div>
    </Link>
  );
}

export function LiveHub({
  recommendedStreamers,
  followedLive,
  followedHosts,
  scheduledStreams,
  currentUserId,
  channelFeed,
}: {
  recommendedStreamers: LiveHubHost[];
  followedLive: LiveHubChannel[];
  followedHosts: LiveHubHost[];
  scheduledStreams: {
    id: string;
    name: string;
    createdBy: string;
    scheduledAt: Date;
    category: LiveStreamCategory;
    thumbnailUrl: string | null;
    broadcastMode?: string | null;
  }[];
  currentUserId?: string;
  channelFeed: ReactNode;
}) {
  const { t } = useLocale();
  const followedHostMap = Object.fromEntries(followedHosts.map((h) => [h.id, h]));

  return (
    <LivePageChrome>
      <header className="live-hero flex flex-wrap items-start justify-between gap-4">
        <LivePageTitle>
          <div className="space-y-3 min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2 tracking-tight">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-folk-terracotta text-white shadow-md">
                <Radio className="h-5 w-5" />
              </span>
              {t("nav.live")}
            </h1>
            <p className="text-sm text-muted-foreground max-w-lg">{t("live.heroDesc")}</p>
            <div className="flex flex-wrap gap-2">
              {FEATURE_KEYS.map(({ icon: Icon, key }) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-background/80 dark:bg-white/5 border border-border/60 text-muted-foreground"
                >
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {t(key)}
                </span>
              ))}
            </div>
          </div>
        </LivePageTitle>
        <div className="[&_button]:rounded-xl shrink-0 ml-auto">
          <LivePageActions variant="header" />
        </div>
      </header>

      <form action="/search" method="get" className="flex gap-2 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            placeholder={t("live.searchPlaceholder")}
            className="pl-9 rounded-xl"
            minLength={2}
          />
        </div>
        <Button type="submit" variant="secondary" className="rounded-xl shrink-0">
          {t("common.search")}
        </Button>
      </form>

      <LiveCategoryFilter />

      {scheduledStreams.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t("live.scheduled")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scheduledStreams.map((s) => (
              <LiveScheduledCard
                key={s.id}
                id={s.id}
                name={s.name}
                scheduledAt={s.scheduledAt}
                category={s.category}
                broadcastMode={s.broadcastMode}
                isOwner={currentUserId === s.createdBy}
              />
            ))}
          </div>
        </section>
      )}

      {followedLive.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Heart className="h-4 w-4 text-folk-terracotta" />
            {t("live.followedLive")} · {followedLive.length}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {followedLive.map((ch) => (
              <LiveStreamCardMemo key={ch.id} ch={ch} host={followedHostMap[ch.createdBy]} />
            ))}
          </div>
        </section>
      )}

      {channelFeed}

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          {t("live.recommendedStreamers")}
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {recommendedStreamers.map((h) => (
            <StreamerChip key={h.id} host={h} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card/50 p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t("live.followFeed")}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{t("live.followFeedDesc")}</p>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href={COMMUNITY_FEED_PATH}>{t("live.goHomeFeed")}</Link>
        </Button>
      </section>
    </LivePageChrome>
  );
}
