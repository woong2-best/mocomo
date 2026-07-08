"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Mic,
  MicOff,
  Headphones,
  Video,
  VideoOff,
  Monitor,
  Users,
} from "lucide-react";
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
  maxUsers,
}: {
  channelId: string;
  channelName: string;
  /** @deprecated 영상은 하단 카메라 토글로 처리 */
  channelType?: "VOICE" | "VIDEO";
  maxUsers?: number | null;
}) {
  const { voice, connect, disconnect, setMuted, setDeafened } = useCommunityVoice();
  const isInChannel = voice.channelId === channelId;
  const [prefetched, setPrefetched] = useState<CommunityLivekitCreds | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchCommunityVoiceToken(channelId)
      .then((c) => {
        if (!cancelled) setPrefetched(c);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  useEffect(() => {
    return () => {
      if (voice.channelId === channelId) disconnect();
    };
  }, [channelId, disconnect, voice.channelId]);

  const handleJoin = useCallback(() => {
    setJoinError(null);
    setLiveConnected(false);
    setCameraOn(false);
    connect({
      channelId,
      channelName,
      channelType: "VOICE",
      muted: false,
      deafened: false,
    });
  }, [channelId, channelName, connect]);

  const handleLeave = useCallback(() => {
    setLiveConnected(false);
    setJoinError(null);
    setCameraOn(false);
    disconnect();
  }, [disconnect]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 px-4 py-3 border-b border-border/50 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold">{channelName}</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            최대 {maxUsers ?? 25}명 · 음성/영상
            {prefetched && !isInChannel && (
              <span className="text-emerald-600">· 준비됨</span>
            )}
            {isInChannel && liveConnected && (
              <span className="text-emerald-600">· 연결됨</span>
            )}
          </p>
        </div>
        {!isInChannel ? (
          <Button size="sm" onClick={handleJoin}>
            참가하기
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
              참가 후 아래에서 카메라·마이크를 켜고 끌 수 있습니다.
            </p>
            {joinError && <p className="text-sm text-destructive">{joinError}</p>}
            <Button onClick={handleJoin}>참가하기</Button>
          </div>
        ) : (
          <CommunityLivekitRoom
            channelId={channelId}
            channelName={channelName}
            muted={voice.muted}
            deafened={voice.deafened}
            cameraOn={cameraOn}
            prefetched={prefetched}
            onConnected={() => setLiveConnected(true)}
            onDisconnected={handleLeave}
            onError={(msg) => {
              setJoinError(msg);
              disconnect();
            }}
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
            aria-label={voice.muted ? "마이크 켜기" : "마이크 끄기"}
          >
            {voice.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className={cn(voice.deafened && "bg-destructive/20")}
            onClick={() => setDeafened(!voice.deafened)}
            aria-label={voice.deafened ? "스피커 켜기" : "스피커 끄기"}
          >
            <Headphones className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className={cn(cameraOn && "bg-primary/20")}
            onClick={() => setCameraOn((v) => !v)}
            aria-label={cameraOn ? "카메라 끄기" : "카메라 켜기"}
            title={cameraOn ? "카메라 끄기" : "카메라 켜기"}
          >
            {cameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            title="화면 공유 (준비 중)"
            disabled
          >
            <Monitor className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
