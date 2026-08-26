"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, Check, Copy, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildYoutubeObsSetupClipboard,
  YOUTUBE_OBS_CHAT_CSS_PATH,
  youtubeLiveChatPopoutUrl,
} from "@/lib/live-external/youtube-obs-chat";

type Props = {
  videoId: string;
  /** Compact layout for inline hints */
  variant?: "card" | "compact";
};

/**
 * YouTube OBS chat: URL + CSS copied separately (OBS has two fields).
 * Native popout — best emoji / Super Chat fidelity.
 */
export function YoutubeObsQuickSetup({ videoId, variant = "card" }: Props) {
  const [copied, setCopied] = useState<"url" | "css" | "guide" | null>(null);
  const popoutUrl = youtubeLiveChatPopoutUrl(videoId);

  const flash = useCallback((kind: typeof copied) => {
    setCopied(kind);
    setTimeout(() => setCopied(null), 2500);
  }, []);

  const copyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(popoutUrl);
      flash("url");
    } catch {
      /* ignore */
    }
  }, [popoutUrl, flash]);

  const copyCss = useCallback(async () => {
    try {
      const res = await fetch(YOUTUBE_OBS_CHAT_CSS_PATH, { cache: "no-store" });
      if (!res.ok) return;
      await navigator.clipboard.writeText(await res.text());
      flash("css");
    } catch {
      /* ignore */
    }
  }, [flash]);

  const copyGuide = useCallback(async () => {
    try {
      const cssRes = await fetch(YOUTUBE_OBS_CHAT_CSS_PATH, { cache: "no-store" });
      if (!cssRes.ok) return;
      const css = await cssRes.text();
      await navigator.clipboard.writeText(buildYoutubeObsSetupClipboard(popoutUrl, css));
      flash("guide");
    } catch {
      /* ignore */
    }
  }, [popoutUrl, flash]);

  if (variant === "compact") {
    return (
      <Button
        type="button"
        size="sm"
        className="gap-1.5 bg-red-600 hover:bg-red-600/90"
        onClick={() => void copyUrl()}
      >
        {copied === "url" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied === "url" ? "URL 복사됨" : "YouTube 채팅 URL 복사"}
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-red-500/25 bg-gradient-to-br from-red-500/10 to-transparent p-3">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Youtube className="h-4 w-4 text-red-500" />
          YouTube 네이티브 채팅 (이모지·슈퍼챗)
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          OBS에 <strong className="font-medium text-foreground">URL</strong>과{" "}
          <strong className="font-medium text-foreground">CSS</strong>를{" "}
          <em>각각 다른 칸</em>에 넣어야 합니다. 한 번에 복사한 글 전체를 URL란에 붙이면
          채팅이 안 나옵니다.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          className="h-10 gap-2 bg-red-600 text-sm font-semibold hover:bg-red-600/90"
          onClick={() => void copyUrl()}
        >
          {copied === "url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied === "url" ? "URL 복사됨" : "① URL 복사 → OBS URL란"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 gap-2 text-sm font-semibold"
          onClick={() => void copyCss()}
        >
          {copied === "css" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied === "css" ? "CSS 복사됨" : "② CSS 복사 → 사용자 정의 CSS"}
        </Button>
      </div>

      <ol className="space-y-1 text-[11px] text-muted-foreground">
        <li>③ 브라우저 소스 크기: <strong className="text-foreground">450 × 700</strong> (작으면 로그인 줄만 보임)</li>
        <li>④ 배경 투명 ✓ · 「소스 비활성 시 종료」 끄기</li>
        <li>⑤ 채팅 안 보이면 소스 우클릭 → <strong className="text-foreground">새로고침</strong></li>
      </ol>

      <p className="break-all rounded-md bg-background/70 px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
        {popoutUrl}
      </p>

      <details className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 text-[11px]">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 font-medium text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          채팅이 안 나올 때
        </summary>
        <ul className="mt-2 space-y-1.5 pl-1 text-muted-foreground">
          <li>
            · OBS <strong className="text-foreground">30.2.3 이상</strong> 필요 (YouTube CSS
            주입 버그). 도움 → OBS 정보에서 버전 확인.
          </li>
          <li>· URL란에는 위 <code className="text-[10px]">live_chat?is_popout=1</code> 주소만.</li>
          <li>· CSS는 「사용자 정의 CSS」칸에만 — URL란에 넣지 마세요.</li>
          <li>· YouTube에서 실제로 채팅이 켜져 있는지, 방송이 라이브인지 확인.</li>
          <li>
            · 그래도 안 되면 아래 <strong className="text-foreground">MoCoMo 통합 오버레이</strong>
            를 쓰세요 (CSS 없이 바로 작동).
          </li>
        </ul>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 h-7 px-2 text-[11px]"
          onClick={() => void copyGuide()}
        >
          {copied === "guide" ? "가이드 복사됨" : "전체 가이드 텍스트 복사 (메모용)"}
        </Button>
      </details>
    </div>
  );
}
