"use client";

import { type ReactNode } from "react";
import { LiveR18DeepLinkGuard } from "@/components/live/live-r18-deep-link-guard";
import { LivePageChrome } from "@/components/live/live-page-chrome";
import { LiveSidebarHubSync } from "@/components/live/live-sidebar-hub-sync";
import type { LiveStreamCategory } from "@prisma/client";
import type { LiveHubChannel, LiveHubHost } from "@/lib/live-hub-data";

export function LiveHub({
  channelFeed,
}: {
  recommendedStreamers?: LiveHubHost[];
  followedLive?: LiveHubChannel[];
  followedHosts?: LiveHubHost[];
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
  return (
    <LivePageChrome>
      <LiveSidebarHubSync />
      <LiveR18DeepLinkGuard />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{channelFeed}</div>
      </div>
    </LivePageChrome>
  );
}
