"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2, Radio } from "lucide-react";
import { fetchLivekitCredentials, type LivekitCredentials } from "@/lib/livekit-token-fetch";

export function LivekitAudioCall({
  roomName,
  prefetched,
  onDisconnected,
}: {
  roomName: string;
  prefetched?: LivekitCredentials | null;
  onDisconnected?: () => void;
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
        const msg = e instanceof Error ? e.message : "음성 연결에 실패했습니다.";
        setError(msg);
      });

    return () => {
      cancelled = true;
    };
  }, [roomName, prefetched?.token, prefetched?.serverUrl]);

  if (error) {
    return (
      <p className="text-xs text-destructive text-center bg-destructive/10 rounded-xl py-2 px-3">{error}</p>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground rounded-xl bg-muted/30">
        <Loader2 className="h-4 w-4 animate-spin" />
        음성 서버 연결 중…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 text-xs text-muted-foreground">
        <Radio className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
        음성 채널 연결됨 · 아래에서 마이크 끄기/켜기
      </div>
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        audio
        video={false}
        onDisconnected={onDisconnected}
        className="[&_.lk-control-bar]:border-0 [&_.lk-control-bar]:bg-transparent [&_.lk-control-bar]:py-2"
        data-lk-theme="default"
      >
        <RoomAudioRenderer />
        <ControlBar
          controls={{
            microphone: true,
            camera: false,
            screenShare: false,
            chat: false,
            settings: false,
            leave: false,
          }}
        />
      </LiveKitRoom>
    </div>
  );
}
