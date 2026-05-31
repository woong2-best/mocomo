"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Loader2, Radio, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveHostMediaControls } from "@/lib/live-host-controls";
import { fetchLivekitCredentials } from "@/lib/livekit-token-fetch";
import { LIVE_BROADCAST_ROOM_OPTIONS } from "@/lib/livekit-audio-options";
import { startBrowserLiveBroadcast } from "@/actions/live-stream";
import "@livekit/components-styles";

function HostPreviewStage({
  onAir,
  onGoLive,
  goingLive,
  liveError,
}: {
  onAir: boolean;
  onGoLive: () => void;
  goingLive: boolean;
  liveError: string;
}) {
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (!onAir) return;
    void localParticipant.setMicrophoneEnabled(true);
    void localParticipant.setCameraEnabled(true);
  }, [onAir, localParticipant]);
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: true },
    ],
    { onlySubscribed: false }
  );

  const screen = tracks.find(
    (t) =>
      t.participant.identity === localParticipant.identity &&
      t.source === Track.Source.ScreenShare &&
      t.publication
  );
  const camera = tracks.find(
    (t) =>
      t.participant.identity === localParticipant.identity &&
      t.source === Track.Source.Camera &&
      t.publication
  );
  const main = screen ?? camera;

  return (
    <div className="flex flex-col gap-3 h-full min-h-[min(50vh,400px)]">
      <div className="relative flex-1 min-h-[240px] rounded-xl overflow-hidden bg-black ring-1 ring-border/50">
        {main?.publication ? (
          <VideoTrack trackRef={main} className="w-full h-full object-contain" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80 p-6 text-center">
            <Video className="h-10 w-10 opacity-70" />
            <p className="text-sm max-w-xs">
              {onAir
                ? "카메라 또는 화면 공유를 켜 주세요."
                : "「방송 시작」 후 카메라·마이크를 허용하면 시청자에게 보입니다."}
            </p>
          </div>
        )}
        {onAir && (
          <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold z-10 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      <LiveHostMediaControls />

      {liveError && <p className="text-xs text-destructive">{liveError}</p>}

      {!onAir ? (
        <Button
          type="button"
          className="rounded-xl gap-2 font-bold"
          disabled={goingLive}
          onClick={onGoLive}
        >
          {goingLive ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Radio className="h-4 w-4" />
          )}
          방송 시작
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">
          시청자는 실시간(WebRTC)으로 시청합니다. 방송 종료는 상단 「방송 종료」를 사용하세요.
        </p>
      )}
    </div>
  );
}

/** 유튜브·치지직식 — 브라우저에서 카메라·화면공유로 송출 (OBS 불필요) */
export function LiveBrowserStudio({
  channelId,
  onAirChange,
}: {
  channelId: string;
  onAirChange?: (onAir: boolean) => void;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState("");
  const [loadError, setLoadError] = useState("");
  const [liveError, setLiveError] = useState("");
  const [onAir, setOnAir] = useState(false);
  const [goingLive, setGoingLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchLivekitCredentials(channelId)
      .then((c) => {
        if (cancelled) return;
        setToken(c.token);
        setServerUrl(c.serverUrl);
        setLoadError("");
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "LiveKit 연결 실패");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  useEffect(() => {
    onAirChange?.(onAir);
  }, [onAir, onAirChange]);

  const handleGoLive = useCallback(async () => {
    setGoingLive(true);
    setLiveError("");
    const res = await startBrowserLiveBroadcast(channelId);
    setGoingLive(false);
    if ("error" in res && res.error) {
      setLiveError(res.error);
      return;
    }
    setOnAir(true);
  }, [channelId]);

  if (loadError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive space-y-2">
        <p>{loadError}</p>
        <p className="text-xs text-muted-foreground">
          Vercel에 LIVEKIT_API_KEY, LIVEKIT_API_SECRET, NEXT_PUBLIC_LIVEKIT_URL 을 설정해 주세요.
        </p>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="aspect-video rounded-xl bg-black flex items-center justify-center text-white/70 gap-2">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-sm">방송 스튜디오 연결 중…</span>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio={false}
      video={false}
      options={LIVE_BROADCAST_ROOM_OPTIONS}
      className="h-full"
    >
      <RoomAudioRenderer />
      <HostPreviewStage
        onAir={onAir}
        onGoLive={() => void handleGoLive()}
        goingLive={goingLive}
        liveError={liveError}
      />
    </LiveKitRoom>
  );
}
