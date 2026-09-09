"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LiveStreamCardMemo } from "@/components/live/live-channel-grid";
import {
  Radio,
  Heart,
  BadgeCheck,
  Calendar,
  User,
} from "lucide-react";
import { LivePageActions } from "@/components/live/live-page-actions";
import { LiveCategoryFilter } from "@/components/live/live-category-filter";
import { LiveScheduledCard } from "@/components/live/live-scheduled-card";
import type { LiveStreamCategory } from "@prisma/client";
import type { LiveHubChannel, LiveHubHost } from "@/lib/live-hub-data";
import { LivePageChrome, LivePageTitle } from "@/components/live/live-page-chrome";
import { useLocale } from "@/components/providers/locale-provider";

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
  view = "explore",
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
  view?: "explore" | "following";
}) {
  const { t } = useLocale();
  const followedHostMap = Object.fromEntries(followedHosts.map((h) => [h.id, h]));

  const showFollowing = view === "following";

  return (
    <LivePageChrome>
      <header className="live-hero live-hub-header flex flex-wrap items-center justify-between gap-4 !py-4 !px-5">
        <LivePageTitle>
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2.5 tracking-tight text-white drop-shadow-md">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-folk-terracotta text-white shadow-md">
              <Radio className="h-5 w-5" />
            </span>
            {t("nav.live")}
          </h1>
        </LivePageTitle>
        <div className="[&_button]:rounded-xl shrink-0 ml-auto">
          <LivePageActions variant="header" />
        </div>
      </header>

      <LiveCategoryFilter />

      <div className="space-y-8 min-w-0">
        {scheduledStreams.length > 0 && !showFollowing ? (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t("live.scheduled")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
        ) : null}

        {(showFollowing || followedLive.length > 0) && (
          <section>
            <h2 className="text-base font-bold tracking-tight mb-4 flex items-center gap-2">
              <Heart className="h-4 w-4 text-folk-terracotta" />
              {t("live.followedLive")} · {followedLive.length}
            </h2>
            {followedLive.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6">{t("live.followingEmpty")}</p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {followedLive.map((ch) => (
                  <LiveStreamCardMemo key={ch.id} ch={ch} host={followedHostMap[ch.createdBy]} />
                ))}
              </div>
            )}
          </section>
        )}

        {!showFollowing ? channelFeed : null}

        {recommendedStreamers.length > 0 ? (
          <section>
            <h2 className="text-base font-bold tracking-tight mb-3">
              {t("live.recommendedStreamers")}
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {recommendedStreamers.map((h) => (
                <StreamerChip key={h.id} host={h} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </LivePageChrome>
  );
}
