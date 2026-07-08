"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  useParticipants,
  useLocalParticipant,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Loader2, Mic, MicOff, Video, VideoOff, VolumeX, UserX } from "lucide-react";
import {
  VOICE_CALL_CAPTURE,
  VOICE_CALL_STABLE_OPTIONS,
  VIDEO_CALL_CAPTURE,
} from "@/lib/livekit-audio-options";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type CommunityLivekitCreds = { token: string; serverUrl: string };

const TOKEN_TIMEOUT_MS = 15_000;

export async function fetchCommunityVoiceToken(
  channelId: string,
  signal?: AbortSignal
): Promise<CommunityLivekitCreds> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), TOKEN_TIMEOUT_MS);
  if (signal) {
    signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }

  try {
    const res = await fetch(
      `/api/livekit/community-token?channelId=${encodeURIComponent(channelId)}`,
      { credentials: "include", cache: "no-store", signal: ctrl.signal }
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.token || !body.serverUrl) {
      if (res.status === 504 || res.status === 502) {
        throw new Error("서버가 잠시 바쁩니다. 몇 초 후 다시 참가해 주세요.");
      }
      throw new Error((body as { error?: string }).error ?? `토큰 발급 실패 (${res.status})`);
    }
    return { token: body.token as string, serverUrl: body.serverUrl as string };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("연결 시간이 초과됐습니다. 다시 참가해 주세요.");
    }
    throw e;
  } finally {
    window.clearTimeout(timer);
  }
}

function MediaSync({
  muted,
  cameraOn,
  screenShareOn,
}: {
  muted: boolean;
  cameraOn: boolean;
  screenShareOn: boolean;
}) {
  const { localParticipant } = useLocalParticipant();
  useEffect(() => {
    void localParticipant.setMicrophoneEnabled(!muted).catch(() => undefined);
  }, [localParticipant, muted]);
  useEffect(() => {
    void localParticipant.setCameraEnabled(cameraOn).catch(() => undefined);
  }, [localParticipant, cameraOn]);
  useEffect(() => {
    void localParticipant.setScreenShareEnabled(screenShareOn).catch(() => undefined);
  }, [localParticipant, screenShareOn]);
  return null;
}

function VideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );
  return (
    <GridLayout
      tracks={tracks}
      className="min-h-[280px] w-full [&_.lk-participant-tile]:rounded-none"
    >
      <ParticipantTile />
    </GridLayout>
  );
}

function ParticipantList({
  communityId,
  channelId,
  canMuteMembers,
  canForceMove,
}: {
  communityId?: string;
  channelId: string;
  canMuteMembers?: boolean;
  canForceMove?: boolean;
}) {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const [acting, setActing] = useState<string | null>(null);

  async function modAction(targetIdentity: string, action: "mute" | "disconnect") {
    if (!communityId) return;
    setActing(targetIdentity);
    try {
      const res = await fetch("/api/livekit/community-mod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, communityId, targetIdentity, action }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((body as { error?: string }).error ?? "실패했습니다.");
      }
    } catch {
      /* ignore — UI only */
    } finally {
      setActing(null);
    }
  }

  if (participants.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        참가자를 기다리는 중…
      </div>
    );
  }

  const cols =
    participants.length === 1
      ? "grid-cols-1"
      : participants.length === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <ul className={cn("grid w-full divide-y divide-border/25", cols)}>
      {participants.map((p) => {
        const micOff = !p.isMicrophoneEnabled;
        const camOn = p.isCameraEnabled;
        const isSelf = p.identity === localParticipant.identity;
        const showMod = !isSelf && communityId && (canMuteMembers || canForceMove);

        return (
          <li
            key={p.identity}
            className={cn(
              "flex items-center gap-3 px-4 py-3.5 transition-colors",
              p.isSpeaking
                ? "bg-emerald-500/[0.07] shadow-[inset_0_0_0_1px_rgba(52,211,153,0.3)]"
                : "hover:bg-muted/25"
            )}
          >
            <Avatar
              className={cn(
                "h-10 w-10 shrink-0 ring-2 ring-offset-2 ring-offset-transparent",
                p.isSpeaking ? "ring-emerald-400/70" : "ring-border/30"
              )}
            >
              <AvatarFallback className="text-sm font-medium">
                {(p.name || p.identity || "?")[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {p.name || p.identity}
                {isSelf && <span className="text-muted-foreground font-normal text-xs ml-1">(나)</span>}
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                {micOff ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3 text-emerald-600" />}
                {camOn ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
                <span>{p.isSpeaking ? "말하는 중" : "대기"}</span>
              </p>
            </div>
            {showMod && (
              <div className="flex shrink-0 gap-0.5">
                {canMuteMembers && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg opacity-60 hover:opacity-100"
                    disabled={acting === p.identity}
                    title="서버 음소거"
                    onClick={() => void modAction(p.identity, "mute")}
                  >
                    <VolumeX className="h-3.5 w-3.5" />
                  </Button>
                )}
                {canForceMove && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg text-destructive opacity-60 hover:opacity-100"
                    disabled={acting === p.identity}
                    title="강제 퇴장"
                    onClick={() => void modAction(p.identity, "disconnect")}
                  >
                    <UserX className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function CommunityLivekitRoom({
  channelId,
  channelName: _channelName,
  communityId,
  muted = false,
  deafened = false,
  cameraOn = false,
  screenShareOn = false,
  canMuteMembers = false,
  canForceMove = false,
  prefetched,
  onConnected,
  onDisconnected,
  onError,
}: {
  channelId: string;
  channelName: string;
  communityId?: string;
  muted?: boolean;
  deafened?: boolean;
  cameraOn?: boolean;
  screenShareOn?: boolean;
  canMuteMembers?: boolean;
  canForceMove?: boolean;
  prefetched?: CommunityLivekitCreds | null;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (msg: string) => void;
}) {
  const [creds, setCreds] = useState<CommunityLivekitCreds | null>(prefetched ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prefetched?.token && prefetched.serverUrl) {
      setCreds(prefetched);
      setError(null);
      return;
    }

    let cancelled = false;
    setError(null);
    fetchCommunityVoiceToken(channelId)
      .then((c) => {
        if (!cancelled) setCreds(c);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "LiveKit 연결 실패";
        setError(msg);
        onError?.(msg);
      });
    return () => {
      cancelled = true;
    };
  }, [channelId, prefetched?.token, prefetched?.serverUrl, onError]);

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-8 text-center space-y-3">
        <p className="text-sm text-destructive">{error}</p>
        <button
          type="button"
          className="text-xs underline text-muted-foreground hover:text-foreground"
          onClick={() => {
            setError(null);
            setCreds(null);
            fetchCommunityVoiceToken(channelId)
              .then(setCreds)
              .catch((e: unknown) => setError(e instanceof Error ? e.message : "연결 실패"));
          }}
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!creds) {
    return (
      <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        연결 준비 중…
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 w-full rounded-2xl border border-border/35 bg-background/55 backdrop-blur-sm shadow-sm overflow-hidden">
      <LiveKitRoom
        token={creds.token}
        serverUrl={creds.serverUrl}
        connect
        audio={VOICE_CALL_CAPTURE}
        video={cameraOn || screenShareOn ? VIDEO_CALL_CAPTURE : false}
        options={VOICE_CALL_STABLE_OPTIONS}
        onConnected={onConnected}
        onDisconnected={onDisconnected}
        className="flex flex-1 flex-col min-h-0"
      >
        <MediaSync muted={muted} cameraOn={cameraOn} screenShareOn={screenShareOn} />
        <RoomAudioRenderer volume={deafened ? 0 : 1} />
        <div className="flex-1 min-h-0 overflow-y-auto">
          {cameraOn || screenShareOn ? (
            <VideoGrid />
          ) : (
            <ParticipantList
              communityId={communityId}
              channelId={channelId}
              canMuteMembers={canMuteMembers}
              canForceMove={canForceMove}
            />
          )}
        </div>
      </LiveKitRoom>
    </div>
  );
}
