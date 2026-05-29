"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Check, Monitor, Radio, Loader2, RefreshCw, Signal, AlertCircle } from "lucide-react";
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

/** OBS → SRS RTMP 송출 — 키 발급, 시청자는 HLS */
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
  const [copied, setCopied] = useState<"all" | "server" | "key" | null>(null);
  const [onAir, setOnAir] = useState<boolean | null>(null);
  const [signalMsg, setSignalMsg] = useState("");

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

    async function checkSignal() {
      try {
        const res = await fetch(`/api/live/${channelId}/broadcast-status`, {
          credentials: "include",
          cache: "no-store",
        });
        const body = await res.json();
        if (cancelled) return;
        setOnAir(!!body.onAir);
        setSignalMsg(typeof body.message === "string" ? body.message : "");
      } catch {
        if (!cancelled) setOnAir(null);
      }
    }

    checkSignal();
    const id = setInterval(checkSignal, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
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

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold flex items-center gap-2 text-sm">
            <Monitor className="h-4 w-4 text-violet-600" />
            OBS → SRS 방송
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg gap-1 h-8 text-xs"
            disabled={refreshing}
            onClick={() => loadIngress(true)}
          >
            {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            키 재발급 (계정)
          </Button>
        </div>

        <p className="text-xs text-violet-800/90 dark:text-violet-200 bg-background/60 rounded-lg px-2.5 py-2">
          이 <strong>방송 키는 계정당 1개</strong>입니다 (트위치·치지직과 같음). 방송을 바꿔도 같은 키를 OBS에
          두면 됩니다. 키가 유출됐을 때만 「키 재발급」을 누르세요.
        </p>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>OBS → 설정 → 방송 → 서비스 <strong>사용자 지정</strong></li>
          <li>아래 <strong>서버</strong>·<strong>방송 키</strong> 복사 후 붙여넣기 (한 번만 저장해 두면 됨)</li>
          <li>OBS에서 <strong>방송 시작</strong> → 위 미리보기·시청자 화면에 표시</li>
        </ol>

        <div className="space-y-2">
          <label className="text-[11px] font-medium text-violet-800 dark:text-violet-200">① 서버</label>
          <div className="flex gap-2">
            <code className="flex-1 text-xs bg-background rounded-lg px-3 py-2.5 break-all border select-all">
              {creds.obsServer}
            </code>
            <Button type="button" size="icon" variant="outline" className="shrink-0" onClick={() => copy(creds.obsServer, "server")}>
              {copied === "server" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-medium text-violet-800 dark:text-violet-200">② 방송 키</label>
          <div className="flex gap-2">
            <code className="flex-1 text-xs bg-background rounded-lg px-3 py-2.5 break-all border font-mono select-all">
              {creds.obsStreamKey}
            </code>
            <Button type="button" size="icon" variant="outline" className="shrink-0" onClick={() => copy(creds.obsStreamKey, "key")}>
              {copied === "key" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full rounded-xl gap-1 text-xs"
          onClick={() => copy(`서버: ${creds.obsServer}\n방송 키: ${creds.obsStreamKey}`, "all")}
        >
          {copied === "all" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          서버 + 키 한번에 복사
        </Button>

        <div
          className={`rounded-xl px-3 py-2.5 text-xs flex gap-2 items-start ${
            onAir === true
              ? "bg-green-500/15 border border-green-500/40 text-green-800 dark:text-green-200"
              : onAir === false
                ? "bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-100"
                : "bg-muted/50 border border-border text-muted-foreground"
          }`}
        >
          {onAir === true ? (
            <Signal className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-medium">
              {onAir === true
                ? "SRS 송출 신호 수신 중"
                : onAir === false
                  ? "SRS에 신호 없음"
                  : "송출 상태 확인 중…"}
            </p>
            {signalMsg && <p className="mt-1 opacity-90">{signalMsg}</p>}
            <p className="mt-1.5 text-[10px] opacity-80">
              참고: 브라우저에서 <code className="bg-background/80 px-1 rounded">http://서버IP:8080/live/</code> 만
              열면 Not Found가 정상입니다. 방송 중에는 위 <strong>방송 키</strong>와 같은 이름의{" "}
              <code className="bg-background/80 px-1 rounded">.m3u8</code> 파일이 생성됩니다.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="destructive" className="rounded-xl gap-1" onClick={onEndStream}>
          <Radio className="h-4 w-4" />
          방송 종료
        </Button>
      </div>
    </div>
  );
}
