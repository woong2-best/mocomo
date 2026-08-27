"use client";

import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { LiveChat } from "@/components/live/live-chat";
import { LiveChatProvider } from "@/components/live/live-chat-provider";
import { LiveSupportProvider } from "@/components/live/live-support-provider";

const LiveViewerPlayer = dynamic(
  () => import("@/components/live/live-viewer-player").then((m) => m.LiveViewerPlayer),
  { ssr: false, loading: () => <Loader2 className="h-6 w-6 animate-spin" /> }
);

export function LiveChannelStudio({
  channelId,
  channelName,
  isOwner,
}: {
  channelId: string;
  channelName: string;
  isOwner: boolean;
  communitySlug: string;
}) {
  const { data: session } = useSession();

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-4 min-h-[400px]">
      <div className="rounded-xl border border-border overflow-hidden bg-black/90 aspect-video flex items-center justify-center">
        <LiveViewerPlayer channelId={channelId} />
      </div>
      <div className="rounded-xl border border-border flex flex-col min-h-[300px]">
        <div className="px-3 py-2 border-b border-border text-sm font-medium">시청자 채팅</div>
        <LiveChatProvider channelId={channelId} userId={session?.user?.id}>
          <LiveSupportProvider
            channelId={channelId}
            isHost={isOwner}
            feedChat
            onAlert={() => {
              /* Community embed: alerts shown in chat feed only */
            }}
          >
            <div className="flex-1 min-h-[240px] flex flex-col">
              <LiveChat channelId={channelId} viewerCount={0} isHost={isOwner} canModerate={isOwner} />
            </div>
          </LiveSupportProvider>
        </LiveChatProvider>
      </div>
      {isOwner && (
        <p className="lg:col-span-2 text-xs text-muted-foreground">
          방장은 라이브 페이지에서 방송을 시작할 수 있습니다. OBS 연동은 설정에서 RTMP 키를 확인하세요.
        </p>
      )}
    </div>
  );
}
