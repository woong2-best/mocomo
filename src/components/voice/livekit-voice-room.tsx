"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function LivekitVoiceRoom({
  channelId,
  channelName,
}: {
  channelId: string;
  channelName: string;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/livekit/token?room=${encodeURIComponent(channelId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("토큰 발급 실패");
        return res.json();
      })
      .then((data) => {
        setToken(data.token);
        setServerUrl(data.serverUrl);
      })
      .catch(() => setError("LiveKit 연결에 실패했습니다. 환경 변수를 확인하세요."));
  }, [channelId]);

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/50 p-6 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        음성방 연결 중...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {channelName} · LiveKit
      </p>
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        audio
        video
        className="rounded-xl overflow-hidden border border-border min-h-[400px]"
        data-lk-theme="default"
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.history.back()}
      >
        나가기
      </Button>
    </div>
  );
}
