"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useLocale } from "@/components/providers/locale-provider";
import { useCallback, useEffect, useRef, useState } from "react";
import type HlsType from "hls.js";
import { Loader2, Radio, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type PlaybackResponse = {
  ok?: boolean;
  hlsUrl?: string | null;
  waiting?: boolean;
  tryLoad?: boolean;
  srsOnAir?: boolean;
  srsPlayable?: boolean;
  message?: string;
  error?: string;
  probeError?: string;
  streamKeyHint?: string;
};

function absoluteHlsUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
  const { t } = useLocale();
    return pathOrUrl;
  }
  if (typeof window === "undefined") return pathOrUrl;
  return `${window.location.origin}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/** 트위치/치지직 방식 HLS — HTTPS 프록시, SRS 신호 대기 시 자동 재시도 */
export function LiveHlsPlayer({
  channelId }: { channelId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsType | null>(null);
  const [status, setStatus] = useState<"loading" | "waiting" | "playing" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [waitHint, setWaitHint] = useState<string | null>(null);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const retryRef = useRef(0);

  const attachHls = useCallback((url: string) => {
    const video = videoRef.current;
    if (!video) return () => undefined;

    let cancelled = false;

    const cleanup = () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      const onMeta = () => {
        if (!cancelled) setStatus("playing");
      };
      video.addEventListener("loadedmetadata", onMeta);
      video.play().catch(() => undefined);
      return () => {
        video.removeEventListener("loadedmetadata", onMeta);
        cleanup();
      };
    }

    void import("hls.js").then(({ default: Hls }) => {
      if (cancelled || !videoRef.current) return;
      if (!Hls.isSupported()) {
        setErrorMsg(t("live.hls_2"));
        setStatus("error");
        return;
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        manifestLoadingTimeOut: 15000,
        manifestLoadingMaxRetry: 20,
        levelLoadingTimeOut: 15000,
        fragLoadingTimeOut: 25000,
        xhrSetup: (xhr) => {
          xhr.withCredentials = true;
        },
      });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!cancelled) {
          setStatus("playing");
          setWaitHint(null);
          retryRef.current = 0;
        }
        video.play().catch(() => undefined);
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
          return;
        }
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          setStatus("waiting");
          setWaitHint(
            t("live.mocomo_5_20")
          );
          hls.startLoad();
          return;
        }
        setStatus("error");
        setErrorMsg(
          t("live.obs")
        );
      });
    });

    return cleanup;
  }, []);

  const refreshSignalHint = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/${channelId}/broadcast-status`, {
        credentials: "include",
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as {
        message?: string;
        onAir?: boolean;
        playable?: boolean;
        probeError?: string;
        streamKeyHint?: string;
      };
      if (typeof body.message === "string" && body.message.trim()) {
        setWaitHint(body.message);
      }
      if (body.playable) {
        setStatus("loading");
      }
      if (!body.onAir && body.streamKeyHint) {
        setWaitHint(
          t("live.mocomo_rtmp_45_32_16", { v0: body.streamKeyHint })
        );
      }
    } catch {
      /* ignore */
    }
  }, [channelId]);

  const fallbackFromObs = useCallback(async (): Promise<boolean> => {
    const obsRes = await fetch(`/api/live/${channelId}/obs`, {
      credentials: "include",
      cache: "no-store",
    });
    const obs = (await obsRes.json().catch(() => ({}))) as {
      obsStreamKey?: string;
    };
    const key = obs.obsStreamKey?.trim();
    if (!key) return false;
    const url = absoluteHlsUrl(
      `/api/live/${channelId}/hls/${encodeURIComponent(key)}.m3u8`
    );
    setHlsUrl(url);
    setStatus("waiting");
    await refreshSignalHint();
    return true;
  }, [channelId, refreshSignalHint]);

  const loadPlayback = useCallback(async () => {
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/live/${channelId}/playback`, {
        credentials: "include",
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as PlaybackResponse;
      if (!res.ok) {
        if (await fallbackFromObs()) return;
        const detail =
          typeof body.error === "string"
            ? body.error
            : res.status === 401
              ? t("live.skujaaz")
              : t("live.api_obs", { v0: res.status });
        throw new Error(detail);
      }
      if (!body.hlsUrl) {
        if (await fallbackFromObs()) return;
        setHlsUrl(null);
        setStatus("waiting");
        setWaitHint(body.message ?? t("live.obs_2"));
        return;
      }

      const url = absoluteHlsUrl(body.hlsUrl);
      setHlsUrl(url);
      setWaitHint(body.message ?? null);

      if (body.srsPlayable) {
        setStatus("loading");
      } else if (body.srsOnAir || body.tryLoad !== false) {
        setStatus("waiting");
      } else {
        setStatus("waiting");
      }
    } catch (e) {
      if (await fallbackFromObs()) return;
      setErrorMsg(e instanceof Error ? e.message : t("live.snq3mvn"));
      setStatus("error");
    }
  }, [channelId, fallbackFromObs]);

  useEffect(() => {
    void loadPlayback();
  }, [loadPlayback]);

  useEffect(() => {
    if (!hlsUrl || status === "error") return;
    return attachHls(hlsUrl);
  }, [hlsUrl, status, attachHls]);

  useEffect(() => {
    if (status !== "waiting") return;
    void refreshSignalHint();
    const retryInterval = setInterval(() => {
      retryRef.current += 1;
      void refreshSignalHint();
      void loadPlayback();
    }, 4000);
    return () => clearInterval(retryInterval);
  }, [status, loadPlayback, refreshSignalHint]);

  useEffect(() => {
    if (status !== "loading" || !hlsUrl) return;
    const waitTimer = setTimeout(() => {
      setStatus("waiting");
      setWaitHint(t("live.hls_obs"));
      void loadPlayback();
    }, 22000);
    return () => clearTimeout(waitTimer);
  }, [status, hlsUrl, loadPlayback]);

  if (status === "error") {
    return (
      <div className="aspect-video rounded-2xl bg-destructive/10 border border-destructive/30 flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-destructive text-center">{errorMsg}</p>
        <Button variant="outline" size="sm" onClick={() => void loadPlayback()}>
          <RefreshCw className="h-4 w-4 mr-1" />
          {t("toast.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden ring-1 ring-border/40">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        controls
        autoPlay
        muted
      />
      {(status === "loading" || status === "waiting") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 gap-2 bg-black/60 pointer-events-none">
          <Loader2 className="h-10 w-10 animate-spin" />
          <Radio className="h-8 w-8 text-folk-terracotta" />
          <p className="text-sm text-center px-4 max-w-sm">
            {status === "waiting"
              ? waitHint ??
                t("live.obs_5_15")
              : t("live.sm91x99")}
          </p>
        </div>
      )}
      {status === "playing" && (
        <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-folk-terracotta text-white text-[10px] font-bold">
          LIVE
        </span>
      )}
    </div>
  );
}
