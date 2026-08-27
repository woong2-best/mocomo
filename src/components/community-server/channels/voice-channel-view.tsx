"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Users, Signal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCommunityVoice } from "@/components/community-server/community-voice-context";
import { useCommunityMembership } from "@/components/community-server/community-membership-context";
import { CommunityJitsiRoom } from "@/components/community-server/channels/community-jitsi-room";

export function VoiceChannelView({
  channelId,
  channelPageSlug,
  channelName,
  maxUsers,
  communityId,
  readOnly: serverReadOnly = false,
}: {
  channelId: string;
  channelPageSlug: string;
  channelName: string;
  channelType?: "VOICE" | "VIDEO";
  maxUsers?: number | null;
  communityId?: string;
  readOnly?: boolean;
}) {
  const { voice, connect, disconnect } = useCommunityVoice();
  const { isMember, isOwner } = useCommunityMembership();
  const readOnly = serverReadOnly && !isMember && !isOwner;
  const isInChannel = voice.channelId === channelId;
  const [joinError, setJoinError] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

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
    connect({
      channelId,
      channelName,
      channelType: "VOICE",
      channelPageSlug,
      muted: false,
      deafened: false,
    });
  }, [channelId, channelName, channelPageSlug, connect, readOnly]);

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
    disconnect();
  }, [disconnect]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-gradient-to-b from-muted/30 via-muted/10 to-background">
      <header className="shrink-0 flex items-center justify-between gap-3 px-4 h-12 border-b border-border/25 bg-background/50 backdrop-blur-sm">
        <div className="min-w-0">
          <h1 className="font-semibold text-sm truncate">{channelName}</h1>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3 w-3 shrink-0" />
            <span>최대 {maxUsers ?? 25}명</span>
            {isInChannel && liveConnected && (
              <>
                <span className="text-border">·</span>
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <Signal className="h-3 w-3" />
                  연결됨
                </span>
              </>
            )}
          </p>
        </div>
        {!isInChannel ? (
          <Button size="sm" className="rounded-xl shrink-0" onClick={handleJoin} disabled={readOnly}>
            {readOnly ? "참여 후 이용" : "참가하기"}
          </Button>
        ) : (
          <Button size="sm" variant="destructive" className="rounded-xl shrink-0" onClick={handleLeave}>
            나가기
          </Button>
        )}
      </header>

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto flex items-stretch justify-center p-4 sm:p-5">
          {!isInChannel ? (
            <div className="w-full max-w-md m-auto rounded-2xl border border-dashed border-border/50 bg-background/60 backdrop-blur-sm px-6 py-14 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Users className="h-7 w-7" />
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {readOnly
                  ? "커뮤니티에 참여하면 음성·영상 채널을 이용할 수 있습니다."
                  : "참가 후 Jitsi 패널에서 마이크·카메라·화면 공유를 사용할 수 있습니다."}
              </p>
              {joinError && <p className="text-sm text-destructive">{joinError}</p>}
              <Button className="rounded-xl" onClick={handleJoin} disabled={readOnly}>
                {readOnly ? "참여 후 이용" : "참가하기"}
              </Button>
            </div>
          ) : (
            <div className="w-full max-w-3xl flex flex-col min-h-0">
              <CommunityJitsiRoom
                channelId={channelId}
                channelName={channelName}
                muted={voice.muted}
                deafened={voice.deafened}
                cameraOn={cameraOn}
                onConnected={() => setLiveConnected(true)}
                onDisconnected={handleLeave}
                onError={(msg) => {
                  setJoinError(msg);
                  disconnect();
                }}
              />
            </div>
          )}
        </div>

        {isInChannel && !liveConnected && (
          <div className="shrink-0 border-t border-border/25 bg-background/60 backdrop-blur-md pb-safe">
            <div className="mx-auto flex max-w-lg items-center justify-center px-4 py-3">
              <span className="text-xs text-muted-foreground flex items-center">
                <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                Jitsi 연결 중…
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
