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
import { useCommunityMembership } from "@/components/community-server/community-membership-context";
import {
  CommunityLivekitRoom,
  type CommunityLivekitCreds,
} from "@/components/community-server/channels/community-livekit-room";
import { cn } from "@/lib/utils";

export function VoiceChannelView({
  channelId,
  channelName,
  maxUsers,
  communityId,
  readOnly: serverReadOnly = false,
}: {
  channelId: string;
  channelName: string;
  channelType?: "VOICE" | "VIDEO";
  maxUsers?: number | null;
  communityId?: string;
  readOnly?: boolean;
}) {
  const { voice, connect, disconnect, setMuted, setDeafened } = useCommunityVoice();
  const { isMember, isOwner } = useCommunityMembership();
  const readOnly = serverReadOnly && !isMember && !isOwner;
  const isInChannel = voice.channelId === channelId;
  const [prefetched, setPrefetched] = useState<CommunityLivekitCreds | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  // 페이지 로드 시 토큰 prefetch 금지 — 세션 504와 경쟁하면서 더 느려짐
  // 참가 시에만 community-livekit-room이 토큰을 요청

  useEffect(() => {
    return () => {
      if (voice.channelId === channelId) disconnect();
    };
  }, [channelId, disconnect, voice.channelId]);

  const handleJoin = useCallback(() => {
    if (readOnly) return;
    setJoinError(null);
    setLiveConnected(false);
    setCameraOn(false);
    setPrefetched(null);
    connect({
      channelId,
      channelName,
      channelType: "VOICE",
      muted: false,
      deafened: false,
    });
  }, [channelId, channelName, connect, readOnly]);

  const setVoiceActivity = useCallback(
    (activity: "VOICE" | "VIDEO" | null) => {
      if (!communityId) return;
      void fetch(`/api/community/${communityId}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceActivity: activity }),
      }).catch(() => undefined);
    },
    [communityId]
  );

  useEffect(() => {
    if (!isInChannel || !liveConnected) return;
    setVoiceActivity(cameraOn ? "VIDEO" : "VOICE");
    return () => setVoiceActivity(null);
  }, [isInChannel, liveConnected, cameraOn, setVoiceActivity]);

  const handleLeave = useCallback(() => {
    setLiveConnected(false);
    setJoinError(null);
    setCameraOn(false);
    setPrefetched(null);
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
            {isInChannel && liveConnected && (
              <span className="text-emerald-600">· 연결됨</span>
            )}
          </p>
        </div>
        {!isInChannel ? (
          <Button size="sm" onClick={handleJoin} disabled={readOnly}>
            {readOnly ? "참여 후 이용" : "참가하기"}
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
              {readOnly
                ? "커뮤니티에 참여하면 음성·영상 채널을 이용할 수 있습니다."
                : "참가 후 아래에서 카메라·마이크를 켜고 끌 수 있습니다."}
            </p>
            {joinError && <p className="text-sm text-destructive">{joinError}</p>}
            <Button onClick={handleJoin} disabled={readOnly}>
              {readOnly ? "참여 후 이용" : "참가하기"}
            </Button>
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
          <Button type="button" size="icon" variant="outline" title="화면 공유 (준비 중)" disabled>
            <Monitor className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
