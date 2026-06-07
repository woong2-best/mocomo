"use client";

import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { LivekitSafeControls } from "@/components/call/livekit-safe-controls";
import { LiveCollabCoHostVideo } from "@/components/live/live-collab-cohost-video";
import { fetchLivekitCredentials } from "@/lib/livekit-token-fetch";
import { VIDEO_CALL_CAPTURE, VIDEO_CALL_ROOM_OPTIONS, VOICE_CALL_CAPTURE } from "@/lib/livekit-audio-options";
import "@livekit/components-styles";

/** 시청자 — CO_HOST LiveKit 영상만 (분할 우측) */
export function LiveCollabCoHostPanel({
  channelId,
  coHostUserId,
  coHostLabel,
}: {
  channelId: string;
  coHostUserId: string;
  coHostLabel?: string;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const creds = await fetchLivekitCredentials(channelId);
        if (!cancelled) {
          setToken(creds.token);
          setServerUrl(creds.serverUrl);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "합방 연결 실패");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-3 text-xs text-red-300 text-center">
        {error}
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/90 text-white/70 gap-2">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio
      video={false}
      className="absolute inset-0 h-full w-full"
    >
      <RoomAudioRenderer />
      <LiveCollabCoHostVideo coHostUserId={coHostUserId} label={coHostLabel} />
    </LiveKitRoom>
  );
}

/** CO_HOST — LiveKit 송출 + 로컬 미리보기 */
export function LiveCollabPublishRoom({
  channelId,
  children,
}: {
  channelId: string;
  children: React.ReactNode;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const creds = await fetchLivekitCredentials(channelId);
        if (!cancelled) {
          setToken(creds.token);
          setServerUrl(creds.serverUrl);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "합방 송출 연결 실패");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
        <p className="text-xs mt-2 text-muted-foreground">
          LiveKit(LIVEKIT_*) 설정이 필요합니다. 관리자에게 문의하세요.
        </p>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="aspect-video rounded-xl bg-black flex items-center justify-center text-white/70 gap-2">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-sm">합방 송출 준비 중…</span>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio={VOICE_CALL_CAPTURE}
      video={VIDEO_CALL_CAPTURE}
      options={VIDEO_CALL_ROOM_OPTIONS}
      className="flex flex-col gap-3 [&_.lk-control-bar]:rounded-xl [&_.lk-control-bar]:bg-muted/40"
    >
      <RoomAudioRenderer />
      {children}
      <LivekitSafeControls video />
    </LiveKitRoom>
  );
}
