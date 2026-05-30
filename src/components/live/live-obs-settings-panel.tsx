"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, RefreshCw, Signal, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearObsStudioReady } from "@/lib/live-obs-studio-ready";

type ObsCreds = { obsServer: string; obsStreamKey: string };

async function fetchObsCredentials(channelId: string, refresh = false): Promise<ObsCreds> {
  const res = await fetch(`/api/live/${channelId}/obs`, {
    method: refresh ? "POST" : "GET",
    credentials: "include",
    cache: "no-store",
    headers: refresh ? { "Content-Type": "application/json" } : undefined,
    body: refresh ? JSON.stringify({ refresh: true }) : undefined,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof body.error === "string" ? body.error : "OBS 키 실패");
  const server = body.obsServer || body.url || "";
  const key = body.obsStreamKey || body.streamKey || "";
  if (!server || !key) throw new Error("서버 또는 키가 비어 있습니다.");
  return { obsServer: server, obsStreamKey: key };
}

/** 설정 다이얼로그 안 — OBS 서버·키·송출 상태 */
export function LiveObsSettingsPanel({ channelId }: { channelId: string }) {
  const [creds, setCreds] = useState<ObsCreds | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onAir, setOnAir] = useState<boolean | null>(null);
  const [signalMsg, setSignalMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        setCreds(await fetchObsCredentials(channelId, refresh));
      } catch {
        setCreds(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [channelId]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    if (!creds) return;
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
        setSignalMsg(typeof body.message === "string" ? body.message : "");
      } catch {
        if (!cancelled) setOnAir(null);
      }
    }
    poll();
    const id = setInterval(poll, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [channelId, creds]);

  if (loading) {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  }

  if (!creds) {
    return (
      <p className="text-sm text-destructive">
        OBS 정보를 불러오지 못했습니다.{" "}
        <button type="button" className="underline" onClick={() => void load(false)}>
          다시 시도
        </button>
      </p>
    );
  }

  return (
    <div className="space-y-3 text-sm border-b border-border pb-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">OBS 연결</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          disabled={refreshing}
          onClick={() => void load(true)}
        >
          {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          키 재발급
        </Button>
      </div>
      <div className="space-y-2">
        <code className="block text-[11px] bg-muted rounded-lg px-2 py-1.5 break-all">{creds.obsServer}</code>
        <code className="block text-[11px] bg-muted rounded-lg px-2 py-1.5 break-all font-mono">
          {creds.obsStreamKey}
        </code>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full rounded-lg gap-1"
        onClick={() => {
          void navigator.clipboard.writeText(
            `서버: ${creds.obsServer}\n방송 키: ${creds.obsStreamKey}`
          );
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        복사
      </Button>
      <div
        className={`rounded-lg px-2.5 py-2 text-xs flex gap-2 ${
          onAir ? "bg-green-500/10 text-green-800 dark:text-green-200" : "bg-muted text-muted-foreground"
        }`}
      >
        {onAir ? <Signal className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
        <span>{signalMsg || (onAir ? "송출 감지됨" : "OBS에서 방송 시작을 눌러 주세요")}</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full text-xs text-muted-foreground"
        onClick={() => {
          clearObsStudioReady(channelId);
          window.location.reload();
        }}
      >
        OBS 연결 안내 화면 다시 보기
      </Button>
    </div>
  );
}
