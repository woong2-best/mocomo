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

const YT_ORIGIN = "https://www.youtube.com";
const CAPTION_STROKE =
  "0 2px 0 #000, 0 -2px 0 #000, 2px 0 0 #000, -2px 0 0 #000, 0 0 6px #000, 0 0 14px rgba(0,0,0,0.9)";

function buildObsYoutubeEmbed(input: {
  videoId: string;
  startSec: number;
  endSec?: number;
  origin: string;
}) {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "0",
    disablekb: "1",
    fs: "0",
    modestbranding: "1",
    rel: "0",
    playsinline: "1",
    iv_load_policy: "3",
    cc_load_policy: "0",
    enablejsapi: "1",
    origin: input.origin,
  });
  const start = Math.max(0, Math.floor(input.startSec));
  if (start > 0) params.set("start", String(start));
  if (input.endSec != null && input.endSec > start) {
    params.set("end", String(Math.floor(input.endSec)));
  }
  return `${YT_ORIGIN}/embed/${encodeURIComponent(input.videoId)}?${params.toString()}`;
}

function postYoutube(iframe: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
  const win = iframe?.contentWindow;
  if (!win) return;
  win.postMessage(JSON.stringify({ event: "command", func, args }), YT_ORIGIN);
}

function parseYtMessage(data: unknown): { event?: string; info?: unknown } | null {
  if (typeof data === "string") {
    if (!data.startsWith("{")) return null;
    try {
      return JSON.parse(data) as { event?: string; info?: unknown };
    } catch {
      return null;
    }
  }
  if (data && typeof data === "object") return data as { event?: string; info?: unknown };
  return null;
}

function ytPlayerState(info: unknown): number | null {
  if (typeof info === "number") return info;
  if (info && typeof info === "object" && "playerState" in info) {
    const value = (info as { playerState?: unknown }).playerState;
    return typeof value === "number" ? value : null;
  }
  return null;
}

/** YouTube oEmbed width/height follows the clip (16:9, 4:3, 9:16), not a fixed frame. */
async function probeVideoRatio(videoId: string): Promise<number | null> {
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;
  try {
    const watch = `https://www.youtube.com/watch?v=${videoId}`;
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watch)}&format=json`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { width?: number; height?: number };
    if (!data.width || !data.height || data.height < 1) return null;
    const ratio = data.width / data.height;
    if (ratio < 0.2 || ratio > 5) return null;
    return ratio;
  } catch {
    return null;
  }
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
  const [frameRatio, setFrameRatio] = useState(16 / 9);
  const queueRef = useRef<MocoDonationPayload[]>([]);
  const playingRef = useRef(false);
  const seenRef = useRef(new Set<string>());
  const socketRef = useRef<Socket | null>(null);
  const playTimerRef = useRef<number | null>(null);
  const endsAtRef = useRef(0);
  const remainingMsRef = useRef(0);
  const pausedRef = useRef(false);
  const volumeRef = useRef(100);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const kickRef = useRef<() => void>(() => {});
  const playerRef = useRef<{
    pauseVideo?: () => void;
    playVideo?: () => void;
    setVolume?: (volume: number) => void;
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
        pausedRef.current = true;
        player?.pauseVideo?.();
        if (playTimerRef.current) {
          remainingMsRef.current = Math.max(0, endsAtRef.current - Date.now());
          window.clearTimeout(playTimerRef.current);
          playTimerRef.current = null;
        }
      }
      if (control.action === "resume") {
        pausedRef.current = false;
        player?.playVideo?.();
        if (!playTimerRef.current && remainingMsRef.current > 0) {
          endsAtRef.current = Date.now() + remainingMsRef.current;
          playTimerRef.current = window.setTimeout(() => finishCurrent(), remainingMsRef.current);
        }
      }
      if (control.action === "volume" && typeof control.volume === "number") {
        volumeRef.current = control.volume;
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
    const videoId = current?.type === "VIDEO" ? current.videoId : null;
    if (!videoId) return;
    let cancelled = false;
    setFrameRatio(16 / 9);
    void probeVideoRatio(videoId).then((ratio) => {
      if (!cancelled && ratio) setFrameRatio(ratio);
    });
    return () => {
      cancelled = true;
    };
  }, [current]);

  useEffect(() => {
    if (!current || current.type !== "VIDEO" || !current.videoId) {
      kickRef.current = () => {};
      playerRef.current = null;
      return;
    }

    let stopped = false;
    let audible = false;
    pausedRef.current = false;

    const frame = () => iframeRef.current;

    const kick = () => {
      if (stopped || pausedRef.current || audible) return;
      const iframe = frame();
      if (!iframe?.contentWindow) return;
      iframe.contentWindow.postMessage(JSON.stringify({ event: "listening" }), YT_ORIGIN);
      postYoutube(iframe, "addEventListener", ["onReady"]);
      postYoutube(iframe, "addEventListener", ["onStateChange"]);
      postYoutube(iframe, "mute");
      postYoutube(iframe, "playVideo");
    };

    kickRef.current = kick;

    playerRef.current = {
      pauseVideo: () => postYoutube(frame(), "pauseVideo"),
      playVideo: () => {
        postYoutube(frame(), "playVideo");
      },
      setVolume: (volume: number) => {
        volumeRef.current = volume;
        postYoutube(frame(), "setVolume", [volume]);
        postYoutube(frame(), volume > 0 ? "unMute" : "mute");
      },
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame()?.contentWindow) return;
      const data = parseYtMessage(event.data);
      if (!data || stopped) return;
      const state = ytPlayerState(data.info);
      if (data.event === "onReady" || state === -1 || state === 5) kick();
      if (state === 1 && !audible && !pausedRef.current) {
        audible = true;
        const volume = volumeRef.current;
        postYoutube(frame(), "setVolume", [volume]);
        if (volume > 0) postYoutube(frame(), "unMute");
      }
    };

    window.addEventListener("message", onMessage);
    const timers = [80, 400, 900, 1600, 2800, 4500].map((ms) => window.setTimeout(kick, ms));
    kick();

    return () => {
      stopped = true;
      kickRef.current = () => {};
      playerRef.current = null;
      window.removeEventListener("message", onMessage);
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [current]);

  if (!current) return null;

  const name = current.username.startsWith("@") ? current.username.slice(1) : current.username;
  const caption = (
    <div
      style={{
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
        textShadow: CAPTION_STROKE,
      }}
    >
      <p style={{ margin: 0, fontSize: "clamp(18px, 2.6vw, 48px)", fontWeight: 800, lineHeight: 1.25 }}>
        <span style={{ color: "#5dff6a" }}>{name}</span>
        <span>{t("live.szbs")} </span>
        <span style={{ color: "#ffe44d" }}>{current.mocoLabel} MOCO</span>
        <span> {t("live.swe9sl")}</span>
      </p>
      {current.message ? (
        <p
          style={{
            margin: "8px 0 0",
            fontSize: current.type === "SFX" ? "clamp(20px, 2.4vw, 42px)" : "clamp(16px, 2vw, 36px)",
            fontWeight: current.type === "SFX" ? 700 : 600,
            lineHeight: 1.4,
            wordBreak: "break-word",
          }}
        >
          {current.message}
        </p>
      ) : null}
    </div>
  );

  if (current.type === "VIDEO" && current.videoId && typeof window !== "undefined") {
    const embedSrc = buildObsYoutubeEmbed({
      videoId: current.videoId,
      startSec: current.startSec || 0,
      endSec: current.endSec && !current.playToEnd ? current.endSec : undefined,
      origin: window.location.origin,
    });

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          background: "transparent",
          pointerEvents: "none",
        }}
      >
        <iframe
          key={current.id}
          ref={iframeRef}
          title={current.videoTitle ?? name}
          src={embedSrc}
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: `max(100vw, calc(100vh * ${frameRatio}))`,
            height: `max(100vh, calc(100vw / ${frameRatio}))`,
            transform: "translate(-50%, -50%)",
            border: "none",
            display: "block",
            background: "transparent",
          }}
          onLoad={() => kickRef.current()}
        />
        <div style={{ position: "absolute", top: 16, left: 20, right: 20, zIndex: 2 }}>{caption}</div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        padding: 20,
      }}
    >
      {caption}
    </div>
  );
}
