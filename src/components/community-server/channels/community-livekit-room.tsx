"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useLocalParticipant,
} from "@livekit/components-react";
import { Loader2, Mic, MicOff } from "lucide-react";
import { VOICE_CALL_CAPTURE, VOICE_CALL_STABLE_OPTIONS } from "@/lib/livekit-audio-options";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type CommunityLivekitCreds = { token: string; serverUrl: string };

export async function fetchCommunityVoiceToken(
  channelId: string,
  kind: "VOICE" | "VIDEO" = "VOICE"
): Promise<CommunityLivekitCreds> {
  const res = await fetch(
    `/api/livekit/community-token?channelId=${encodeURIComponent(channelId)}&kind=${kind}`,
    { credentials: "include", cache: "no-store" }
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.token || !body.serverUrl) {
    throw new Error((body as { error?: string }).error ?? "토큰 발급 실패");
  }
  return { token: body.token as string, serverUrl: body.serverUrl as string };
}

function ParticipantList() {
  const participants = useParticipants();
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {participants.map((p) => {
        const micOff = !p.isMicrophoneEnabled;
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
                {p.isSpeaking ? "말하는 중" : micOff ? "음소거" : "대기"}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function MuteSync({ muted }: { muted: boolean }) {
  const { localParticipant } = useLocalParticipant();
  useEffect(() => {
    void localParticipant.setMicrophoneEnabled(!muted).catch(() => undefined);
  }, [localParticipant, muted]);
  return null;
}

export function CommunityLivekitRoom({
  channelId,
  channelName,
  kind = "VOICE",
  muted = false,
  deafened = false,
  prefetched,
  onConnected,
  onDisconnected,
}: {
  channelId: string;
  channelName: string;
  kind?: "VOICE" | "VIDEO";
  muted?: boolean;
  deafened?: boolean;
  prefetched?: CommunityLivekitCreds | null;
  onConnected?: () => void;
  onDisconnected?: () => void;
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
    fetchCommunityVoiceToken(channelId, kind)
      .then((c) => {
        if (!cancelled) setCreds(c);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "LiveKit 연결 실패");
      });
    return () => {
      cancelled = true;
    };
  }, [channelId, kind, prefetched?.token, prefetched?.serverUrl]);

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/50 p-6 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!creds) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        연결 준비 중...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{channelName} · 연결됨</p>
      <LiveKitRoom
        token={creds.token}
        serverUrl={creds.serverUrl}
        connect
        audio={VOICE_CALL_CAPTURE}
        video={kind === "VIDEO"}
        options={VOICE_CALL_STABLE_OPTIONS}
        onConnected={onConnected}
        onDisconnected={onDisconnected}
        className="space-y-3"
      >
        <MuteSync muted={muted} />
        <RoomAudioRenderer volume={deafened ? 0 : 1} />
        <ParticipantList />
      </LiveKitRoom>
    </div>
  );
}
