"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { youtubeEmbedUrl } from "@/lib/video-donation";
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

/** OBS Browser Source — MOCO 영상·SFX 도네이션 순차 재생 */
export function MocoDonationAlertWidget({
  channelId,
  token,
}: {
  channelId: string;
  token: string;
}) {
  const [current, setCurrent] = useState<MocoDonationPayload | null>(null);
  const queueRef = useRef<MocoDonationPayload[]>([]);
  const playingRef = useRef(false);
  const seenRef = useRef(new Set<string>());
  const socketRef = useRef<Socket | null>(null);
  const playTimerRef = useRef<number | null>(null);

  const notifyPlaying = useCallback(
    async (donationId: string) => {
      try {
        await fetch(`/api/overlay/${channelId}/moco-donations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, donation_id: donationId, action: "playing" }),
        });
      } catch {
        /* ignore */
      }
    },
    [channelId, token]
  );

  const notifyComplete = useCallback(
    async (donationId: string) => {
      try {
        await fetch(`/api/overlay/${channelId}/moco-donations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, donation_id: donationId, action: "complete" }),
        });
      } catch {
        /* ignore */
      }
    },
    [channelId, token]
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
      if (candidate.status === "SKIPPED" || candidate.status === "COMPLETED") continue;
      next = candidate;
      break;
    }
    if (!next) return;

    playingRef.current = true;
    setCurrent(next);
    void notifyPlaying(next.id);

    if (next.type === "VIDEO" && next.videoId) {
      const ms =
        (next.segmentPlaySec ?? next.maxPlaySec ?? 60) * 1000 + 500;
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
        if (item.status === "COMPLETED" || item.status === "SKIPPED") continue;
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
        const res = await fetch(`/api/overlay/${channelId}/moco-donations?token=${encodeURIComponent(token)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { donations?: MocoDonationPayload[] };
        if (!cancelled && data.donations?.length) enqueue(data.donations);
      } catch {
        /* ignore */
      }
    }

    void poll();
    const id = setInterval(() => void poll(), 5000);

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

    return () => {
      cancelled = true;
      clearInterval(id);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [channelId, token, enqueue, finishCurrent]);

  if (!current) return null;

  const name = current.username.startsWith("@") ? current.username.slice(1) : current.username;
  const embedEnd =
    current.endSec && !current.playToEnd ? current.endSec : undefined;

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
          <span>님 </span>
          <span style={{ color: "#ffe44d" }}>{current.mocoAmount.toLocaleString()} MOCO</span>
          <span> 후원!</span>
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
          <div style={{ marginTop: 12, aspectRatio: "16/9", borderRadius: 12, overflow: "hidden" }}>
            <iframe
              title="MOCO 영상 도네"
              src={youtubeEmbedUrl(current.videoId, {
                autoplay: true,
                startSec: current.startSec,
                endSec: embedEnd,
              })}
              style={{ width: "100%", height: "100%", border: 0 }}
              allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
