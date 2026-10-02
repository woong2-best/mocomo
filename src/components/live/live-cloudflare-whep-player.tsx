"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Play, Radio, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  attachCloudflareWhepPlayback,
  WhepNotReadyError,
} from "@/lib/cloudflare-whep-playback";

function hasLiveVideo(video: HTMLVideoElement): boolean {
  const stream = video.srcObject as MediaStream | null;
  return (
    stream?.getVideoTracks().some((t) => t.readyState === "live") === true ||
    video.readyState >= 2
  );
}

async function waitForFirstFrame(video: HTMLVideoElement, timeoutMs = 2500): Promise<boolean> {
  if (hasLiveVideo(video)) return true;
  return new Promise((resolve) => {
    const deadline = setTimeout(() => resolve(hasLiveVideo(video)), timeoutMs);
    const done = () => {
      clearTimeout(deadline);
      resolve(true);
    };
    video.addEventListener("loadeddata", done, { once: true });
    video.addEventListener("playing", done, { once: true });
    const stream = video.srcObject as MediaStream | null;
    stream?.getVideoTracks().forEach((track) => {
      track.addEventListener("unmute", () => {
        if (hasLiveVideo(video)) done();
      }, { once: true });
    });
  });
}

/** Cloudflare WHIP → WHEP 시청 (서버 프록시) */
export function LiveCloudflareWhepPlayer({
  channelId,
  embedded = false,
}: {
  channelId: string;
  whepUrl?: string | null;
  startDelayMs?: number;
  /** 분할 합방 등 부모 aspect-ratio 컨테이너 안에 채울 때 */
  embedded?: boolean;
}) {
  const { t } = useLocale();
  const videoRef = useRef<HTMLVideoElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const hasMediaRef = useRef(false);
  const connectingRef = useRef(false);
  const lastNotReadyRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "playing" | "waiting">("loading");
  const [hint, setHint] = useState(t("live.s1d6874x"));
  const [needsTap, setNeedsTap] = useState(false);

  const tryPlayVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video?.srcObject) return;
    void video.play().then(() => {
      setNeedsTap(false);
      setStatus("playing");
      setHint("");
    }).catch(() => {
      setNeedsTap(true);
      setHint(t("live.si7it1x"));
    });
  }, []);

  const connect = useCallback(async () => {
    if (connectingRef.current || hasMediaRef.current) return;
    const video = videoRef.current;
    if (!video) return;

    connectingRef.current = true;
    cleanupRef.current?.();
    cleanupRef.current = null;
    setStatus("loading");
    setHint(t("live.s1d6874x"));
    setNeedsTap(false);

    try {
      cleanupRef.current = await attachCloudflareWhepPlayback(channelId, video);
      void video.play().catch(() => undefined);

      const gotFrame = await waitForFirstFrame(video, 2500);
      hasMediaRef.current = gotFrame;
      lastNotReadyRef.current = false;
      await video.play().catch(() => undefined);
      if (video.paused && gotFrame) {
        setNeedsTap(true);
        setStatus("waiting");
        setHint(t("live.si7it1x"));
      } else if (gotFrame) {
        setStatus("playing");
        setHint("");
      } else {
        throw new Error(t("live.s1640qcp"));
      }
    } catch (e) {
      hasMediaRef.current = false;
      lastNotReadyRef.current = e instanceof WhepNotReadyError;
      setStatus("waiting");
      const raw =
        e instanceof WhepNotReadyError
          ? e.message
          : e instanceof Error
            ? e.message
            : t("live.s1ozo5l");
      setHint(
        /parse sdp|missing termination/i.test(raw)
          ? t("live.s1dejqye")
          : raw
      );
    } finally {
      connectingRef.current = false;
    }
  }, [channelId]);

  useEffect(() => {
    let retryMs = 300;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const scheduleRetry = () => {
      if (cancelled || hasMediaRef.current) return;
      const delay = lastNotReadyRef.current ? retryMs : 900;
      retryTimer = setTimeout(() => {
        void connect().finally(() => {
          if (!cancelled && !hasMediaRef.current) {
            if (lastNotReadyRef.current) {
              retryMs = Math.min(retryMs + 200, 1200);
            }
            scheduleRetry();
          }
        });
      }, delay);
    };

    void connect().finally(scheduleRetry);

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      hasMediaRef.current = false;
      cleanupRef.current?.();
    };
  }, [connect]);

  return (
    <div
      className={
        embedded
          ? "relative h-full w-full min-h-0 bg-black overflow-hidden"
          : "relative aspect-video w-full bg-black rounded-2xl overflow-hidden ring-1 ring-border/40"
      }
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        autoPlay
        controls
        muted
      />
      {status !== "playing" && !needsTap && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 gap-2 bg-black/60 px-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin" />
          <Radio className="h-8 w-8 text-orange-500" />
          <p className="text-sm max-w-md">{hint}</p>
          {status === "waiting" && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-xl pointer-events-auto mt-2"
              onClick={() => {
                hasMediaRef.current = false;
                void connect();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              {t("live.sdr4tig")}
            </Button>
          )}
        </div>
      )}
      {needsTap && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
          <p className="text-sm text-white/90 text-center px-4 max-w-md">{hint}</p>
          <Button type="button" className="rounded-xl gap-2" onClick={() => tryPlayVideo()}>
            <Play className="h-4 w-4" />
            {t("live.sz0s1")}
          </Button>
        </div>
      )}
      {status === "playing" && !needsTap && (
        <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-orange-600 text-white text-[10px] font-bold">
          LIVE
        </span>
      )}
    </div>
  );
}
