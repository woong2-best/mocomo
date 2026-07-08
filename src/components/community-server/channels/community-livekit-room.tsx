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
import { Loader2, Mic, MicOff, Video, VideoOff } from "lucide-react";
import {
  VOICE_CALL_CAPTURE,
  VOICE_CALL_STABLE_OPTIONS,
  VIDEO_CALL_CAPTURE,
} from "@/lib/livekit-audio-options";
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

function MediaSync({ muted, cameraOn }: { muted: boolean; cameraOn: boolean }) {
  const { localParticipant } = useLocalParticipant();
  useEffect(() => {
    void localParticipant.setMicrophoneEnabled(!muted).catch(() => undefined);
  }, [localParticipant, muted]);
  useEffect(() => {
    void localParticipant.setCameraEnabled(cameraOn).catch(() => undefined);
  }, [localParticipant, cameraOn]);
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
    <GridLayout tracks={tracks} className="min-h-[240px] rounded-xl overflow-hidden border border-border">
      <ParticipantTile />
    </GridLayout>
  );
}

function ParticipantList() {
  const participants = useParticipants();
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {participants.map((p) => {
        const micOff = !p.isMicrophoneEnabled;
        const camOn = p.isCameraEnabled;
        return (
          <li
            key={p.identity}
            className={cn(
              "flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2",
              p.isSpeaking && "ring-2 ring-emerald-400/60"
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback>{(p.name || p.identity || "?")[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{p.name || p.identity}</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                {micOff ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                {camOn ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
                {p.isSpeaking ? "말하는 중" : "대기"}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function CommunityLivekitRoom({
  channelId,
  channelName,
  muted = false,
  deafened = false,
  cameraOn = false,
  prefetched,
  onConnected,
  onDisconnected,
  onError,
}: {
  channelId: string;
  channelName: string;
  muted?: boolean;
  deafened?: boolean;
  cameraOn?: boolean;
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
      <div className="rounded-xl border border-destructive/50 p-6 text-center space-y-3">
        <p className="text-sm text-destructive">{error}</p>
        <button
          type="button"
          className="text-xs underline text-muted-foreground"
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
      <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        LiveKit 연결 중...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {channelName} · {cameraOn ? "영상+음성" : "음성"}
      </p>
      <LiveKitRoom
        token={creds.token}
        serverUrl={creds.serverUrl}
        connect
        audio={VOICE_CALL_CAPTURE}
        video={cameraOn ? VIDEO_CALL_CAPTURE : false}
        options={VOICE_CALL_STABLE_OPTIONS}
        onConnected={onConnected}
        onDisconnected={onDisconnected}
        className="space-y-3"
      >
        <MediaSync muted={muted} cameraOn={cameraOn} />
        <RoomAudioRenderer volume={deafened ? 0 : 1} />
        {cameraOn ? <VideoGrid /> : <ParticipantList />}
      </LiveKitRoom>
    </div>
  );
}
