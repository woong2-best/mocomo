"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2 } from "lucide-react";

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
    return <p className="text-sm text-destructive text-center">{error}</p>;
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        연결 중…
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
      onDisconnected={onDisconnected}
      className="rounded-xl overflow-hidden border border-border bg-muted/20"
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
          leave: true,
        }}
      />
    </LiveKitRoom>
  );
}
