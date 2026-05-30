"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveObsMultiRtmpGuide } from "@/components/live/live-obs-multi-rtmp-guide";
import { LiveObsStandardGuide } from "@/components/live/live-obs-standard-guide";

export type ObsReadyCreds = {
  obsServer: string;
  obsStreamKey: string;
  ingestEngine?: string;
};

async function loadObsCreds(channelId: string): Promise<ObsReadyCreds> {
  const res = await fetch(`/api/live/${channelId}/obs`, {
    credentials: "include",
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "OBS 연결 정보를 불러오지 못했습니다.");
  }
  const server = body.obsServer || body.url || "";
  const key = body.obsStreamKey || body.streamKey || "";
  if (!server || !key) throw new Error("서버 또는 방송 키가 비어 있습니다.");
  return {
    obsServer: server,
    obsStreamKey: key,
    ingestEngine: typeof body.ingestEngine === "string" ? body.ingestEngine : undefined,
  };
}

/** 방송 준비 완료 화면 — OBS 서버·방송 키 */
export function LiveObsReadyBlock({
  channelId,
  initial,
}: {
  channelId: string;
  initial?: ObsReadyCreds | null;
}) {
  const [creds, setCreds] = useState<ObsReadyCreds | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"all" | "server" | "key" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setCreds(await loadObsCreds(channelId));
    } catch (e) {
      setCreds(null);
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    if (initial?.obsServer && initial?.obsStreamKey) {
      setCreds(initial);
      setLoading(false);
      return;
    }
    void load();
  }, [initial, load]);

  function copy(text: string, kind: "all" | "server" | "key") {
    void navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="w-full text-left rounded-xl border border-violet-500/35 bg-violet-500/8 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Monitor className="h-5 w-5 text-violet-600 shrink-0" />
        <p className="text-sm font-semibold">OBS 연결 (서버 · 방송 키)</p>
      </div>
      {creds?.ingestEngine === "srs" ? (
        <LiveObsMultiRtmpGuide compact />
      ) : (
        <LiveObsStandardGuide compact />
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
          <Loader2 className="h-4 w-4 animate-spin" />
          연결 정보 불러오는 중…
        </div>
      ) : error || !creds ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{error || "연결 정보 없음"}</p>
          <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => void load()}>
            다시 시도
          </Button>
        </div>
      ) : (
        <>
          {creds.ingestEngine === "livekit" && (
            <p className="text-[10px] text-violet-700 dark:text-violet-300">송출: LiveKit Cloud</p>
          )}
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-1">서버</p>
            <code className="block text-xs bg-muted/80 rounded-lg px-2 py-2 break-all select-all font-mono">
              {creds.obsServer}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 mt-1 text-xs gap-1"
              onClick={() => copy(creds.obsServer, "server")}
            >
              {copied === "server" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              서버 복사
            </Button>
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-1">방송 키</p>
            <code className="block text-xs bg-muted/80 rounded-lg px-2 py-2 break-all select-all font-mono">
              {creds.obsStreamKey}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 mt-1 text-xs gap-1"
              onClick={() => copy(creds.obsStreamKey, "key")}
            >
              {copied === "key" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              키 복사
            </Button>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full rounded-lg gap-1"
            onClick={() =>
              copy(`서버: ${creds.obsServer}\n방송 키: ${creds.obsStreamKey}`, "all")
            }
          >
            {copied === "all" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            서버 + 키 한번에 복사
          </Button>
        </>
      )}
    </div>
  );
}
