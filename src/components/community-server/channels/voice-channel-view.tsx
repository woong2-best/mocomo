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
  PhoneOff,
  Signal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCommunityVoice } from "@/components/community-server/community-voice-context";
import { useCommunityMembership } from "@/components/community-server/community-membership-context";
import { hasPermission } from "@/lib/community-server/permissions";
import {
  CommunityLivekitRoom,
  type CommunityLivekitCreds,
} from "@/components/community-server/channels/community-livekit-room";
import { cn } from "@/lib/utils";

function VoiceControlButton({
  active,
  danger,
  disabled,
  label,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  label: string;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      disabled={disabled}
      className={cn(
        "h-11 w-11 rounded-xl transition-colors",
        active && (danger ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"),
        !active && "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
      )}
      onClick={onClick}
      aria-label={label}
      title={title ?? label}
    >
      {children}
    </Button>
  );
}

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
  const { voice, connect, disconnect, setMuted, setDeafened } = useCommunityVoice();
  const { isMember, isOwner, permissions } = useCommunityMembership();
  const readOnly = serverReadOnly && !isMember && !isOwner;
  const canShareScreen = hasPermission(permissions, "shareScreen");
  const canMuteMembers = hasPermission(permissions, "muteMembers");
  const canForceMove = hasPermission(permissions, "forceMoveVoice");
  const isInChannel = voice.channelId === channelId;
  const [prefetched, setPrefetched] = useState<CommunityLivekitCreds | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [screenShareOn, setScreenShareOn] = useState(false);

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
    setScreenShareOn(false);
    setPrefetched(null);
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
    setScreenShareOn(false);
    setPrefetched(null);
    disconnect();
  }, [disconnect]);

  const modeLabel = screenShareOn ? "화면 공유" : cameraOn ? "영상" : "음성";

  return (
    <div className="flex flex-col h-full min-h-0 bg-gradient-to-b from-muted/30 via-muted/10 to-background">
      <header className="shrink-0 flex items-center justify-between gap-3 px-4 h-12 border-b border-border/25 bg-background/50 backdrop-blur-sm">
        <div className="min-w-0">
          <h1 className="font-semibold text-sm truncate">{channelName}</h1>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3 w-3 shrink-0" />
            <span>최대 {maxUsers ?? 25}명</span>
            {isInChannel && (
              <>
                <span className="text-border">·</span>
                <span>{modeLabel}</span>
              </>
            )}
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
                  : "참가 후 마이크·카메라·화면 공유를 사용할 수 있습니다."}
              </p>
              {joinError && <p className="text-sm text-destructive">{joinError}</p>}
              <Button className="rounded-xl" onClick={handleJoin} disabled={readOnly}>
                {readOnly ? "참여 후 이용" : "참가하기"}
              </Button>
            </div>
          ) : (
            <div className="w-full max-w-3xl flex flex-col min-h-0">
              <CommunityLivekitRoom
                channelId={channelId}
                channelName={channelName}
                communityId={communityId}
                muted={voice.muted}
                deafened={voice.deafened}
                cameraOn={cameraOn}
                screenShareOn={screenShareOn}
                canMuteMembers={canMuteMembers}
                canForceMove={canForceMove}
                prefetched={prefetched}
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

        {isInChannel && (
          <div className="shrink-0 border-t border-border/25 bg-background/60 backdrop-blur-md pb-safe">
            <div className="relative mx-auto flex max-w-lg items-center justify-center gap-1 px-4 py-3">
              {!liveConnected && (
                <span className="mr-2 text-xs text-muted-foreground flex items-center shrink-0">
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                  연결 중
                </span>
              )}
              <div className="flex items-center gap-1 rounded-2xl border border-border/40 bg-background/90 shadow-sm px-2 py-1.5">
                <VoiceControlButton
                  active={voice.muted}
                  danger
                  label={voice.muted ? "마이크 켜기" : "마이크 끄기"}
                  onClick={() => setMuted(!voice.muted)}
                >
                  {voice.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </VoiceControlButton>
                <VoiceControlButton
                  active={voice.deafened}
                  danger
                  label={voice.deafened ? "스피커 켜기" : "스피커 끄기"}
                  onClick={() => setDeafened(!voice.deafened)}
                >
                  <Headphones className="h-5 w-5" />
                </VoiceControlButton>
                <div className="w-px h-7 bg-border/50 mx-0.5" />
                <VoiceControlButton
                  active={cameraOn}
                  label={cameraOn ? "카메라 끄기" : "카메라 켜기"}
                  onClick={() => setCameraOn((v) => !v)}
                >
                  {cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </VoiceControlButton>
                <VoiceControlButton
                  active={screenShareOn}
                  disabled={!canShareScreen}
                  label={screenShareOn ? "화면 공유 끄기" : "화면 공유"}
                  title={!canShareScreen ? "화면 공유 권한이 없습니다" : undefined}
                  onClick={() => setScreenShareOn((v) => !v)}
                >
                  <Monitor className="h-5 w-5" />
                </VoiceControlButton>
                <div className="w-px h-7 bg-border/50 mx-0.5" />
                <VoiceControlButton
                  danger
                  label="나가기"
                  onClick={handleLeave}
                >
                  <PhoneOff className="h-5 w-5" />
                </VoiceControlButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
