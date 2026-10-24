"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import type { MocoDonationPayload } from "@/lib/moco-donation/types";

function youtubeEmbed(item: MocoDonationPayload): string | null {
  if (!item.videoId || typeof window === "undefined") return null;
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "0",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    enablejsapi: "1",
    origin: window.location.origin,
  });
  const start = Math.max(0, Math.floor(item.startSec || 0));
  if (start > 0) params.set("start", String(start));
  if (item.endSec != null && item.endSec > start && !item.playToEnd) {
    params.set("end", String(Math.floor(item.endSec)));
  }
  return `https://www.youtube.com/embed/${encodeURIComponent(item.videoId)}?${params.toString()}`;
}

function donationCaption(item: MocoDonationPayload, gap: string, tail: string): string {
  const name = item.username.replace(/^@/, "");
  return `${name}${gap}${item.mocoLabel} MOCO${tail}`;
}

/**
 * Plays the same SFX and video donations a normal live overlay plays.
 * The server decides which donation is on, so every viewer shares one queue.
 */
export function MocoDonationStage({
  channelId,
  pollUrl = "/api/live/moco/donations",
  onActive,
  onLine,
}: {
  channelId: string;
  pollUrl?: string;
  onActive?: (active: boolean) => void;
  onLine?: (text: string) => void;
}) {
  const { t } = useLocale();
  const [current, setCurrent] = useState<MocoDonationPayload | null>(null);
  const seenLine = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onActiveRef = useRef(onActive);
  const onLineRef = useRef(onLine);
  onActiveRef.current = onActive;
  onLineRef.current = onLine;

  useEffect(() => {
    let alive = true;
    setCurrent(null);
    const pull = async () => {
      try {
        const res = await fetch(pollUrl, { cache: "no-store" });
        if (!res.ok || !alive) return;
        const body = (await res.json()) as { current?: MocoDonationPayload | null };
        if (!alive) return;
        const next = body.current ?? null;
        setCurrent((prev) => (prev?.id === next?.id ? prev : next));
      } catch {
        /* the room stays up if the clock misses a beat */
      }
    };
    void pull();
    const id = window.setInterval(() => void pull(), 2000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [channelId, pollUrl]);

  useEffect(() => {
    onActiveRef.current?.(current != null);
  }, [current]);

  useEffect(() => {
    if (!current || seenLine.current === current.id) return;
    seenLine.current = current.id;
    onLineRef.current?.(donationCaption(current, t("live.szbs"), t("live.swe9sl")));
  }, [current, t]);

  useEffect(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (!current || current.type !== "SFX" || !current.sfxSrc) return;
    const audio = new Audio(current.sfxSrc);
    audioRef.current = audio;
    void audio.play().catch(() => {});
    return () => {
      audio.pause();
    };
  }, [current]);

  if (!current) return null;

  const name = current.username.replace(/^@/, "");
  const embed = current.type === "VIDEO" ? youtubeEmbed(current) : null;

  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[38%] max-w-[280px]">
      {embed ? (
        <iframe
          key={current.id}
          title={current.videoTitle ?? name}
          src={embed}
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-x-2 top-2 aspect-video w-[calc(100%-1rem)] border-0"
        />
      ) : null}
      <div className="absolute inset-x-2 bottom-3 text-white drop-shadow-[0_2px_0_#000]">
        <p className="text-sm font-extrabold leading-tight sm:text-base">
          <span className="text-[#5dff6a]">{name}</span>
          <span>{t("live.szbs")} </span>
          <span className="text-[#ffe44d]">{current.mocoLabel} MOCO</span>
          <span> {t("live.swe9sl")}</span>
        </p>
        {current.message ? <p className="mt-1 text-sm font-semibold leading-snug">{current.message}</p> : null}
      </div>
    </div>
  );
}
