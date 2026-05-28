"use client";

import { useEffect, useState } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { Copy, Check, Monitor, Radio, Loader2 } from "lucide-react";
import { ensureObsIngress } from "@/actions/live-stream";
import { fetchLivekitCredentials } from "@/lib/livekit-token-fetch";
import { LiveObsPreviewStage } from "@/components/live/live-obs-preview";
import { Button } from "@/components/ui/button";

export function LiveObsStudio({
  channelId,
  onEndStream,
}: {
  channelId: string;
  onEndStream: () => void;
}) {
  const [url, setUrl] = useState("");
  const [streamKey, setStreamKey] = useState("");
  const [ingressError, setIngressError] = useState("");
  const [ingressLoading, setIngressLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState("");
  const [hostUserId, setHostUserId] = useState("");
  const [connectError, setConnectError] = useState("");
  const [copied, setCopied] = useState<"url" | "key" | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIngressLoading(true);
    setIngressError("");
    setConnectError("");

    (async () => {
      const ingress = await ensureObsIngress(channelId);
      if (cancelled) return;
      if ("error" in ingress && ingress.error) {
        setIngressError(ingress.error);
        setIngressLoading(false);
        return;
      }
      if ("url" in ingress && ingress.url) setUrl(ingress.url);
      if ("streamKey" in ingress && ingress.streamKey) setStreamKey(ingress.streamKey);
      setIngressLoading(false);

      try {
        const c = await fetchLivekitCredentials(channelId);
        if (cancelled) return;
        setToken(c.token);
        setServerUrl(c.serverUrl);
        setHostUserId(c.hostUserId ?? "");
      } catch (e) {
        if (!cancelled) {
          setConnectError(e instanceof Error ? e.message : "미리보기 연결 실패");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [channelId]);

  function copy(text: string, which: "url" | "key") {
    void navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  }

  if (ingressLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (ingressError) {
    return <p className="text-sm text-destructive p-4 rounded-xl bg-destructive/10">{ingressError}</p>;
  }

  const previewBlock =
    connectError ? (
      <p className="text-sm text-amber-700 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
        RTMP는 설정됐습니다. 미리보기만 실패: {connectError}
      </p>
    ) : !token || !serverUrl ? (
      <div className="aspect-video rounded-2xl bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ) : (
      <LiveKitRoom token={token} serverUrl={serverUrl} connect audio video={false}>
        <LiveObsPreviewStage channelId={channelId} hostUserId={hostUserId} />
        <RoomAudioRenderer />
      </LiveKitRoom>
    );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <Monitor className="h-4 w-4 text-violet-600" />
          OBS Studio 연동 (RTMP)
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          OBS → 설정 → 방송 → 서비스 <strong>사용자 지정</strong>. 아래 서버·키를 입력한 뒤「방송 시작」하세요.
        </p>
        <div className="space-y-2">
          <label className="text-[11px] text-muted-foreground font-medium">서버 (Server)</label>
          <div className="flex gap-2">
            <code className="flex-1 text-xs bg-background rounded-lg px-3 py-2 break-all border">{url}</code>
            <Button type="button" size="icon" variant="outline" className="shrink-0" onClick={() => copy(url, "url")}>
              {copied === "url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[11px] text-muted-foreground font-medium">스트림 키 (Stream Key)</label>
          <div className="flex gap-2">
            <code className="flex-1 text-xs bg-background rounded-lg px-3 py-2 break-all border font-mono">
              {streamKey}
            </code>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="shrink-0"
              onClick={() => copy(streamKey, "key")}
            >
              {copied === "key" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          권장: 1080p 4500kbps · 키프레임 2. OBS「방송 시작」 후 아래 미리보기에 표시됩니다.
        </p>
      </div>

      {previewBlock}

      <div className="flex justify-end">
        <Button variant="destructive" className="rounded-xl gap-1" onClick={onEndStream}>
          <Radio className="h-4 w-4" />
          방송 종료
        </Button>
      </div>
    </div>
  );
}
