"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { Loader2, Mic, MicOff, Headphones, Monitor, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCommunityVoice } from "@/components/community-server/community-voice-context";
import { cn } from "@/lib/utils";

const LivekitVoiceRoom = dynamic(
  () => import("@/components/voice/livekit-voice-room").then((m) => m.LivekitVoiceRoom),
  { ssr: false, loading: () => <ChannelLoading label="음성 채널 연결 중..." /> }
);

const LivekitVideoRoom = dynamic(
  () => import("@/components/community-server/channels/livekit-video-room").then((m) => m.LivekitVideoRoom),
  { ssr: false, loading: () => <ChannelLoading label="영상 채널 연결 중..." /> }
);

function ChannelLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />
      {label}
    </div>
  );
}

export function VoiceChannelView({
  channelId,
  channelName,
  channelType,
  maxUsers,
}: {
  channelId: string;
  channelName: string;
  channelType: "VOICE" | "VIDEO";
  maxUsers?: number | null;
}) {
  const { voice, connect, disconnect, setMuted, setDeafened } = useCommunityVoice();
  const isConnected = voice.connected && voice.channelId === channelId;

  useEffect(() => {
    return () => {
      if (voice.channelId === channelId) disconnect();
    };
  }, [channelId, disconnect, voice.channelId]);

  const handleJoin = () => {
    connect({
      channelId,
      channelName,
      channelType,
      muted: false,
      deafened: false,
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 px-4 py-3 border-b border-border/50 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold">{channelName}</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            최대 {maxUsers ?? 25}명 · LiveKit
          </p>
        </div>
        {!isConnected ? (
          <Button size="sm" onClick={handleJoin}>
            참가하기
          </Button>
        ) : (
          <Button size="sm" variant="destructive" onClick={disconnect}>
            나가기
          </Button>
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {!isConnected ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center space-y-4">
            <p className="text-muted-foreground text-sm">
              {channelType === "VOICE" ? "음성 채널에 참가하려면 버튼을 누르세요." : "영상 채널에 참가하려면 버튼을 누르세요."}
            </p>
            <Button onClick={handleJoin}>참가하기</Button>
          </div>
        ) : channelType === "VOICE" ? (
          <LivekitVoiceRoom channelId={channelId} channelName={channelName} />
        ) : (
          <LivekitVideoRoom channelId={channelId} channelName={channelName} />
        )}
      </div>

      {isConnected && (
        <div className="shrink-0 flex items-center justify-center gap-2 p-3 border-t border-border/50 bg-muted/30">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className={cn(voice.muted && "bg-destructive/20")}
            onClick={() => setMuted(!voice.muted)}
          >
            {voice.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className={cn(voice.deafened && "bg-destructive/20")}
            onClick={() => setDeafened(!voice.deafened)}
          >
            <Headphones className="h-4 w-4" />
          </Button>
          {channelType === "VIDEO" && (
            <Button type="button" size="icon" variant="outline" title="화면 공유">
              <Monitor className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
