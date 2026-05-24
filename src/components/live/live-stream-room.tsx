"use client";

import { LivekitVoiceRoom } from "@/components/voice/livekit-voice-room";
import { LiveChat } from "@/components/live/live-chat";
import { Radio, Users } from "lucide-react";
import Link from "next/link";

export function LiveStreamRoom({
  channelId,
  channelName,
  isLive,
  memberCount,
  hostUsername,
}: {
  channelId: string;
  channelName: string;
  isLive: boolean;
  memberCount: number;
  hostUsername?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {isLive && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-bold">
            <Radio className="h-3 w-3 animate-pulse" />
            LIVE
          </span>
        )}
        <h1 className="text-xl font-bold">{channelName}</h1>
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <Users className="h-4 w-4" />
          {memberCount}명
        </span>
        {hostUsername && (
          <Link href={`/u/${hostUsername}`} className="text-sm text-primary hover:underline">
            @{hostUsername}
          </Link>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="min-w-0">
          <LivekitVoiceRoom channelId={channelId} channelName={channelName} />
        </div>
        <LiveChat channelId={channelId} />
      </div>
    </div>
  );
}
