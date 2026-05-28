"use client";

import { useCallback, useEffect, useState } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { Copy, Check, Monitor, Radio, Loader2, RefreshCw } from "lucide-react";
import { fetchLivekitCredentials } from "@/lib/livekit-token-fetch";
import { LiveObsPreviewStage } from "@/components/live/live-obs-preview";
import { Button } from "@/components/ui/button";

type ObsCreds = {
  obsServer: string;
  obsStreamKey: string;
  ingressId?: string;
};

async function fetchObsCredentials(channelId: string, refresh = false): Promise<ObsCreds> {
  const res = await fetch(`/api/live/${channelId}/obs`, {
    method: refresh ? "POST" : "GET",
    credentials: "include",
    cache: "no-store",
    headers: refresh ? { "Content-Type": "application/json" } : undefined,
    body: refresh ? JSON.stringify({ refresh: true }) : undefined,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "OBS 키 발급에 실패했습니다.");
  }
  const server = body.obsServer || body.url || "";
  const key = body.obsStreamKey || body.streamKey || "";
  if (!server || !key) {
    throw new Error("서버 URL 또는 스트림 키가 비어 있습니다. 키 재발급을 눌러 주세요.");
  }
  return { obsServer: server, obsStreamKey: key, ingressId: body.ingressId };
}

export function LiveObsStudio({
  channelId,
  onEndStream,
}: {
  channelId: string;
  onEndStream: () => void;
}) {
  const [creds, setCreds] = useState<ObsCreds | null>(null);
  const [ingressError, setIngressError] = useState("");
  const [ingressLoading, setIngressLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState("");
  const [hostUserId, setHostUserId] = useState("");
  const [connectError, setConnectError] = useState("");
  const [copied, setCopied] = useState<"all" | "server" | "key" | null>(null);

  const loadIngress = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setIngressLoading(true);
      setIngressError("");
      try {
        const data = await fetchObsCredentials(channelId, refresh);
        setCreds(data);
      } catch (e) {
        setCreds(null);
        setIngressError(e instanceof Error ? e.message : "OBS 키 발급 실패");
      } finally {
        setIngressLoading(false);
        setRefreshing(false);
      }
    },
    [channelId]
  );

  useEffect(() => {
    void loadIngress(false);
  }, [loadIngress]);

  useEffect(() => {
    if (!creds) return;
    let cancelled = false;
    setConnectError("");
    fetchLivekitCredentials(channelId)
      .then((c) => {
        if (cancelled) return;
        setToken(c.token);
        setServerUrl(c.serverUrl);
        setHostUserId(c.hostUserId ?? "");
      })
      .catch((e) => {
        if (!cancelled) {
          setConnectError(e instanceof Error ? e.message : "미리보기 연결 실패");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [channelId, creds]);

  function copy(text: string, which: "all" | "server" | "key") {
    void navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  }

  if (ingressLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">OBS 서버·스트림 키 발급 중…</p>
      </div>
    );
  }

  if (ingressError || !creds) {
    return (
      <div className="space-y-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
        <p className="text-sm text-destructive">{ingressError || "OBS 설정을 불러오지 못했습니다."}</p>
        <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => loadIngress(true)}>
          <RefreshCw className="h-3.5 w-3.5" />
          다시 시도
        </Button>
      </div>
    );
  }

  const previewBlock =
    connectError ? (
      <p className="text-sm text-amber-800 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
        RTMP 키는 준비됐습니다. 미리보기만 실패: {connectError}
        <br />
        <span className="text-xs">OBS에서 방송 시작하면 시청자 화면에는 나올 수 있습니다.</span>
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
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold flex items-center gap-2 text-sm">
            <Monitor className="h-4 w-4 text-violet-600" />
            OBS 연동 (자동 발급됨)
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg gap-1 h-8 text-xs"
            disabled={refreshing}
            onClick={() => loadIngress(true)}
          >
            {refreshing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            키 재발급
          </Button>
        </div>

        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>OBS → 설정 → 방송 → 서비스 <strong>사용자 지정</strong></li>
          <li>아래 <strong>서버</strong>·<strong>방송 키</strong> 복사 후 붙여넣기</li>
          <li>OBS에서 <strong>방송 시작</strong> → 아래 미리보기 확인</li>
        </ol>

        <div className="space-y-2">
          <label className="text-[11px] font-medium text-violet-800 dark:text-violet-200">① 서버 (Server)</label>
          <div className="flex gap-2">
            <code className="flex-1 text-xs bg-background rounded-lg px-3 py-2.5 break-all border select-all">
              {creds.obsServer}
            </code>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="shrink-0"
              onClick={() => copy(creds.obsServer, "server")}
            >
              {copied === "server" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-medium text-violet-800 dark:text-violet-200">② 방송 키 (Stream Key)</label>
          <div className="flex gap-2">
            <code className="flex-1 text-xs bg-background rounded-lg px-3 py-2.5 break-all border font-mono select-all">
              {creds.obsStreamKey}
            </code>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="shrink-0"
              onClick={() => copy(creds.obsStreamKey, "key")}
            >
              {copied === "key" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full rounded-xl gap-1 text-xs"
          onClick={() =>
            copy(
              `서버: ${creds.obsServer}\n방송 키: ${creds.obsStreamKey}`,
              "all"
            )
          }
        >
          {copied === "all" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          서버 + 키 한번에 복사
        </Button>

        <p className="text-[10px] text-muted-foreground">
          권장: 1080p · 4500kbps · 키프레임 2 · 인코더 x264 또는 NVENC
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
