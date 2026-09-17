"use client";

import { Suspense, type ReactNode } from "react";
import { LiveBeadFeed } from "@/components/live/live-bead-feed";
import { LiveFolderChips } from "@/components/live/live-folder-chips";
import { LiveHeroSpotlight } from "@/components/live/live-hero-spotlight";
import { Radio } from "lucide-react";
import { LivePageActions } from "@/components/live/live-page-actions";
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
  const showFollowing = view === "following";
  const followedHostMap = Object.fromEntries(followedHosts.map((h) => [h.id, h]));

  return (
    <LivePageChrome>
      <LiveR18DeepLinkGuard />
      <header className="live-hero live-hub-header flex flex-wrap items-center justify-between gap-4 !py-4 !px-5 shrink-0">
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

      <div className="min-w-0 mt-1 flex-1 min-h-0 flex flex-col">
        {showFollowing ? (
          <div className="flex flex-col gap-2.5 min-h-0 flex-1 w-full">
            <Suspense fallback={<div className="h-[70px] rounded-xl bg-black/20 animate-pulse" />}>
              <LiveFolderChips />
            </Suspense>
            <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 items-stretch min-h-0 flex-1 w-full">
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <LiveHeroSpotlight channels={followedLive} hostMap={followedHostMap} />
              </div>
              <LiveBeadFeed channels={followedLive} hosts={followedHosts} />
            </div>
          </div>
        ) : (
          channelFeed
        )}
      </div>
    </LivePageChrome>
  );
}
