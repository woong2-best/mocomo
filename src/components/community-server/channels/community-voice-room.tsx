"use client";

import { useEffect, useRef } from "react";
import { Loader2, Mic, MicOff, Headphones, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useCommunityVoiceRoom } from "@/lib/community-voice/use-community-voice-room";
import { cn } from "@/lib/utils";

export function CommunityVoiceRoom({
  channelId,
  channelName,
  muted,
  deafened,
  onMutedChange,
  onDeafenedChange,
  onConnected,
  onDisconnected,
  onError,
}: {
  channelId: string;
  channelName: string;
  muted: boolean;
  deafened: boolean;
  onMutedChange: (muted: boolean) => void;
  onDeafenedChange: (deafened: boolean) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (message: string) => void;
}) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const displayName =
    session?.user?.username || session?.user?.name || userId || "Member";

  const onConnectedRef = useRef(onConnected);
  const onErrorRef = useRef(onError);
  onConnectedRef.current = onConnected;
  onErrorRef.current = onError;

  const { state, remotePeers } = useCommunityVoiceRoom({
    channelId,
    userId: userId ?? "",
    displayName,
    muted,
    deafened,
    enabled: !!userId,
    onConnected: () => onConnectedRef.current?.(),
    onFailed: (msg) => onErrorRef.current?.(msg),
  });

  useEffect(() => {
    return () => onDisconnected?.();
  }, [onDisconnected]);

  if (!userId) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">로그인이 필요합니다.</p>
    );
  }

  if (state === "connecting") {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-border/40 bg-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">음성 채널 연결 중…</p>
      </div>
    );
  }

  if (state === "failed") {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-8 text-center text-sm text-destructive">
        음성 연결에 실패했습니다. TURN 설정과 마이크 권한을 확인해 주세요.
      </div>
    );
  }

  const participantCount = remotePeers.length + 1;

  return (
    <div className="flex min-h-[320px] flex-1 flex-col rounded-2xl border border-border/40 bg-card/30 overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Users className="h-10 w-10" />
        </div>
        <div className="text-center space-y-1">
          <p className="font-semibold">{channelName}</p>
          <p className="text-sm text-muted-foreground">
            {participantCount}명 · Cloudflare TURN 음성
          </p>
        </div>
        {remotePeers.length === 0 ? (
          <p className="text-xs text-muted-foreground">다른 멤버를 기다리는 중…</p>
        ) : (
          <ul className="text-xs text-muted-foreground space-y-1">
            {remotePeers.map((p) => (
              <li key={p.userId} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                참가자 {p.userId.slice(0, 8)}…
                <RemoteAudio stream={p.stream} deafened={deafened} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 flex items-center justify-center gap-2 border-t border-border/40 bg-muted/20 px-4 py-3">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn("rounded-xl", muted && "border-destructive/50 bg-destructive/10")}
          onClick={() => onMutedChange(!muted)}
          aria-label={muted ? "음소거 해제" : "음소거"}
        >
          {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn("rounded-xl", deafened && "border-destructive/50 bg-destructive/10")}
          onClick={() => onDeafenedChange(!deafened)}
          aria-label={deafened ? "스피커 켜기" : "스피커 끄기"}
        >
          <Headphones className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function RemoteAudio({ stream, deafened }: { stream: MediaStream | null; deafened: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    el.muted = deafened;
    void el.play().catch(() => undefined);
  }, [stream, deafened]);

  return <audio ref={ref} autoPlay playsInline className="hidden" />;
}
