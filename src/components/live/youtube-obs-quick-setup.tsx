"use client";

import { useCallback, useState } from "react";
import { Check, Copy, Youtube } from "lucide-react";
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
 * YouTube OBS chat: one-click copy (URL + CSS + steps).
 * Native popout — best emoji / Super Chat fidelity.
 */
export function YoutubeObsQuickSetup({ videoId, variant = "card" }: Props) {
  const [copied, setCopied] = useState<"full" | "url" | "css" | null>(null);
  const popoutUrl = youtubeLiveChatPopoutUrl(videoId);

  const flash = useCallback((kind: typeof copied) => {
    setCopied(kind);
    setTimeout(() => setCopied(null), 2500);
  }, []);

  const copyFullSetup = useCallback(async () => {
    try {
      const cssRes = await fetch(YOUTUBE_OBS_CHAT_CSS_PATH, { cache: "force-cache" });
      if (!cssRes.ok) return;
      const css = await cssRes.text();
      await navigator.clipboard.writeText(buildYoutubeObsSetupClipboard(popoutUrl, css));
      flash("full");
    } catch {
      /* ignore */
    }
  }, [popoutUrl, flash]);

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
      const res = await fetch(YOUTUBE_OBS_CHAT_CSS_PATH, { cache: "force-cache" });
      if (!res.ok) return;
      await navigator.clipboard.writeText(await res.text());
      flash("css");
    } catch {
      /* ignore */
    }
  }, [flash]);

  if (variant === "compact") {
    return (
      <Button
        type="button"
        size="sm"
        className="gap-1.5 bg-red-600 hover:bg-red-600/90"
        onClick={() => void copyFullSetup()}
      >
        {copied === "full" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied === "full" ? "복사됨!" : "OBS YouTube 채팅 설정 복사"}
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-red-500/25 bg-gradient-to-br from-red-500/10 to-transparent p-3">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Youtube className="h-4 w-4 text-red-500" />
          YouTube 채팅 OBS (추천)
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          아래 버튼 한 번 → OBS에 URL과 CSS 붙여넣기만 하면 됩니다. 이모지·슈퍼챗이
          YouTube 그대로 나옵니다.
        </p>
      </div>

      <ol className="space-y-1 text-[11px] text-muted-foreground">
        <li>① 복사 버튼 클릭</li>
        <li>② OBS 브라우저 소스 → URL란에 주소 붙여넣기</li>
        <li>③ 같은 소스 속성 → 「사용자 정의 CSS」에 CSS 붙여넣기</li>
        <li>④ 배경 투명 ✓ · 450×700</li>
      </ol>

      <Button
        type="button"
        className="h-10 w-full gap-2 bg-red-600 text-sm font-semibold hover:bg-red-600/90"
        onClick={() => void copyFullSetup()}
      >
        {copied === "full" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied === "full" ? "클립보드에 복사됨 — OBS에 붙여넣기" : "OBS 설정 한 번에 복사"}
      </Button>

      <details className="text-[11px]">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          URL / CSS 개별 복사
        </summary>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="h-7" onClick={() => void copyUrl()}>
            {copied === "url" ? "URL 복사됨" : "URL만"}
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-7" onClick={() => void copyCss()}>
            {copied === "css" ? "CSS 복사됨" : "CSS만"}
          </Button>
        </div>
        <p className="mt-2 break-all font-mono text-[10px] text-muted-foreground">{popoutUrl}</p>
      </details>
    </div>
  );
}
