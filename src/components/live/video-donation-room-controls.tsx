"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DonationCard = {
  id: string;
  status: string;
  videoTitle: string | null;
  mocoLabel: string;
  username: string;
  senderId: string;
};

type RoomState = {
  isHost: boolean;
  pendingCount: number;
  playing: DonationCard | null;
  queue: DonationCard[];
  mine: DonationCard[];
  settings: { enabled: boolean; maxSec: number; rateCentiPer10Sec: number };
};

const END_STREAM_WARNING =
  "There are pending video donations in the queue. Are you sure you want to end the stream?";

export function confirmEndStreamIfVideoQueue(pendingCount: number): boolean {
  if (pendingCount <= 0) return true;
  return window.confirm(END_STREAM_WARNING);
}

export async function fetchVideoDonationPendingCount(channelId: string): Promise<number> {
  const res = await fetch(`/api/live/${channelId}/video-donations`, { credentials: "include" });
  if (!res.ok) return 0;
  const body = (await res.json()) as { pendingCount?: number };
  return body.pendingCount ?? 0;
}

export function VideoDonationRoomControls({
  channelId,
  isHost,
}: {
  channelId: string;
  isHost?: boolean;
}) {
  const [state, setState] = useState<RoomState | null>(null);
  const [volume, setVolume] = useState(100);
  const [rate, setRate] = useState("0.1");
  const [maxSec, setMaxSec] = useState("60");
  const [enabled, setEnabled] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/live/${channelId}/video-donations`, { credentials: "include" });
    if (!res.ok) return;
    const body = (await res.json()) as RoomState;
    setState(body);
    setEnabled(body.settings.enabled);
    setMaxSec(String(body.settings.maxSec));
    const centi = body.settings.rateCentiPer10Sec;
    const whole = Math.floor(centi / 100);
    const frac = String(centi % 100).padStart(2, "0");
    setRate(centi % 100 === 0 ? String(whole) : `${whole}.${frac}`.replace(/0$/, "").replace(/\.$/, ""));
  }, [channelId]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(id);
  }, [refresh]);

  async function act(body: Record<string, unknown>) {
    await fetch(`/api/live/${channelId}/video-donations`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await refresh();
  }

  if (!state) return null;

  const mineWaiting = state.mine.filter((row) => row.status === "PENDING");
  const minePlaying = state.mine.filter((row) => row.status === "PLAYING");

  return (
    <div className="space-y-2">
      {mineWaiting.map((row) => (
        <div key={row.id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{row.videoTitle || "Video donation"}</p>
            <p className="text-[11px] text-muted-foreground">{row.mocoLabel} MOCO · in queue</p>
          </div>
          <button
            type="button"
            className="h-7 w-7 rounded-full text-sm font-bold hover:bg-muted"
            aria-label="Remove from queue"
            onClick={() => {
              if (window.confirm("대기열에서 삭제하시겠습니까?")) {
                void act({ action: "cancel", donationId: row.id });
              }
            }}
          >
            ×
          </button>
        </div>
      ))}
      {minePlaying.map((row) => (
        <div key={row.id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 opacity-80">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{row.videoTitle || "Video donation"}</p>
            <p className="text-[11px] text-muted-foreground">{row.mocoLabel} MOCO · playing</p>
          </div>
        </div>
      ))}

      {isHost && state.isHost ? (
        <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-2">
          <p className="text-xs font-semibold">Video donation controls</p>
          {state.playing ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-xs">{state.playing.videoTitle || state.playing.username}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => void act({ action: "pause" })}>
                Pause
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => void act({ action: "resume" })}>
                Play
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => void act({ action: "skip", donationId: state.playing?.id })}
              >
                Skip
              </Button>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">No video is playing.</p>
          )}
          <label className="flex items-center gap-2 text-[11px]">
            Volume
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => {
                const next = Number(e.target.value);
                setVolume(next);
                void act({ action: "volume", volume: next });
              }}
            />
          </label>
          {state.queue.map((row) => (
            <div key={row.id} className="flex items-center gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate">
                {row.username} · {row.mocoLabel} MOCO
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (
                    window.confirm(
                      "Removing this video refunds the MOCO to the viewer immediately. Remove it from the queue?"
                    )
                  ) {
                    void act({ action: "delete", donationId: row.id });
                  }
                }}
              >
                Remove from queue
              </Button>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <label className="flex items-center gap-2 text-[11px]">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              Video donations on
            </label>
            <Input value={maxSec} onChange={(e) => setMaxSec(e.target.value)} type="number" min={10} max={300} />
            <Input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0.1 per 10s" />
            <Button
              type="button"
              size="sm"
              onClick={() =>
                void act({
                  action: "settings",
                  enabled,
                  maxSec: Number(maxSec),
                  rateMoco: rate,
                })
              }
            >
              Save
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Price is MOCO per 10 seconds. Default 0.1.</p>
        </div>
      ) : null}
    </div>
  );
}
