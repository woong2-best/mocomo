"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Check, Loader2, Monitor, Radio, Signal, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveHlsPlayer } from "@/components/live/live-hls-player";

type ObsCreds = { obsServer: string; obsStreamKey: string };

async function fetchObsCredentials(channelId: string): Promise<ObsCreds> {
  const res = await fetch(`/api/live/${channelId}/obs`, {
    credentials: "include",
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "OBS 키를 불러오지 못했습니다.");
  }
  const server = body.obsServer || body.url || "";
  const key = body.obsStreamKey || body.streamKey || "";
  if (!server || !key) throw new Error("서버 또는 키가 비어 있습니다.");
  return { obsServer: server, obsStreamKey: key };
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

  const loadCreds = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setCreds(await fetchObsCredentials(channelId));
    } catch (e) {
      setCreds(null);
      setLoadError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
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
            : "웹에서 방송을 켜지 않습니다. OBS에서 「방송 시작」을 누르면 자동으로 LIVE 됩니다."}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          OBS 연결 정보 불러오는 중…
        </div>
      ) : loadError || !creds ? (
        <div className="text-sm text-destructive space-y-2">
          <p>{loadError || "연결 정보 없음"}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadCreds()}>
            다시 시도
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-3 space-y-2 text-sm">
          <p className="text-[11px] text-amber-700 dark:text-amber-300">
            OBS → 설정 → 방송 → 서비스 「사용자 지정」 · 서버/키를 각각 해당 칸에만 넣으세요.
          </p>
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">서버</p>
            <code className="block text-[11px] bg-muted rounded-lg px-2 py-1.5 break-all select-all">
              {creds.obsServer}
            </code>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">방송 키</p>
            <code className="block text-[11px] bg-muted rounded-lg px-2 py-1.5 break-all font-mono select-all">
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
          <div
            className={`rounded-lg px-2 py-1.5 text-xs flex gap-2 ${
              onAir ? "bg-green-500/10 text-green-800 dark:text-green-200" : "bg-muted"
            }`}
          >
            {onAir ? (
              <Signal className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{signalMsg || "OBS에서 방송 시작을 눌러 주세요."}</span>
          </div>
        </div>
      )}

      <div className="min-h-[240px] bg-black rounded-xl overflow-hidden ring-1 ring-border/40">
        <LiveHlsPlayer channelId={channelId} />
      </div>
    </div>
  );
}
