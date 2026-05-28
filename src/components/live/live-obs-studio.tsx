"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Monitor, Radio, Loader2 } from "lucide-react";
import { ensureObsIngress } from "@/actions/live-stream";
import { Button } from "@/components/ui/button";
import { LiveObsPreview } from "@/components/live/live-obs-preview";

export function LiveObsStudio({
  channelId,
  onEndStream,
}: {
  channelId: string;
  onEndStream: () => void;
}) {
  const [url, setUrl] = useState("");
  const [streamKey, setStreamKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<"url" | "key" | null>(null);

  useEffect(() => {
    ensureObsIngress(channelId)
      .then((res) => {
        if ("error" in res && res.error) {
          setError(res.error);
          return;
        }
        if ("url" in res && res.url) setUrl(res.url);
        if ("streamKey" in res && res.streamKey) setStreamKey(res.streamKey);
      })
      .finally(() => setLoading(false));
  }, [channelId]);

  function copy(text: string, which: "url" | "key") {
    void navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive p-4 rounded-xl bg-destructive/10">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <Monitor className="h-4 w-4 text-violet-600" />
          OBS Studio 연동 (RTMP)
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          OBS → 설정 → 방송 → 서비스 <strong>사용자 지정</strong>. 아래 서버·키를 입력한 뒤「방송 시작」하세요.
          여러 스트리머가 동시에 방송해도 방마다 URL이 달라 서로 간섭하지 않습니다.
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
            <Button type="button" size="icon" variant="outline" className="shrink-0" onClick={() => copy(streamKey, "key")}>
              {copied === "key" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          권장: 1080p 4500kbps · 키프레임 2 · x264/NVENC. 송출 시작 후 아래 미리보기에 화면이 보입니다.
        </p>
      </div>

      <LiveObsPreview channelId={channelId} />

      <div className="flex justify-end">
        <Button variant="destructive" className="rounded-xl gap-1" onClick={onEndStream}>
          <Radio className="h-4 w-4" />
          방송 종료
        </Button>
      </div>
    </div>
  );
}
