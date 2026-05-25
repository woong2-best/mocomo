"use client";

import dynamic from "next/dynamic";
import { LiveChat } from "@/components/live/live-chat";
import { Users, Eye } from "lucide-react";
import Link from "next/link";

const LiveBroadcastStudio = dynamic(
  () => import("@/components/live/live-broadcast-studio").then((m) => m.LiveBroadcastStudio),
  { ssr: false, loading: () => <div className="aspect-video rounded-2xl bg-muted/40 animate-pulse" /> }
);

const LiveViewerPlayer = dynamic(
  () => import("@/components/live/live-viewer-player").then((m) => m.LiveViewerPlayer),
  { ssr: false, loading: () => <div className="aspect-video rounded-2xl bg-muted/40 animate-pulse" /> }
);

export function LiveStreamRoom({
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </span>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{channelName}</h1>
        <span className="text-sm text-muted-foreground flex items-center gap-1.5 ml-auto">
          <Eye className="h-4 w-4" />
          <strong className="text-foreground tabular-nums">{viewerCount}</strong>명 시청 중
        </span>
        {hostUsername && (
          <Link href={`/u/${hostUsername}`} className="text-sm text-primary hover:underline flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />@{hostUsername}
          </Link>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_minmax(280px,340px)] gap-4 items-start">
        <div className="min-w-0 rounded-2xl border border-border/60 bg-card/50 p-2 sm:p-3 shadow-sm">
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
