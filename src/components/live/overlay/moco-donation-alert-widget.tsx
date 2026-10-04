"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useLocale } from "@/components/providers/locale-provider";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { MocoDonationPayload } from "@/lib/moco-donation/types";

function playSfx(src: string | null, onDone: () => void) {
  if (!src || typeof window === "undefined") {
    window.setTimeout(onDone, 1200);
    return;
  }
  const audio = new Audio(src);
  audio.onended = () => onDone();
  audio.onerror = () => onDone();
  void audio.play().catch(() => onDone());
}

/** OBS Browser Source — MOCO Video·SFX 도네이션 순차 재생 */
export function MocoDonationAlertWidget({
  channelId,
  token,
  apiBase,
}: {
  channelId: string;
  token: string;
  apiBase?: string;
}) {
  const { t } = useLocale();
  const [current, setCurrent] = useState<MocoDonationPayload | null>(null);
  const queueRef = useRef<MocoDonationPayload[]>([]);
  const playingRef = useRef(false);
  const seenRef = useRef(new Set<string>());
  const socketRef = useRef<Socket | null>(null);
  const playTimerRef = useRef<number | null>(null);
  const endsAtRef = useRef(0);
  const remainingMsRef = useRef(0);
  const playerRef = useRef<{
    pauseVideo?: () => void;
    playVideo?: () => void;
    setVolume?: (volume: number) => void;
    destroy?: () => void;
  } | null>(null);

  const notifyPlaying = useCallback(
    async (donationId: string) => {
      try {
        await fetch(apiBase ?? `/api/overlay/${channelId}/moco-donations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, donation_id: donationId, action: "playing" }),
        });
      } catch {
        /* ignore */
      }
    },
    [apiBase, channelId, token]
  );

  const notifyComplete = useCallback(
    async (donationId: string) => {
      try {
        await fetch(apiBase ?? `/api/overlay/${channelId}/moco-donations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, donation_id: donationId, action: "complete" }),
        });
      } catch {
        /* ignore */
      }
    },
    [apiBase, channelId, token]
  );

  const currentRef = useRef<MocoDonationPayload | null>(null);
  currentRef.current = current;

  const drainNextRef = useRef<() => void>(() => {});

  const finishCurrent = useCallback(() => {
    const item = currentRef.current;
    if (playTimerRef.current) {
      window.clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }
    if (item) void notifyComplete(item.id);
    setCurrent(null);
    playingRef.current = false;
    window.setTimeout(() => drainNextRef.current(), 0);
  }, [notifyComplete]);

  const processQueue = useCallback(() => {
    if (playingRef.current || queueRef.current.length === 0) return;
    let next: MocoDonationPayload | undefined;
    while (queueRef.current.length > 0) {
      const candidate = queueRef.current.shift()!;
      if (candidate.status === "SKIPPED" || candidate.status === "COMPLETED" || candidate.status === "CANCELLED") continue;
      next = candidate;
      break;
    }
    if (!next) return;

    playingRef.current = true;
    setCurrent(next);
    void notifyPlaying(next.id);

    if (next.type === "VIDEO" && next.videoId) {
      const ms = (next.segmentPlaySec ?? next.maxPlaySec ?? 60) * 1000 + 500;
      remainingMsRef.current = ms;
      endsAtRef.current = Date.now() + ms;
      playTimerRef.current = window.setTimeout(() => finishCurrent(), ms);
      return;
    }

    if (next.type === "SFX") {
      playSfx(next.sfxSrc, () => {
        window.setTimeout(() => finishCurrent(), 400);
      });
      return;
    }

    finishCurrent();
  }, [finishCurrent, notifyPlaying]);

  drainNextRef.current = processQueue;

  const enqueue = useCallback(
    (items: MocoDonationPayload[]) => {
      for (const item of items) {
        if (seenRef.current.has(item.id)) continue;
        if (item.status === "COMPLETED" || item.status === "SKIPPED" || item.status === "CANCELLED") continue;
        seenRef.current.add(item.id);
        queueRef.current.push(item);
      }
      processQueue();
    },
    [processQueue]
  );

  useEffect(() => {
    if (!playingRef.current && !current && queueRef.current.length > 0) {
      processQueue();
    }
  }, [current, processQueue]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const base = apiBase ?? `/api/overlay/${channelId}/moco-donations`;
        const res = await fetch(`${base}?token=${encodeURIComponent(token)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { donations?: MocoDonationPayload[] };
        if (!cancelled && data.donations?.length) enqueue(data.donations);
      } catch {
        /* ignore */
      }
    }

    void poll();
    const id = setInterval(() => void poll(), 5000);

    if (!channelId) return () => {
      cancelled = true;
      clearInterval(id);
    };

    const socket = io({ path: "/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.emit("join_overlay", { channelId, token });
    socket.on("new_donation", (data: MocoDonationPayload) => {
      enqueue([data]);
    });
    socket.on("donation_skipped", (data: MocoDonationPayload) => {
      if (currentRef.current?.id === data.id) finishCurrent();
    });
    socket.on("donation_completed", (data: MocoDonationPayload) => {
      if (currentRef.current?.id === data.id) finishCurrent();
    });
    socket.on("donation_cancelled", (data: MocoDonationPayload) => {
      queueRef.current = queueRef.current.filter((item) => item.id !== data.id);
      seenRef.current.delete(data.id);
    });
    socket.on("donation_player_control", (control: { action?: string; volume?: number }) => {
      const player = playerRef.current;
      if (control.action === "pause") {
        player?.pauseVideo?.();
        if (playTimerRef.current) {
          remainingMsRef.current = Math.max(0, endsAtRef.current - Date.now());
          window.clearTimeout(playTimerRef.current);
          playTimerRef.current = null;
        }
      }
      if (control.action === "resume") {
        player?.playVideo?.();
        if (!playTimerRef.current && remainingMsRef.current > 0) {
          endsAtRef.current = Date.now() + remainingMsRef.current;
          playTimerRef.current = window.setTimeout(() => finishCurrent(), remainingMsRef.current);
        }
      }
      if (control.action === "volume" && typeof control.volume === "number") {
        player?.setVolume?.(control.volume);
      }
    });

    return () => {
      cancelled = true;
      clearInterval(id);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [apiBase, channelId, token, enqueue, finishCurrent]);

  useEffect(() => {
    if (!current || current.type !== "VIDEO" || !current.videoId) return;
    const videoId = current.videoId;
    const start = current.startSec || 0;
    const end = current.endSec && !current.playToEnd ? current.endSec : undefined;
    let cancelled = false;

    const mount = () => {
      const YT = (window as unknown as { YT?: { Player: new (el: HTMLElement, opts: object) => typeof playerRef.current } }).YT;
      const slot = document.getElementById("moco-yt-slot");
      if (cancelled || !YT?.Player || !slot) return;
      playerRef.current?.destroy?.();
      slot.replaceChildren();
      const holder = document.createElement("div");
      holder.style.width = "100%";
      holder.style.height = "100%";
      slot.appendChild(holder);
      playerRef.current = new YT.Player(holder, {
        videoId,
        playerVars: { autoplay: 1, start, end, rel: 0, playsinline: 1 },
      });
    };

    const w = window as unknown as { YT?: { Player?: unknown }; onYouTubeIframeAPIReady?: () => void };
    if (w.YT?.Player) mount();
    else {
      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        prev?.();
        mount();
      };
      if (!document.querySelector("script[data-moco-yt-api='1']")) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.dataset.mocoYtApi = "1";
        document.body.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [current]);

  if (!current) return null;

  const name = current.username.startsWith("@") ? current.username.slice(1) : current.username;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "rgba(8, 10, 18, 0.92)",
          border: "2px solid rgba(93, 255, 106, 0.55)",
          borderRadius: 16,
          padding: 16,
          maxWidth: "min(720px, 92vw)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.65)",
          color: "#fff",
        }}
      >
        <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
          <span style={{ color: "#5dff6a" }}>{name}</span>
          <span>{t("live.szbs")} </span>
          <span style={{ color: "#ffe44d" }}>{current.mocoLabel} MOCO</span>
          <span> {t("live.swe9sl")}</span>
        </p>

        {current.message ? (
          <p
            style={{
              marginTop: current.type === "SFX" ? 14 : 12,
              fontSize: current.type === "SFX" ? 22 : 16,
              fontWeight: current.type === "SFX" ? 700 : 400,
              lineHeight: 1.45,
              opacity: 0.98,
              wordBreak: "break-word",
            }}
          >
            {current.message}
          </p>
        ) : null}

        {current.type === "VIDEO" && current.videoId ? (
          <div style={{ marginTop: 12, aspectRatio: "16/9", borderRadius: 12, overflow: "hidden", pointerEvents: "auto" }}>
            <div id="moco-yt-slot" style={{ width: "100%", height: "100%" }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
