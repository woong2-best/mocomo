"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, Headphones, Monitor, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCommunityVoice } from "@/components/community-server/community-voice-context";
import {
  CommunityLivekitRoom,
  fetchCommunityVoiceToken,
  type CommunityLivekitCreds,
} from "@/components/community-server/channels/community-livekit-room";
import { cn } from "@/lib/utils";

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
  const isInChannel = voice.channelId === channelId;
  const [prefetched, setPrefetched] = useState<CommunityLivekitCreds | null>(null);
  const [joining, setJoining] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const prefetchStarted = useRef(false);

  // 채널 화면 들어오자마자 토큰 미리 발급 → 참가 클릭 즉시 연결
  useEffect(() => {
    if (prefetchStarted.current) return;
    prefetchStarted.current = true;
    void fetchCommunityVoiceToken(channelId, channelType)
      .then(setPrefetched)
      .catch(() => undefined);
  }, [channelId, channelType]);

  useEffect(() => {
    return () => {
      if (voice.channelId === channelId) disconnect();
    };
  }, [channelId, disconnect, voice.channelId]);

  const handleJoin = useCallback(async () => {
    setJoining(true);
    try {
      let creds = prefetched;
      if (!creds) {
        creds = await fetchCommunityVoiceToken(channelId, channelType);
        setPrefetched(creds);
      }
      connect({
        channelId,
        channelName,
        channelType,
        muted: false,
        deafened: false,
      });
    } catch {
      setJoining(false);
    }
  }, [prefetched, channelId, channelType, channelName, connect]);

  const handleLeave = useCallback(() => {
    setJoining(false);
    setLiveConnected(false);
    disconnect();
  }, [disconnect]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 px-4 py-3 border-b border-border/50 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold">{channelName}</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            최대 {maxUsers ?? 25}명 · LiveKit
            {prefetched && !isInChannel && (
              <span className="text-emerald-600">· 준비됨</span>
            )}
          </p>
        </div>
        {!isInChannel ? (
          <Button size="sm" onClick={handleJoin} disabled={joining}>
            {joining ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                연결 중
              </>
            ) : (
              "참가하기"
            )}
          </Button>
        ) : (
          <Button size="sm" variant="destructive" onClick={handleLeave}>
            나가기
          </Button>
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {!isInChannel ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center space-y-4">
            <p className="text-muted-foreground text-sm">
              {channelType === "VOICE"
                ? "음성 채널에 참가하려면 버튼을 누르세요."
                : "영상 채널에 참가하려면 버튼을 누르세요."}
            </p>
            <Button onClick={handleJoin} disabled={joining}>
              {joining ? "연결 중..." : "참가하기"}
            </Button>
          </div>
        ) : (
          <CommunityLivekitRoom
            channelId={channelId}
            channelName={channelName}
            kind={channelType}
            muted={voice.muted}
            deafened={voice.deafened}
            prefetched={prefetched}
            onConnected={() => {
              setJoining(false);
              setLiveConnected(true);
            }}
            onDisconnected={handleLeave}
          />
        )}
      </div>

      {isInChannel && (
        <div className="shrink-0 flex items-center justify-center gap-2 p-3 border-t border-border/50 bg-muted/30">
          {!liveConnected && (
            <span className="text-xs text-muted-foreground flex items-center mr-2">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              연결 중
            </span>
          )}
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
