"use client";

import dynamic from "next/dynamic";
import { memo } from "react";
import { LiveChat } from "@/components/live/live-chat";
import { Eye, Users } from "lucide-react";
import Link from "next/link";

const LiveBroadcastStudio = dynamic(
  () => import("@/components/live/live-broadcast-studio").then((m) => m.LiveBroadcastStudio),
  { ssr: false, loading: () => <div className="aspect-video rounded-2xl bg-zinc-900 animate-pulse" /> }
);

const LiveViewerPlayer = dynamic(
  () => import("@/components/live/live-viewer-player").then((m) => m.LiveViewerPlayer),
  { ssr: false, loading: () => <div className="aspect-video rounded-2xl bg-zinc-900 animate-pulse" /> }
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
    <div className="space-y-4 rounded-3xl border border-white/10 bg-[#0f0f12] p-3 sm:p-5 text-white shadow-2xl">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-600 text-xs font-bold">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </span>
        <h1 className="text-lg sm:text-xl font-bold tracking-tight flex-1 min-w-0 truncate">
          {channelName}
        </h1>
        <span className="text-sm text-zinc-400 flex items-center gap-1.5 tabular-nums">
          <Eye className="h-4 w-4" />
          {viewerCount}
        </span>
        {hostUsername && (
          <Link
            href={`/u/${hostUsername}`}
            className="text-sm text-violet-400 hover:underline flex items-center gap-1"
          >
            <Users className="h-3.5 w-3.5" />@{hostUsername}
          </Link>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_minmax(280px,360px)] gap-4 items-start">
        <div className="min-w-0">
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
