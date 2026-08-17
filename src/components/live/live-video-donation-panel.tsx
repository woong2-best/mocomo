"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Film, Loader2, Play, SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveVideoDonationPayload } from "@/lib/video-donation";
import { formatSecLabel, youtubeEmbedUrl } from "@/lib/video-donation";
import { formatUsd } from "@/lib/money";

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
        <VideoDonationPlayer item={playing} isHost={isHost} loadingId={loadingId} onAct={act} />
      )}

      {isHost && queue.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {queue.map((item) => (
            <div key={item.id} className="text-xs border-b border-border/50 pb-2 last:border-0">
              <p className="font-medium truncate">
                {item.username} · {formatUsd(item.amount)}
              </p>
              <p className="text-muted-foreground truncate">
                {item.videoTitle ?? item.videoUrl ?? "URL 없음"}
              </p>
              {item.description && (
                <p className="text-muted-foreground truncate italic">&ldquo;{item.description}&rdquo;</p>
              )}
              {item.durationSec != null && (
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  {formatSecLabel(item.startSec)} ~{" "}
                  {item.playToEnd ? "끝까지" : formatSecLabel(item.endSec ?? item.startSec + item.durationSec)}{" "}
                  ({item.durationSec}초)
                </p>
              )}
              <div className="flex flex-wrap gap-1 mt-1">
                {item.status === "PENDING_REVIEW" && (
                  <>
                    <Button
                      size="sm"
                      variant="default"
                      className="h-6 text-[10px] px-2"
                      disabled={loadingId === item.id}
                      onClick={() => void act(item.id, "approve")}
                    >
                      <Check className="h-3 w-3" /> 승인
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2"
                      disabled={loadingId === item.id}
                      onClick={() => void act(item.id, "reject")}
                    >
                      <X className="h-3 w-3" /> 거절
                    </Button>
                  </>
                )}
                {(item.status === "QUEUED" || item.status === "PENDING_REVIEW") && item.videoId && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-6 text-[10px] px-2"
                    disabled={loadingId === item.id || !!playing}
                    onClick={() => void act(item.id, "play")}
                  >
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

function VideoDonationPlayer({
  item,
  isHost,
  loadingId,
  onAct,
}: {
  item: LiveVideoDonationPayload;
  isHost: boolean;
  loadingId: string | null;
  onAct: (id: string, action: "complete" | "skip") => void;
}) {
  if (!item.videoId) return null;

  return (
    <div className="space-y-2">
      <div className="aspect-video rounded-md overflow-hidden bg-black">
        <iframe
          title="영상 후원"
          src={youtubeEmbedUrl(item.videoId, {
            autoplay: true,
            startSec: item.startSec,
            endSec: item.playToEnd ? undefined : item.endSec ?? undefined,
          })}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {item.username} · {formatUsd(item.amount)}
      </p>
      {item.description && (
        <p className="text-xs bg-muted/50 rounded-md px-2 py-1.5 leading-snug">{item.description}</p>
      )}
      {isHost && (
        <div className="flex gap-1">
          <Button
            size="sm"
            className="h-7 text-xs"
            disabled={loadingId === item.id}
            onClick={() => void onAct(item.id, "complete")}
          >
            재생 완료
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={loadingId === item.id}
            onClick={() => void onAct(item.id, "skip")}
          >
            <SkipForward className="h-3 w-3" /> 건너뛰기
          </Button>
        </div>
      )}
    </div>
  );
}

/** 방송 영상 위 YouTube PiP + 설명 */
export function LiveVideoDonationOverlay({ channelId }: { channelId: string }) {
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
    <div className="pointer-events-none absolute top-3 right-3 z-[25] w-[min(42%,360px)]">
      <div className="aspect-video rounded-lg overflow-hidden ring-2 ring-emerald-500/80 shadow-2xl bg-black">
        <iframe
          title="영상 후원"
          src={youtubeEmbedUrl(playing.videoId, {
            autoplay: true,
            startSec: playing.startSec,
            endSec: playing.playToEnd ? undefined : playing.endSec ?? undefined,
          })}
          className="w-full h-full"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
      <div className="mt-1 rounded-md bg-black/75 px-2 py-1.5 text-white text-xs space-y-0.5">
        <p className="font-semibold truncate">
          {playing.username} · {playing.amount.toLocaleString()}원
        </p>
        {playing.description && <p className="text-white/85 line-clamp-2">{playing.description}</p>}
      </div>
    </div>
  );
}
