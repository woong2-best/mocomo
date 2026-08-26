"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mintLiveOverlayUrls } from "@/actions/live-external";

type Props = {
  channelId: string;
};

/** Host-only: one OBS chat URL — paste into browser source, done. */
export function ExternalLiveHostDashboard({ channelId }: Props) {
  const [obsChatUrl, setObsChatUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void mintLiveOverlayUrls(channelId).then((res) => {
      if (cancelled || "error" in res) return;
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setObsChatUrl(`${origin}${res.chatUrl}`);
    });
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  const copyUrl = useCallback(async () => {
    if (!obsChatUrl) return;
    try {
      await navigator.clipboard.writeText(obsChatUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [obsChatUrl]);

  return (
    <div className="mb-3 rounded-xl border-2 border-primary/25 bg-card p-3">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Monitor className="h-4 w-4 text-primary" />
        OBS 채팅
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        ① 아래 버튼으로 URL 복사 → ② OBS 브라우저 소스 URL란에 붙여넣기 → ③ 450×700 · 배경
        투명 ✓
      </p>
      {obsChatUrl ? (
        <>
          <Button type="button" className="mt-3 h-11 w-full gap-2 font-semibold" onClick={() => void copyUrl()}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "복사됨" : "OBS 채팅 URL 복사"}
          </Button>
          <p className="mt-2 break-all font-mono text-[10px] text-muted-foreground">{obsChatUrl}</p>
        </>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">URL 불러오는 중…</p>
      )}
      <p className="mt-2 text-[10px] text-muted-foreground">
        YouTube·MoCoMo 댓글이 이 URL 하나로 OBS에 표시됩니다. CSS나 다른 URL은 필요 없습니다.
      </p>
    </div>
  );
}
