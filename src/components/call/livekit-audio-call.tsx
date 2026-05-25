"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2 } from "lucide-react";

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
    fetch(`/api/livekit/token?room=${encodeURIComponent(roomName)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("토큰 발급 실패");
        return res.json();
      })
      .then((data) => {
        setToken(data.token);
        setServerUrl(data.serverUrl);
      })
      .catch(() => setError("LiveKit이 설정되지 않았습니다. Vercel 환경 변수(LIVEKIT_*)를 확인하세요."));
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
