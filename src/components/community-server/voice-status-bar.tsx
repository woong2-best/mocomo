"use client";

import { Mic, MicOff, Headphones, HeadphoneOff, PhoneOff, Signal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCommunityVoice } from "@/components/community-server/community-voice-context";
import { cn } from "@/lib/utils";

export function VoiceStatusBar() {
  const { voice, disconnect, setMuted, setDeafened } = useCommunityVoice();

  if (!voice.connected || !voice.channelId) return null;

  return (
    <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-emerald-950/90 text-emerald-50 border-t border-emerald-800/50">
      <Signal className="h-4 w-4 text-emerald-400 shrink-0 animate-pulse" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">음성 연결됨</p>
        <p className="text-[10px] text-emerald-300/80 truncate">{voice.channelName}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn("h-8 w-8 text-emerald-100 hover:bg-emerald-800/50", voice.muted && "bg-red-900/50")}
          onClick={() => setMuted(!voice.muted)}
          aria-label={voice.muted ? "음소거 해제" : "음소거"}
        >
          {voice.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn("h-8 w-8 text-emerald-100 hover:bg-emerald-800/50", voice.deafened && "bg-red-900/50")}
          onClick={() => setDeafened(!voice.deafened)}
          aria-label={voice.deafened ? "스피커 켜기" : "스피커 끄기"}
        >
          {voice.deafened ? <HeadphoneOff className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-red-300 hover:bg-red-900/40"
          onClick={disconnect}
          aria-label="연결 끊기"
        >
          <PhoneOff className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
