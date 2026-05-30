"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Check, Loader2, Monitor, Radio, Signal, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveBroadcastPlayer } from "@/components/live/live-broadcast-player";

type ObsCreds = {
  obsServer: string;
  obsStreamKey: string;
  ingestEngine?: string;
  warning?: string;
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
    throw new Error(typeof body.error === "string" ? body.error : "OBS 키를 불러오지 못했습니다.");
  }
  const server = body.obsServer || body.url || "";
  const key = body.obsStreamKey || body.streamKey || "";
  if (!server || !key) throw new Error("서버 또는 키가 비어 있습니다.");
  return {
    obsServer: server,
    obsStreamKey: key,
    ingestEngine: typeof body.ingestEngine === "string" ? body.ingestEngine : undefined,
    warning: typeof body.warning === "string" ? body.warning : undefined,
  };
}

/** 트위치식 — 웹은 준비만, OBS 「방송 시작」= 실제 LIVE */
export function LiveObsControlCenter({ channelId }: { channelId: string }) {
  const [creds, setCreds] = useState<ObsCreds | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [onAir, setOnAir] = useState(false);
  const [playable, setPlayable] = useState(false);
  const [signalMsg, setSignalMsg] = useState("");
  const [ingestEngine, setIngestEngine] = useState<string>("srs");
  const [warning, setWarning] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadCreds = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setLoadError("");
    try {
      if (!refresh) {
        try {
          const health = await fetch("/api/health/obs", { cache: "no-store" });
          const h = await health.json().catch(() => ({}));
          if (h.engine === "livekit") {
            await fetch(`/api/live/${channelId}/obs`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ migrateLivekit: true }),
            });
          }
        } catch {
          /* ignore */
        }
      }
      const c = await fetchObsCredentials(channelId, refresh);
      setCreds(c);
      setIngestEngine(c.ingestEngine ?? "srs");
      setWarning(c.warning ?? "");
    } catch (e) {
      setCreds(null);
      setWarning("");
      setLoadError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [channelId]);

  useEffect(() => {
    void loadCreds();
  }, [loadCreds]);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/live/${channelId}/broadcast-status`, {
          credentials: "include",
          cache: "no-store",
        });
        const body = await res.json();
        if (cancelled) return;
        setOnAir(!!body.onAir);
        setPlayable(!!body.playable);
        setSignalMsg(typeof body.message === "string" ? body.message : "");
      } catch {
        if (!cancelled) setOnAir(false);
      }
    }
    poll();
    const id = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [channelId]);

  function copyAll() {
    if (!creds) return;
    void navigator.clipboard.writeText(
      `서버: ${creds.obsServer}\n방송 키: ${creds.obsStreamKey}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-violet-500/30 bg-violet-500/5 p-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">OBS 서버 · 방송 키</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs rounded-lg gap-1"
            disabled={loading || refreshing}
            onClick={() => void loadCreds(true)}
          >
            {refreshing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            키 다시 받기
          </Button>
        </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
          <Loader2 className="h-4 w-4 animate-spin" />
          불러오는 중…
        </div>
      ) : loadError || !creds ? (
        <div className="text-sm text-destructive space-y-2">
          <p>{loadError || "연결 정보 없음"}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadCreds(false)}>
            다시 시도
          </Button>
        </div>
      ) : (
        <>
          {warning && (
            <p className="text-[11px] text-amber-800 dark:text-amber-200 bg-amber-500/15 rounded-lg px-2 py-1.5">
              {warning}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            OBS → 설정 → 방송 → 「사용자 지정」 · 서버/키 각각 입력 후 「방송 시작」
          </p>
          <p className="text-[11px] text-amber-800 dark:text-amber-200 bg-amber-500/15 rounded-lg px-2 py-1.5">
            <strong>다중 송출(Multiple RTMP) 플러그인은 끄세요.</strong> SoraYuki 문구는 오류가 아닙니다.
            메인 「방송 시작」만 쓰거나, 플러그인에도 아래 서버·키를 똑같이 넣어야 합니다.
          </p>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-0.5">서버</p>
            <code className="block text-xs sm:text-sm bg-muted rounded-lg px-2 py-2 break-all select-all font-mono">
              {creds.obsServer}
            </code>
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-0.5">방송 키</p>
            <code className="block text-xs sm:text-sm bg-muted rounded-lg px-2 py-2 break-all select-all font-mono">
              {creds.obsStreamKey}
            </code>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full rounded-lg gap-1"
            onClick={copyAll}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            서버 + 키 복사
          </Button>
        </>
      )}
      </div>

      <div
        className={`rounded-xl border px-3 py-2.5 flex flex-wrap items-center gap-2 text-sm ${
          onAir && playable
            ? "border-red-500/40 bg-red-500/10"
            : "border-border bg-muted/40"
        }`}
      >
        {onAir && playable ? (
          <span className="live-badge text-xs px-2 py-0.5 flex items-center gap-1">
            <Radio className="h-3 w-3" />
            LIVE
          </span>
        ) : (
          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
            오프라인
          </span>
        )}
        <Monitor className="h-4 w-4 text-violet-600 shrink-0" />
        <p className="flex-1 min-w-[200px] text-xs sm:text-sm text-muted-foreground">
          {onAir && playable
            ? "시청자에게 방송이 노출되고 있습니다."
            : ingestEngine === "livekit"
              ? "LiveKit 방송입니다. OBS 「방송 시작」 후 3~10초면 화면이 나옵니다 (VPS 불필요)."
              : "OBS에서 「방송 시작」을 누르면 자동으로 LIVE 됩니다."}
        </p>
      </div>

      {creds && (
        <div
          className={`rounded-lg px-2 py-1.5 text-xs flex gap-2 ${
            onAir ? "bg-green-500/10 text-green-800 dark:text-green-200" : "bg-muted"
          }`}
        >
          {onAir ? <Signal className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>
            {ingestEngine === "livekit"
              ? "LiveKit 송출 · "
              : "VPS(SRS) 송출 · "}
            {signalMsg || "OBS에서 방송 시작을 눌러 주세요."}
          </span>
        </div>
      )}

      <div className="min-h-[240px] bg-black rounded-xl overflow-hidden ring-1 ring-border/40">
        <LiveBroadcastPlayer channelId={channelId} />
      </div>
    </div>
  );
}
