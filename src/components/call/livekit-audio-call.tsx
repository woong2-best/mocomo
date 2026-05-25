"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2, Radio } from "lucide-react";

async function fetchLivekitToken(roomName: string, attempt: number): Promise<{ token: string; serverUrl: string }> {
  const res = await fetch(`/api/livekit/token?room=${encodeURIComponent(roomName)}`, {
    credentials: "include",
    cache: "no-store",
  });

  let body: { error?: string; token?: string; serverUrl?: string; reason?: string } = {};
  try {
    body = await res.json();
  } catch {
    /* non-JSON */
  }

  if (!res.ok) {
    const msg = body.error ?? `연결 실패 (${res.status})`;
    const retryable =
      res.status === 403 && body.reason === "CALL_NOT_ACTIVE" && attempt < 4;
    if (retryable) {
      await new Promise((r) => setTimeout(r, 500));
      return fetchLivekitToken(roomName, attempt + 1);
    }
    throw new Error(msg);
  }

  if (!body.token || !body.serverUrl) {
    throw new Error(body.error ?? "LiveKit 응답이 올바르지 않습니다.");
  }

  return { token: body.token, serverUrl: body.serverUrl };
}

export function LivekitAudioCall({
  roomName,
  onDisconnected,
}: {
  roomName: string;
  onDisconnected?: () => void;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setToken(null);
    setServerUrl("");

    fetchLivekitToken(roomName, 0)
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
  }, [roomName]);

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
