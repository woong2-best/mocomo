"use client";

import type { ReactNode } from "react";
import { LiveStreamCardMemo } from "@/components/live/live-channel-grid";
import { LivePopularCategories } from "@/components/live/live-popular-categories";
import { Radio, Heart } from "lucide-react";
import { LivePageActions } from "@/components/live/live-page-actions";
import { LiveCategoryFilter } from "@/components/live/live-category-filter";
import { LiveR18DeepLinkGuard } from "@/components/live/live-r18-deep-link-guard";
import type { LiveStreamCategory } from "@prisma/client";
import type { LiveHubChannel, LiveHubHost } from "@/lib/live-hub-data";
import { LivePageChrome, LivePageTitle } from "@/components/live/live-page-chrome";
import { useLocale } from "@/components/providers/locale-provider";

export function LiveHub({
  followedLive,
  followedHosts,
  channelFeed,
  view = "explore",
}: {
  recommendedStreamers?: LiveHubHost[];
  followedLive: LiveHubChannel[];
  followedHosts: LiveHubHost[];
  scheduledStreams?: {
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
      <LiveR18DeepLinkGuard />
      {/* Full-width banner + go-live actions (original) */}
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

      <div className="min-w-0 mt-1 flex flex-col lg:flex-row gap-3 lg:gap-4 items-start">
        <div className="min-w-0 flex-1">
          {showFollowing ? (
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
                    <LiveStreamCardMemo
                      key={ch.id}
                      ch={ch}
                      host={followedHostMap[ch.createdBy]}
                    />
                  ))}
                </div>
              )}
            </section>
          ) : (
            channelFeed
          )}
        </div>

        {/* Folder grid — position kept; no Browse/Following/Schedule buttons */}
        <LivePopularCategories viewerByCategory={{}} variant="sidebar" />
      </div>
    </LivePageChrome>
  );
}
