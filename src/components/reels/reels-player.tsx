"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type HlsType from "hls.js";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  REELS_AUTOPAUSE_THRESHOLD,
  REELS_AUTOPLAY_THRESHOLD,
  REELS_LOOP_MAX_SEC,
} from "@/lib/reels/constants";
import {
  hlsStartLevelForNetwork,
  reelPreloadForDistance,
  resolveReelPlaybackSrc,
} from "@/lib/reels/playback-url";
import {
  getNetworkQuality,
  getVideoPlaybackController,
  readMutedPreference,
  writeMutedPreference,
  shouldAutoplayOnNetwork,
} from "@/lib/video-playback";
import { ReelsProgressBar } from "@/components/reels/reels-progress-bar";
import { ForensicVideoCanvas } from "@/components/media/forensic-video-canvas";
import { useForensicWatermarkSession } from "@/components/media/use-forensic-watermark-session";
import { shouldProtectPaidMediaView } from "@/lib/paid-media-protection";

type Props = {
  src: string;
  hlsUrl?: string | null;
  poster?: string | null;
  mediaId: string;
  /** Distance from active slide (0 = active). */
  distance: number;
  /** Force active play when snap settles on this slide. */
  isActive: boolean;
  muted: boolean;
  onMutedChange: (muted: boolean) => void;
  onDoubleTapLike?: () => void;
  onLongPressMenu?: (clientX: number, clientY: number) => void;
  onContextMenu?: (clientX: number, clientY: number) => void;
  /** When true, short clips do not loop (advance via onEnded instead). */
  disableLoop?: boolean;
  onEnded?: () => void;
  className?: string;
  /**
   * Sale price of this media. Immersive playback is the most likely place for a
   * paid video to be screen-recorded, so it has to carry the forensic signal
   * just like the inline feed player does.
   */
  mediaPriceKrw?: number | null;
  postInstantPurchasePriceKrw?: number | null;
};

const LONG_PRESS_MS = 480;
const DOUBLE_TAP_MS = 280;

export function ReelsPlayer({
  src,
  hlsUrl,
  poster,
  mediaId,
  distance,
  isActive,
  muted,
  onMutedChange,
  onDoubleTapLike,
  onLongPressMenu,
  onContextMenu,
  disableLoop = false,
  onEnded,
  className,
  mediaPriceKrw,
  postInstantPurchasePriceKrw,
}: Props) {
  const reactId = useId();
  const playerId = `reel-${mediaId}-${reactId}`;
  const paidView = shouldProtectPaidMediaView({
    mediaPriceKrw,
    postInstantPurchasePriceKrw,
  });
  const { config: forensicConfig } = useForensicWatermarkSession(
    mediaId,
    paidView,
    "POST_MEDIA"
  );
  const [forensicCanvasReady, setForensicCanvasReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsType | null>(null);
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [inView, setInView] = useState(false);
  const lastTapRef = useRef(0);
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const attachedSrcRef = useRef<string | null>(null);
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  useEffect(() => {
    setForensicCanvasReady(false);
  }, [forensicConfig?.sessionId, mediaId]);

  const forensicActive = Boolean(forensicConfig);
  const hideRawVideo = forensicActive && forensicCanvasReady;

  const { src: playbackSrc, mode } = resolveReelPlaybackSrc({ url: src, hlsUrl });
  const shouldMountMedia = distance <= 3;

  const destroyHls = useCallback(() => {
    hlsRef.current?.destroy();
    hlsRef.current = null;
  }, []);

  const attachSource = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !shouldMountMedia) return;
    if (attachedSrcRef.current === playbackSrc) return;

    destroyHls();
    attachedSrcRef.current = playbackSrc;

    if (mode === "hls") {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = playbackSrc;
        return;
      }
      const { default: Hls } = await import("hls.js");
      if (!videoRef.current || attachedSrcRef.current !== playbackSrc) return;
      if (!Hls.isSupported()) {
        video.src = playbackSrc;
        return;
      }
      const quality = getNetworkQuality();
      const hls = new Hls({
        enableWorker: true,
        startLevel: hlsStartLevelForNetwork(quality),
        abrEwmaDefaultEstimate: quality === "slow" ? 500_000 : 2_000_000,
        maxBufferLength: quality === "slow" ? 10 : 30,
        maxMaxBufferLength: quality === "slow" ? 20 : 60,
        backBufferLength: 12,
      });
      hlsRef.current = hls;
      hls.loadSource(playbackSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
      });
      return;
    }

    video.src = playbackSrc;
  }, [destroyHls, mode, playbackSrc, shouldMountMedia]);

  const detachSource = useCallback(() => {
    const video = videoRef.current;
    destroyHls();
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
    attachedSrcRef.current = null;
  }, [destroyHls]);

  useEffect(() => {
    if (!shouldMountMedia) {
      detachSource();
      return;
    }
    void attachSource();
  }, [attachSource, detachSource, shouldMountMedia]);

  useEffect(() => () => detachSource(), [detachSource]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
  }, [muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !disableLoop) return;
    video.loop = false;
  }, [disableLoop, playbackSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldMountMedia) return;
    video.preload = reelPreloadForDistance(distance);
  }, [distance, shouldMountMedia]);

  const tryPlay = useCallback(async () => {
    const video = videoRef.current;
    const ctrl = getVideoPlaybackController();
    if (!video || !ctrl) return;
    if (!shouldAutoplayOnNetwork(getNetworkQuality())) return;
    await ctrl.requestPlay(playerId, "autoplay");
  }, [playerId]);

  const pauseSelf = useCallback(() => {
    getVideoPlaybackController()?.pause(playerId);
  }, [playerId]);

  useEffect(() => {
    const ctrl = getVideoPlaybackController();
    if (!ctrl) return;
    ctrl.register({
      id: playerId,
      getVideo: () => videoRef.current,
      autoplayIntent: true,
    });
    return () => ctrl.unregister(playerId);
  }, [playerId]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const ratio = entry.intersectionRatio;
        if (ratio >= REELS_AUTOPLAY_THRESHOLD) {
          setInView(true);
        } else if (ratio <= REELS_AUTOPAUSE_THRESHOLD) {
          setInView(false);
          // Active snap slide: ignore transient IO dips from rotate / dvh reflow.
          if (!isActiveRef.current) pauseSelf();
        }
      },
      { threshold: [0, REELS_AUTOPAUSE_THRESHOLD, REELS_AUTOPLAY_THRESHOLD, 0.9, 1] }
    );
    io.observe(root);
    return () => io.disconnect();
  }, [pauseSelf]);

  useEffect(() => {
    // Settled active slide always owns playback — do not require inView
    // (orientation change briefly collapses intersection ratios).
    if (isActive && distance === 0) {
      void tryPlay();
      return;
    }
    if (distance > 0 || !inView) {
      pauseSelf();
    } else if (inView && distance === 0) {
      void tryPlay();
    }
  }, [distance, inView, isActive, pauseSelf, tryPlay]);

  // After rotate layout settles, resume the active reel.
  useEffect(() => {
    if (!isActive || distance !== 0) return;
    let timer: number | null = null;
    const resume = () => {
      if (timer != null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void tryPlay();
      }, 180);
    };
    window.addEventListener("orientationchange", resume);
    const orient = window.screen?.orientation;
    orient?.addEventListener?.("change", resume);
    return () => {
      if (timer != null) window.clearTimeout(timer);
      window.removeEventListener("orientationchange", resume);
      orient?.removeEventListener?.("change", resume);
    };
  }, [distance, isActive, tryPlay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => {
      const d = video.duration;
      if (Number.isFinite(d) && d > 0) setProgress(video.currentTime / d);
      try {
        if (video.buffered.length > 0 && Number.isFinite(d) && d > 0) {
          setBuffered(video.buffered.end(video.buffered.length - 1) / d);
        }
      } catch {
        /* ignore */
      }
    };
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onMeta = () => {
      const d = video.duration;
      if (disableLoop) {
        video.loop = false;
        return;
      }
      if (Number.isFinite(d) && d > 0 && d <= REELS_LOOP_MAX_SEC) {
        video.loop = true;
      }
    };
    const onVideoEnded = () => {
      if (disableLoop) onEnded?.();
    };

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("progress", onTime);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("ended", onVideoEnded);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("progress", onTime);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("ended", onVideoEnded);
    };
  }, [playbackSrc, disableLoop, onEnded]);

  const onSeek = useCallback((ratio: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    video.currentTime = ratio * video.duration;
    setProgress(ratio);
  }, []);

  const clearLongPress = () => {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    longPressFired.current = false;
    clearLongPress();
    const { clientX, clientY } = e;
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      onLongPressMenu?.(clientX, clientY);
    }, LONG_PRESS_MS);
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    clearLongPress();
    if (longPressFired.current) return;
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      onDoubleTapLike?.();
      return;
    }
    lastTapRef.current = now;
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void tryPlay();
    else pauseSelf();
  };

  const onPointerCancel = () => clearLongPress();

  return (
    <div
      ref={containerRef}
      className={cn("relative h-full w-full bg-black", className)}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={clearLongPress}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(e.clientX, e.clientY);
      }}
    >
      {shouldMountMedia ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-contain bg-black"
          playsInline
          muted={muted}
          poster={poster ?? undefined}
          controls={false}
          disablePictureInPicture
          // decode / render only when near
          style={{
            contentVisibility: distance > 1 ? "auto" : "visible",
            opacity: hideRawVideo ? 0 : undefined,
          }}
          aria-label="Short video"
        />
      ) : null}

      {shouldMountMedia ? (
        <ForensicVideoCanvas
          videoRef={videoRef}
          active={forensicActive}
          config={forensicConfig}
          objectFit="contain"
          mediaId={mediaId}
          onMarked={() => setForensicCanvasReady(true)}
          className="absolute inset-0 h-full w-full object-contain z-[1] pointer-events-none"
        />
      ) : null}

      {!shouldMountMedia &&
        (poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt=""
            className="absolute inset-0 h-full w-full object-contain bg-black"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 bg-black" />
        ))}

      {buffering && isActive && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/80" aria-hidden />
        </div>
      )}

      {isActive && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <ReelsProgressBar
            progress={progress}
            buffered={buffered}
            onSeek={onSeek}
            label="Playback position"
          />
        </div>
      )}

      <button
        type="button"
        className="sr-only"
        onClick={() => {
          const next = !muted;
          writeMutedPreference(next);
          onMutedChange(next);
        }}
      >
        {muted ? "Unmute" : "Mute"}
      </button>
    </div>
  );
}

/** Sync initial mute from preference (client-only). */
export function useReelsMutedState() {
  const [muted, setMuted] = useState(true);
  useEffect(() => {
    setMuted(readMutedPreference(true));
  }, []);
  const setAndPersist = useCallback((next: boolean) => {
    writeMutedPreference(next);
    setMuted(next);
  }, []);
  return [muted, setAndPersist] as const;
}
