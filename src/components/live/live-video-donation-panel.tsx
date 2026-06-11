"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Film, Loader2, Play, SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveVideoDonationPayload } from "@/lib/video-donation";
import { youtubeEmbedUrl } from "@/lib/video-donation";

export function LiveVideoDonationPanel({
  channelId,
  isHost,
}: {
  channelId: string;
  isHost: boolean;
}) {
  const [playing, setPlaying] = useState<LiveVideoDonationPayload | null>(null);
  const [queue, setQueue] = useState<LiveVideoDonationPayload[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/${channelId}/video-donations`, { credentials: "include" });
      const body = await res.json();
      if (!res.ok || !body.ok) return;
      setPlaying(body.playing ?? null);
      setQueue(body.queue ?? []);
    } catch {
      /* ignore */
    }
  }, [channelId]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 4000);
    return () => clearInterval(id);
  }, [refresh]);

  async function act(id: string, action: "approve" | "reject" | "play" | "complete" | "skip") {
    setLoadingId(id);
    try {
      await fetch(`/api/live/${channelId}/video-donations/${id}/action`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await refresh();
    } finally {
      setLoadingId(null);
    }
  }

  if (!isHost && !playing) return null;
  if (!playing && queue.length === 0 && !isHost) return null;

  return (
    <div className="rounded-lg border bg-card/95 backdrop-blur p-3 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1">
        <Film className="h-3.5 w-3.5" /> 영상 후원
      </p>

      {playing?.videoId && (
        <div className="space-y-2">
          <div className="aspect-video rounded-md overflow-hidden bg-black">
            <iframe
              title="영상 후원"
              src={youtubeEmbedUrl(playing.videoId, true)}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {playing.username} · {playing.amount.toLocaleString()}원
          </p>
          {isHost && (
            <div className="flex gap-1">
              <Button size="sm" className="h-7 text-xs" disabled={loadingId === playing.id} onClick={() => void act(playing.id, "complete")}>
                재생 완료
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={loadingId === playing.id} onClick={() => void act(playing.id, "skip")}>
                <SkipForward className="h-3 w-3" /> 건너뛰기
              </Button>
            </div>
          )}
        </div>
      )}

      {isHost && queue.length > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {queue.map((item) => (
            <div key={item.id} className="text-xs border-b border-border/50 pb-2 last:border-0">
              <p className="font-medium truncate">{item.username} · {item.amount.toLocaleString()}원</p>
              <p className="text-muted-foreground truncate">{item.videoUrl ?? "URL 대기"}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {item.status === "PENDING_REVIEW" && (
                  <>
                    <Button size="sm" variant="default" className="h-6 text-[10px] px-2" disabled={loadingId === item.id} onClick={() => void act(item.id, "approve")}>
                      <Check className="h-3 w-3" /> 승인
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" disabled={loadingId === item.id} onClick={() => void act(item.id, "reject")}>
                      <X className="h-3 w-3" /> 거절
                    </Button>
                  </>
                )}
                {(item.status === "QUEUED" || item.status === "PENDING_REVIEW") && item.videoId && (
                  <Button size="sm" variant="secondary" className="h-6 text-[10px] px-2" disabled={loadingId === item.id || !!playing} onClick={() => void act(item.id, "play")}>
                    <Play className="h-3 w-3" /> 재생
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** 방송 영상 위 YouTube PiP */
export function LiveVideoDonationOverlay({
  channelId,
}: {
  channelId: string;
}) {
  const [playing, setPlaying] = useState<LiveVideoDonationPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch(`/api/live/${channelId}/video-donations`, { credentials: "include" });
        const body = await res.json();
        if (cancelled || !res.ok || !body.ok) return;
        setPlaying(body.playing ?? null);
      } catch {
        /* ignore */
      }
    }
    tick();
    const id = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [channelId]);

  if (!playing?.videoId) return null;

  return (
    <div className="pointer-events-none absolute top-3 right-3 z-[25] w-[min(42%,320px)] aspect-video rounded-lg overflow-hidden ring-2 ring-red-500/80 shadow-2xl">
      <iframe
        title="영상 후원"
        src={youtubeEmbedUrl(playing.videoId, true)}
        className="w-full h-full"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
}
