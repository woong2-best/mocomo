"use client";

import dynamic from "next/dynamic";
import { memo } from "react";
import { LiveChat } from "@/components/live/live-chat";
import { Eye, Users, Radio } from "lucide-react";
import Link from "next/link";

const LiveBroadcastStudio = dynamic(
  () => import("@/components/live/live-broadcast-studio").then((m) => m.LiveBroadcastStudio),
  { ssr: false, loading: () => <div className="aspect-video rounded-2xl bg-muted animate-pulse" /> }
);

const LiveViewerPlayer = dynamic(
  () => import("@/components/live/live-viewer-player").then((m) => m.LiveViewerPlayer),
  { ssr: false, loading: () => <div className="aspect-video rounded-2xl bg-muted animate-pulse" /> }
);

function LiveStreamRoomInner({
  channelId,
  channelName,
  hostUserId,
  hostUsername,
  isHost,
  viewerCount,
  onViewerCount,
  onEndStream,
}: {
  channelId: string;
  channelName: string;
  hostUserId: string;
  hostUsername?: string;
  isHost: boolean;
  viewerCount: number;
  onViewerCount?: (n: number) => void;
  onEndStream: () => void;
}) {
  return (
    <div className="live-studio-panel space-y-4 p-3 sm:p-5">
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-4">
        <span className="live-badge text-xs px-3 py-1">
          <Radio className="h-3 w-3" />
          LIVE
        </span>
        {isHost && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
            방송 중 (호스트)
          </span>
        )}
        <h1 className="text-lg sm:text-xl font-bold tracking-tight flex-1 min-w-0 truncate text-foreground">
          {channelName}
        </h1>
        <span className="text-sm text-muted-foreground flex items-center gap-1.5 tabular-nums">
          <Eye className="h-4 w-4 text-red-500" />
          <strong className="text-foreground">{viewerCount}</strong> 시청
        </span>
        {hostUsername && (
          <Link
            href={`/u/${hostUsername}`}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            <Users className="h-3.5 w-3.5" />@{hostUsername}
          </Link>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_minmax(280px,360px)] gap-4 items-start">
        <div className="min-w-0 rounded-2xl overflow-hidden ring-1 ring-border/50">
          {isHost ? (
            <LiveBroadcastStudio channelId={channelId} onEndStream={onEndStream} />
          ) : (
            <LiveViewerPlayer channelId={channelId} hostUserId={hostUserId} />
          )}
        </div>
        <LiveChat channelId={channelId} viewerCount={viewerCount} onViewerCount={onViewerCount} />
      </div>
    </div>
  );
}

export const LiveStreamRoom = memo(LiveStreamRoomInner);
