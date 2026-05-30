"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, Monitor, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setObsStudioReady } from "@/lib/live-obs-studio-ready";

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
  if (!server || !key) throw new Error("서버 또는 방송 키가 비어 있습니다.");
  return { obsServer: server, obsStreamKey: key };
}

/** OBS 키 연결 확인 — 확인 후에만 방송 화면으로 */
export function LiveObsSetupGate({
  channelId,
  channelName,
  onReady,
  onEndStream,
}: {
  channelId: string;
  channelName: string;
  onReady: () => void;
  onEndStream: () => void;
}) {
  const [creds, setCreds] = useState<ObsCreds | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [obsPasted, setObsPasted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setCreds(await fetchObsCredentials(channelId));
    } catch (e) {
      setCreds(null);
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    void load();
  }, [load]);

  function copyAll() {
    if (!creds) return;
    void navigator.clipboard.writeText(
      `서버: ${creds.obsServer}\n방송 키: ${creds.obsStreamKey}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function confirmEnter() {
    setObsStudioReady(channelId);
    onReady();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">OBS 연결 정보 불러오는 중…</p>
      </div>
    );
  }

  if (error || !creds) {
    return (
      <div className="max-w-md mx-auto space-y-4 p-6">
        <p className="text-sm text-destructive">{error || "연결 정보 없음"}</p>
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => void load()}>
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 py-4">
      <div className="text-center space-y-2">
        <Monitor className="h-10 w-10 mx-auto text-violet-600" />
        <h2 className="text-xl font-bold">{channelName}</h2>
        <p className="text-sm text-muted-foreground">
          OBS에 아래 정보를 붙인 뒤 「확인」을 누르면 방송 화면으로 이동합니다.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3 text-sm">
        <p className="text-xs text-muted-foreground">
          OBS → 설정 → 방송 → 서비스 <strong className="text-foreground">사용자 지정</strong>
        </p>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1">서버</p>
          <code className="block text-xs bg-muted rounded-lg px-3 py-2 break-all select-all">
            {creds.obsServer}
          </code>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1">방송 키</p>
          <code className="block text-xs bg-muted rounded-lg px-3 py-2 break-all font-mono select-all">
            {creds.obsStreamKey}
          </code>
        </div>
        <Button type="button" variant="secondary" size="sm" className="w-full rounded-xl gap-1" onClick={copyAll}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          서버 + 키 복사
        </Button>
      </div>

      <label className="flex items-start gap-2 text-sm cursor-pointer px-1">
        <input
          type="checkbox"
          className="mt-1"
          checked={obsPasted}
          onChange={(e) => setObsPasted(e.target.checked)}
        />
        <span>OBS에 서버와 방송 키를 붙여 넣었습니다 (또는 이미 저장되어 있습니다)</span>
      </label>

      <Button
        type="button"
        className="w-full rounded-xl h-11 text-base gap-2"
        disabled={!obsPasted}
        onClick={confirmEnter}
      >
        <Radio className="h-5 w-5" />
        확인 · 방송 화면으로
      </Button>

      <div className="flex justify-center">
        <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onEndStream}>
          방송 취소
        </Button>
      </div>
    </div>
  );
}
