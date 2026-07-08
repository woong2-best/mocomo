"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mic, MicOff, Headphones, PhoneOff, Signal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCommunityVoice } from "@/components/community-server/community-voice-context";
import { cn } from "@/lib/utils";

export function VoiceStatusBar() {
  const pathname = usePathname();
  const { voice, disconnect, setMuted, setDeafened } = useCommunityVoice();

  if (!voice.connected || !voice.channelId) return null;

  // 음성 채널 페이지에 있을 때는 인라인 컨트롤만 사용 — 글로벌 바 숨김
  if (voice.channelPageSlug && pathname.endsWith(`/${voice.channelPageSlug}`)) {
    return null;
  }

  const communitySlug = pathname.match(/^\/c\/([^/]+)/)?.[1];
  const voiceHref =
    communitySlug && voice.channelPageSlug
      ? `/c/${communitySlug}/${voice.channelPageSlug}`
      : null;

  return (
    <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-emerald-950/92 text-emerald-50 border-t border-emerald-800/40">
      <Signal className="h-4 w-4 text-emerald-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">음성 연결 중</p>
        <p className="text-[10px] text-emerald-300/80 truncate">{voice.channelName}</p>
      </div>
      {voiceHref && (
        <Link
          href={voiceHref}
          className="text-[10px] text-emerald-200/90 hover:text-white underline-offset-2 hover:underline shrink-0 hidden sm:inline"
        >
          채널로 돌아가기
        </Link>
      )}
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn("h-8 w-8 text-emerald-100 hover:bg-emerald-800/50 rounded-lg", voice.muted && "bg-red-900/50")}
          onClick={() => setMuted(!voice.muted)}
          aria-label={voice.muted ? "음소거 해제" : "음소거"}
        >
          {voice.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn("h-8 w-8 text-emerald-100 hover:bg-emerald-800/50 rounded-lg", voice.deafened && "bg-red-900/50")}
          onClick={() => setDeafened(!voice.deafened)}
          aria-label={voice.deafened ? "스피커 켜기" : "스피커 끄기"}
        >
          <Headphones className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-red-300 hover:bg-red-900/40 rounded-lg"
          onClick={disconnect}
          aria-label="연결 끊기"
        >
          <PhoneOff className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
