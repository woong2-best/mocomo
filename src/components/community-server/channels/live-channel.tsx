import Link from "next/link";
import dynamic from "next/dynamic";
import { Radio, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";

const LiveChannelStudio = dynamic(
  () => import("@/components/community-server/channels/live-channel-studio").then((m) => m.LiveChannelStudio),
  { ssr: false }
);

export async function LiveChannelView({
  voiceChannelId,
  channelName,
  communitySlug,
  isOwner,
}: {
  voiceChannelId: string;
  channelName: string;
  communitySlug: string;
  isOwner: boolean;
}) {
  const channel = await db.voiceChannel.findUnique({
    where: { id: voiceChannelId },
    select: {
      id: true,
      isLive: true,
      liveStatus: true,
      broadcastMode: true,
      rtmpUrl: true,
      rtmpStreamKey: true,
      name: true,
    },
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 px-4 py-3 border-b border-border/50 flex items-center justify-between gap-3">
        <h1 className="font-semibold flex items-center gap-2">
          <Radio className="h-5 w-5 text-red-500" />
          {channelName}
        </h1>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/live/${voiceChannelId}`}>
            <ExternalLink className="h-4 w-4 mr-1" />
            라이브 페이지
          </Link>
        </Button>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {channel?.broadcastMode === "OBS" && channel.rtmpUrl && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm space-y-2">
            <p className="font-medium">OBS 연동</p>
            <p className="text-muted-foreground text-xs">서버 URL: {channel.rtmpUrl}</p>
            {isOwner && channel.rtmpStreamKey && (
              <p className="text-muted-foreground text-xs font-mono break-all">
                Stream Key: {channel.rtmpStreamKey}
              </p>
            )}
          </div>
        )}
        <LiveChannelStudio
          channelId={voiceChannelId}
          channelName={channelName}
          isOwner={isOwner}
          communitySlug={communitySlug}
        />
      </div>
    </div>
  );
}
