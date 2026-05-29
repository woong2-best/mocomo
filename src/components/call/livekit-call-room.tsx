"use client";

import { useEffect, useState } from "react";
import { LiveKitRoom, useLocalParticipant, useTracks, VideoTrack } from "@livekit/components-react";
import { LivekitSafeControls } from "@/components/call/livekit-safe-controls";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { Loader2, Radio, Video } from "lucide-react";
import { fetchLivekitCredentials, type LivekitCredentials } from "@/lib/livekit-token-fetch";
import {
  VIDEO_CALL_CAPTURE,
  VIDEO_CALL_ROOM_OPTIONS,
  VOICE_CALL_CAPTURE,
  VOICE_CALL_STABLE_OPTIONS,
} from "@/lib/livekit-audio-options";
import { CallRoomAudio } from "@/components/call/call-room-audio";
import { CallRoomConnection } from "@/components/call/call-room-connection";

function DmVideoStage() {
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], {
    onlySubscribed: false,
  });

  const remote = tracks.find(
    (t) =>
      t.participant.identity !== localParticipant.identity &&
      t.source === Track.Source.Camera &&
      t.publication
  );
  const local = tracks.find(
    (t) =>
      t.participant.identity === localParticipant.identity &&
      t.source === Track.Source.Camera &&
      t.publication
  );
  const main = remote ?? local;
  const hasMain = main && main.publication;
  const hasLocalPip = local && remote && local.publication;

  return (
    <div className="relative aspect-[4/3] w-full bg-black">
      {hasMain ? (
        <VideoTrack trackRef={main} className="h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
          <Video className="h-8 w-8" />
          <p className="text-xs">카메라 연결 중…</p>
        </div>
      )}
      {hasLocalPip && (
        <div className="absolute bottom-2 right-2 w-[28%] min-w-[88px] max-w-[120px] aspect-[3/4] rounded-lg overflow-hidden border-2 border-white/30 shadow-lg">
          <VideoTrack trackRef={local} className="h-full w-full object-cover" />
        </div>
      )}
    </div>
  );
}

export function LivekitCallRoom({
  roomName,
  video,
  prefetched,
}: {
  roomName: string;
  video: boolean;
  prefetched?: LivekitCredentials | null;
}) {
  const [token, setToken] = useState<string | null>(prefetched?.token ?? null);
  const [serverUrl, setServerUrl] = useState<string>(prefetched?.serverUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (prefetched?.token && prefetched.serverUrl) {
      setToken(prefetched.token);
      setServerUrl(prefetched.serverUrl);
      setError(null);
      return;
    }

    setError(null);
    setToken(null);
    setServerUrl("");

    fetchLivekitCredentials(roomName)
      .then((data) => {
        if (cancelled) return;
        setToken(data.token);
        setServerUrl(data.serverUrl);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "연결에 실패했습니다.";
        setError(msg);
      });

    return () => {
      cancelled = true;
    };
  }, [roomName, prefetched?.token, prefetched?.serverUrl]);

  if (error) {
    return (
      <p className="text-xs text-destructive text-center bg-destructive/10 rounded-xl py-2 px-3">
        {error}
      </p>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground rounded-xl bg-muted/30">
        <Loader2 className="h-4 w-4 animate-spin" />
        {video ? "영상 서버 연결 중…" : "음성 서버 연결 중…"}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 text-xs text-muted-foreground">
        {video ? (
          <>
            <Video className="h-3.5 w-3.5 text-sky-500 animate-pulse" />
            영상·음성 연결됨 · 아래에서 카메라·마이크 조절
          </>
        ) : (
          <>
            <Radio className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
            음성 채널 연결됨 · 아래에서 마이크 끄기/켜기
          </>
        )}
      </div>
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        audio={VOICE_CALL_CAPTURE}
        video={video ? VIDEO_CALL_CAPTURE : false}
        options={video ? VIDEO_CALL_ROOM_OPTIONS : VOICE_CALL_STABLE_OPTIONS}
        className="[&_.lk-control-bar]:border-0 [&_.lk-control-bar]:bg-transparent [&_.lk-control-bar]:py-2"
        data-lk-theme="default"
      >
        <CallRoomConnection />
        <CallRoomAudio />
        {video && <DmVideoStage />}
        <LivekitSafeControls video={video} />
      </LiveKitRoom>
    </div>
  );
}
