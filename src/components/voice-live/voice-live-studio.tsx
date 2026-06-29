"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import { ConnectionState, RoomEvent, Track } from "livekit-client";
import { Loader2, Mic, MicOff, Radio, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchLivekitCredentials } from "@/lib/livekit-token-fetch";
import { VOICE_LIVE_ROOM_OPTIONS } from "@/lib/livekit-audio-options";
import { startVoiceLiveBroadcast } from "@/actions/live-stream";
import "@livekit/components-styles";

function VoiceLiveHostControls({
  channelId,
  onAirChange,
}: {
  channelId: string;
  onAirChange?: (onAir: boolean) => void;
}) {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const wentLiveRef = useRef(false);
  const [liveError, setLiveError] = useState("");

  useEffect(() => {
    if (!room || room.state !== ConnectionState.Connected) return;
    room.startAudio().catch(() => {});
  }, [room, room?.state]);

  useEffect(() => {
    if (!localParticipant || wentLiveRef.current) return;
    if (room?.state !== ConnectionState.Connected) return;

    wentLiveRef.current = true;
    void (async () => {
      try {
        await localParticipant.setMicrophoneEnabled(true);
        const res = await startVoiceLiveBroadcast(channelId);
        if ("error" in res && res.error) {
          setLiveError(res.error);
          wentLiveRef.current = false;
          onAirChange?.(false);
          return;
        }
        onAirChange?.(true);
      } catch {
        setLiveError("방송 시작에 실패했습니다.");
        wentLiveRef.current = false;
        onAirChange?.(false);
      }
    })();
  }, [localParticipant, room?.state, channelId, onAirChange]);

  const toggleMic = useCallback(async () => {
    await localParticipant?.setMicrophoneEnabled(!isMicrophoneEnabled);
  }, [localParticipant, isMicrophoneEnabled]);

  return (
    <div className="flex flex-col items-center gap-4">
      {liveError && (
        <p className="text-sm text-destructive text-center px-4">{liveError}</p>
      )}
      <Button
        type="button"
        size="lg"
        variant={isMicrophoneEnabled ? "default" : "secondary"}
        className="rounded-full h-14 w-14 p-0"
        onClick={() => void toggleMic()}
        aria-label={isMicrophoneEnabled ? "마이크 끄기" : "마이크 켜기"}
      >
        {isMicrophoneEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
      </Button>
      <p className="text-xs text-muted-foreground">
        {isMicrophoneEnabled ? "마이크 켜짐 · 시청자에게 전달 중" : "마이크 꺼짐"}
      </p>
    </div>
  );
}

/** 스푼형 보이스 라이브 — 호스트 마이크 송출 (LiveKit) */
export function VoiceLiveHostStudio({
  channelId,
  channelName,
  hostImage,
  hostDisplayName,
  onAirChange,
}: {
  channelId: string;
  channelName: string;
  hostImage?: string | null;
  hostDisplayName?: string;
  onAirChange?: (onAir: boolean) => void;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchLivekitCredentials(channelId)
      .then((body) => {
        if (!cancelled) {
          setToken(body.token);
          setServerUrl(body.serverUrl);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "연결 실패");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="rounded-2xl bg-gradient-to-b from-violet-950/40 to-background border border-border/60 flex flex-col items-center justify-center gap-3 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        <p className="text-sm text-muted-foreground">보이스 스튜디오 연결 중…</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-violet-500/20 bg-gradient-to-b from-violet-950/30 via-background to-background">
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/40">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-600 text-white flex items-center gap-1">
          <Radio className="h-3 w-3" />
          보이스 LIVE
        </span>
        <p className="text-sm font-medium truncate max-w-[60%]">{channelName}</p>
      </div>

      <div className="flex flex-col items-center py-10 px-6 gap-6">
        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping" />
          <span className="absolute -inset-3 rounded-full bg-violet-500/10 animate-pulse" />
          <div className="relative h-28 w-28 rounded-full overflow-hidden ring-4 ring-violet-500/40 bg-muted flex items-center justify-center">
            {hostImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hostImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
        </div>
        {hostDisplayName && (
          <p className="text-lg font-bold">{hostDisplayName}</p>
        )}
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          영상 없이 목소리만 송출합니다. 수요가 몰려도 영상 CDN 부담 없이 안정적으로 시청됩니다.
        </p>

        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect
          audio
          video={false}
          options={VOICE_LIVE_ROOM_OPTIONS}
          className="w-full flex flex-col items-center"
        >
          <VoiceLiveHostControls channelId={channelId} onAirChange={onAirChange} />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </div>
  );
}

function HostMicLevel({ hostUserId }: { hostUserId?: string }) {
  const tracks = useTracks([Track.Source.Microphone], { onlySubscribed: true });
  const hostTrack = tracks.find(
    (t) => t.participant.identity === hostUserId && t.publication?.isSubscribed
  );
  const speaking = hostTrack?.participant.isSpeaking ?? false;

  return (
    <span
      className={`absolute -inset-2 rounded-full border-2 transition-colors ${
        speaking ? "border-violet-400 shadow-[0_0_24px_rgba(139,92,246,0.45)]" : "border-violet-500/30"
      }`}
    />
  );
}

function VoiceLiveListenerRoom({
  hostUserId,
  hostImage,
  hostDisplayName,
  channelName,
}: {
  hostUserId?: string;
  hostImage?: string | null;
  hostDisplayName?: string;
  channelName?: string;
}) {
  const room = useRoomContext();
  const tracks = useTracks([Track.Source.Microphone], { onlySubscribed: true });
  const hostMic = tracks.find((t) => t.participant.identity === hostUserId);
  const waiting = !hostMic;

  useEffect(() => {
    if (!room) return;
    const enable = () => {
      room.startAudio().catch(() => {});
    };
    if (room.state === ConnectionState.Connected) enable();
    room.on(RoomEvent.Connected, enable);
    return () => {
      room.off(RoomEvent.Connected, enable);
    };
  }, [room]);

  return (
    <>
      <RoomAudioRenderer volume={1} />
      <div className="flex flex-col items-center py-10 px-6 gap-5 min-h-[280px] justify-center">
        <div className="relative">
          <HostMicLevel hostUserId={hostUserId} />
          <div className="relative h-32 w-32 rounded-full overflow-hidden ring-4 ring-violet-500/30 bg-muted flex items-center justify-center">
            {hostImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hostImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-14 w-14 text-muted-foreground" />
            )}
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="font-bold text-lg">{hostDisplayName ?? "DJ"}</p>
          {channelName && (
            <p className="text-sm text-muted-foreground line-clamp-2">{channelName}</p>
          )}
        </div>
        {waiting ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            DJ가 마이크를 켜면 소리가 들립니다
          </div>
        ) : (
          <p className="text-xs text-violet-400 font-medium flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
            듣는 중
          </p>
        )}
      </div>
    </>
  );
}

/** 스푼형 보이스 라이브 — 시청자 (오디오만) */
export function VoiceLiveListener({
  channelId,
  hostUserId: hostUserIdProp,
  hostImage,
  hostDisplayName,
  channelName,
}: {
  channelId: string;
  hostUserId?: string;
  hostImage?: string | null;
  hostDisplayName?: string;
  channelName?: string;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState("");
  const [hostUserId, setHostUserId] = useState(hostUserIdProp);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchLivekitCredentials(channelId)
      .then((body) => {
        if (!cancelled) {
          setToken(body.token);
          setServerUrl(body.serverUrl);
          setHostUserId(hostUserIdProp ?? body.hostUserId);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "연결 실패");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [channelId, hostUserIdProp]);

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center text-sm text-destructive min-h-[280px] flex items-center justify-center">
        {error}
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="rounded-2xl bg-gradient-to-b from-violet-950/40 to-background border border-border/60 flex flex-col items-center justify-center gap-3 min-h-[280px]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        <p className="text-sm text-muted-foreground">보이스 방송 연결 중…</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-violet-500/20 bg-gradient-to-b from-violet-950/25 to-background relative">
      <span className="absolute top-3 left-3 z-10 px-2 py-0.5 rounded text-[10px] font-bold bg-violet-600 text-white">
        보이스 LIVE
      </span>
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        audio
        video={false}
        options={VOICE_LIVE_ROOM_OPTIONS}
      >
        <VoiceLiveListenerRoom
          hostUserId={hostUserId}
          hostImage={hostImage}
          hostDisplayName={hostDisplayName}
          channelName={channelName}
        />
      </LiveKitRoom>
    </div>
  );
}
