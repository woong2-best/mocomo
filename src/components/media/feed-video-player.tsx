"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Play,
  Pause,
  Volume1,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Loader2,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ForensicVideoCanvas } from "@/components/media/forensic-video-canvas";
import { PaidVideoCopyrightWarning } from "@/components/media/paid-video-copyright-warning";
import type { ForensicRenderConfig } from "@/lib/watermark/types";
import {
  AUTOPLAY_THRESHOLD,
  AUTOPAUSE_THRESHOLD,
  SHORT_VIDEO_LOOP_MAX_SEC,
  HOVER_PREVIEW_DELAY_MS,
  SEEK_STEP_SEC,
  VOLUME_STEP,
  LONG_PRESS_RATE,
  LONG_PRESS_MS,
  DOUBLE_TAP_MS,
  UNLOAD_AFTER_MS,
  RETRY_DELAYS_MS,
  MAX_RETRIES,
  DEFAULT_VOLUME,
  readMutedPreference,
  writeMutedPreference,
  readVolumePreference,
  writeVolumePreference,
  progressKey,
  getSavedProgress,
  saveProgress,
  getNetworkQuality,
  suggestedPreload,
  shouldAutoplayOnNetwork,
  getVideoPlaybackController,
  isVideoFullscreen,
  toggleVideoFullscreen,
  bindVideoFullscreenEvents,
  withVideoCacheBust,
} from "@/lib/video-playback";

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

type Props = {
  src: string;
  className?: string;
  muted?: boolean;
  playsInline?: boolean;
  preload?: "none" | "metadata" | "auto";
  controls?: boolean;
  protect?: boolean;
  /** Stable id for progress memory (media row id). */
  mediaId?: string | null;
  /** Disable viewport autoplay (e.g. compose preview). */
  autoPlayOnView?: boolean;
  /** Double-tap / heart overlay like. */
  onDoubleTapLike?: () => void;
  /**
   * Single tap opens immersive viewer (feed). When set, play/pause is not
   * toggled on single tap — parent owns navigation into fullscreen.
   */
  onOpenImmersive?: () => void;
  /** Poster / thumbnail for lazy paint. */
  poster?: string;
  /** Invisible forensic watermark render config (paid video only). */
  forensicRenderConfig?: ForensicRenderConfig | null;
  /** Session endpoint failed (e.g. author) — show unmarked playback. */
  forensicSessionFailed?: boolean;
  /** Locked teaser: loop only the first N seconds, no copyright warning. */
  previewMaxSeconds?: number | null;
  /** Fired once when a teaser preview reaches previewMaxSeconds. */
  onPreviewEnded?: () => void;
  /** Post detail / lightbox — keep src attached (avoid cache reload failures). */
  keepMediaLoaded?: boolean;
};

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function readVideoDuration(video: HTMLVideoElement): number {
  const d = video.duration;
  if (Number.isFinite(d) && d > 0) return d;
  try {
    if (video.seekable.length > 0) {
      const end = video.seekable.end(video.seekable.length - 1);
      if (Number.isFinite(end) && end > 0) return end;
    }
  } catch {
    /* seekable not ready */
  }
  return 0;
}

function stopFeedNavigation(e: React.SyntheticEvent) {
  e.stopPropagation();
}

/** Inline seek/volume/fullscreen bar — taps here must not open the feed video viewer. */
export function isFeedVideoControlTarget(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest("[data-video-controls]");
}

/** Seek bar top edge and below — used when the hit target is the <video> under the overlay. */
export function isFeedVideoControlZone(
  clientY: number,
  root: Element | null
): boolean {
  if (!root || !Number.isFinite(clientY)) return false;
  const seek =
    root.querySelector("[data-video-seek-bar]") ??
    root.querySelector("[data-video-controls]");
  if (!seek) return false;
  return clientY >= seek.getBoundingClientRect().top;
}

export function shouldBlockFeedVideoImmersive(event: {
  target: EventTarget | null;
  nativeEvent: Event;
}): boolean {
  if (isFeedVideoControlTarget(event.target)) return true;
  const root =
    event.target instanceof Element
      ? event.target.closest("[data-feed-video-id]")
      : null;
  const native = event.nativeEvent;
  const clientY =
    "clientY" in native && typeof native.clientY === "number"
      ? native.clientY
      : null;
  if (clientY == null) return false;
  return isFeedVideoControlZone(clientY, root);
}

function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

function isEditableKeyTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

export function FeedVideoPlayer({
  src,
  className,
  muted: mutedProp = true,
  playsInline = true,
  preload: preloadProp,
  protect = false,
  mediaId,
  autoPlayOnView = true,
  onDoubleTapLike,
  onOpenImmersive,
  poster,
  forensicRenderConfig,
  forensicSessionFailed = false,
  previewMaxSeconds = null,
  onPreviewEnded,
  keepMediaLoaded = false,
}: Props) {
  const reactId = useId();
  const playerId = `fv-${mediaId ?? reactId}`;
  const pKey = progressKey(src, mediaId);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const volumeTrackRef = useRef<HTMLDivElement>(null);
  const scrubbingRef = useRef(false);
  const volumeDraggingRef = useRef(false);
  const resumeAfterScrubRef = useRef(false);
  const pendingSeekPctRef = useRef<number | null>(null);
  const volumeBeforeMuteRef = useRef(DEFAULT_VOLUME);
  const userPausedRef = useRef(false);
  const holdBoostRef = useRef(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef(0);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inViewRef = useRef(false);
  const nearViewRef = useRef(false);
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const registeredRef = useRef({ autoplayIntent: false });
  const restoredRef = useRef(false);
  const lastUiTickRef = useRef(0);
  const lastProgressSaveRef = useRef(0);
  const bufferingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoPlayingRef = useRef(false);
  const copyrightDismissedRef = useRef(!protect);
  const previewEndedRef = useRef(false);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isVolumeDragging, setIsVolumeDragging] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(() =>
    typeof window === "undefined" ? mutedProp : readMutedPreference(mutedProp)
  );
  const [volume, setVolume] = useState(() =>
    typeof window === "undefined" ? DEFAULT_VOLUME : readVolumePreference()
  );
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrubPct, setScrubPct] = useState<number | null>(null);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [likeBurst, setLikeBurst] = useState(false);
  const [copyrightDismissed, setCopyrightDismissed] = useState(!protect);
  const [protectSeen, setProtectSeen] = useState(protect);
  if (protect !== protectSeen) {
    setProtectSeen(protect);
    setCopyrightDismissed(!protect);
    copyrightDismissedRef.current = !protect;
  }
  const [forensicCanvasReady, setForensicCanvasReady] = useState(false);
  const [forensicCanvasFailed, setForensicCanvasFailed] = useState(false);
  const [holdBoost, setHoldBoost] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [mediaAttached, setMediaAttached] = useState(true);
  const [preload, setPreload] = useState<"none" | "metadata" | "auto">(
    preloadProp ?? "metadata"
  );
  const [loop, setLoop] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [attachToken, setAttachToken] = useState(0);
  const wasDetachedRef = useRef(false);

  const playbackSrc = withVideoCacheBust(src, retryToken + attachToken);

  const classStr = className ?? "";
  const wantsContain = /\bobject-contain\b/.test(classStr);
  const fillMode = /\bh-full\b/.test(classStr);
  const fillFitClass = wantsContain ? "object-contain" : "object-cover";

  const syncDuration = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const d = readVideoDuration(v);
    if (d <= 0) return;
    setDuration(d);
    setLoop(d > 0 && d <= SHORT_VIDEO_LOOP_MAX_SEC);
    if (pendingSeekPctRef.current !== null) {
      const pct = pendingSeekPctRef.current;
      pendingSeekPctRef.current = null;
      const time = (pct / 100) * d;
      v.currentTime = time;
      setCurrent(time);
      setScrubPct(pct);
    }
  }, []);

  const previewMode =
    previewMaxSeconds != null && previewMaxSeconds > 0;

  const restoreProgress = useCallback(() => {
    const v = videoRef.current;
    if (!v || previewMode) return;
    const saved = getSavedProgress(pKey);
    if (saved > 0.25 && Number.isFinite(v.duration) && saved < v.duration - 0.5) {
      try {
        v.currentTime = saved;
        setCurrent(saved);
      } catch {
        /* ignore */
      }
    }
  }, [pKey, previewMode]);

  const applyVolume = useCallback((next: number, persist = true) => {
    const v = videoRef.current;
    const clamped = Math.min(1, Math.max(0, next));
    setVolume(clamped);
    if (clamped > 0) volumeBeforeMuteRef.current = clamped;
    if (persist) writeVolumePreference(clamped);
    if (!v) return;
    v.volume = clamped;
    if (clamped <= 0) {
      v.muted = true;
      setIsMuted(true);
      if (persist) writeMutedPreference(true);
    } else {
      v.muted = false;
      setIsMuted(false);
      if (persist) writeMutedPreference(false);
    }
  }, []);

  const isPlayerFullscreen = useCallback(() => {
    return isVideoFullscreen(containerRef.current, videoRef.current);
  }, []);

  const focusPlayer = useCallback(() => {
    containerRef.current?.focus({ preventScroll: true });
  }, []);

  const ensureMediaSrc = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return false;
    if (v.getAttribute("src") === playbackSrc && v.src) return true;

    restoredRef.current = false;
    setMediaAttached(true);
    v.src = playbackSrc;
    v.load();

    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        v.removeEventListener("loadeddata", finish);
        v.removeEventListener("canplay", finish);
        v.removeEventListener("error", finish);
        resolve();
      };
      v.addEventListener("loadeddata", finish);
      v.addEventListener("canplay", finish);
      v.addEventListener("error", finish);
      window.setTimeout(finish, 2000);
    });
    return Boolean(v.getAttribute("src"));
  }, [playbackSrc]);

  const playExclusive = useCallback(
    async (reason: "autoplay" | "user" | "hover" | "visibility") => {
      const ctrl = getVideoPlaybackController();
      const v = videoRef.current;
      if (!v || !ctrl) return false;

      // Scrub pauses intentionally — don't let IO/hover autoplay fight mid-drag.
      if (scrubbingRef.current && reason !== "user") return false;

      // Fullscreen IO can falsely unload src; restore before user/autoplay play.
      if (!v.getAttribute("src") || v.getAttribute("src") !== playbackSrc) {
        const okAttach = await ensureMediaSrc();
        if (!okAttach) return false;
      }

      // Already playing this element — skip re-entry (prevents stutter).
      if (!v.paused && !v.ended && ctrl.getActiveId() === playerId) {
        autoPlayingRef.current = reason === "autoplay" || reason === "visibility";
        return true;
      }

      // Autoplay / hover must stay muted (browser policy + product rule).
      if (reason === "autoplay" || reason === "hover" || reason === "visibility") {
        if (!v.muted) v.muted = true;
        setIsMuted((m) => (m ? m : true));
      }
      const ok = await ctrl.requestPlay(playerId, reason);
      if (ok) {
        setStarted(true);
        autoPlayingRef.current = reason === "autoplay" || reason === "visibility";
      }
      return ok;
    },
    [ensureMediaSrc, playerId, previewMode, protect, playbackSrc]
  );

  const resetCopyrightWarning = useCallback(() => {
    if (!protect) return;
    copyrightDismissedRef.current = false;
    setCopyrightDismissed(false);
  }, [protect]);

  const dismissCopyrightWarning = useCallback(() => {
    if (!protect || copyrightDismissedRef.current) return;
    copyrightDismissedRef.current = true;
    setCopyrightDismissed(true);
  }, [protect]);

  const pauseSelf = useCallback(
    (clearResume = false) => {
      getVideoPlaybackController()?.pause(playerId, clearResume);
    },
    [playerId]
  );

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      userPausedRef.current = false;
      void playExclusive("user");
    } else {
      userPausedRef.current = true;
      pauseSelf(true);
    }
  }, [playExclusive, pauseSelf]);

  // Register with global controller
  useEffect(() => {
    const ctrl = getVideoPlaybackController();
    if (!ctrl) return;
    const handle = {
      id: playerId,
      getVideo: () => videoRef.current,
      autoplayIntent: false,
      onDeactivate: () => {
        registeredRef.current.autoplayIntent = false;
      },
    };
    Object.defineProperty(handle, "autoplayIntent", {
      get: () => registeredRef.current.autoplayIntent,
      set: (v: boolean) => {
        registeredRef.current.autoplayIntent = v;
      },
    });
    ctrl.register(handle);
    return () => {
      ctrl.unregister(playerId);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (unloadTimerRef.current) clearTimeout(unloadTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      const v = videoRef.current;
      if (v) {
        saveProgress(pKey, v.currentTime);
        v.pause();
        v.removeAttribute("src");
        v.load();
      }
    };
  }, [playerId, pKey]);

  // Attach / detach media for memory; restore progress once on attach
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !mediaAttached) return;
    const needsAttach = v.getAttribute("src") !== playbackSrc;
    if (needsAttach) {
      restoredRef.current = false;
      v.src = playbackSrc;
      v.load();
    }
    // Only kick autoplay after a fresh attach — not on every effect re-run.
    if (
      needsAttach &&
      inViewRef.current &&
      !userPausedRef.current &&
      autoPlayOnView &&
      !document.hidden
    ) {
      const t = window.setTimeout(() => {
        void playExclusive("autoplay");
      }, 80);
      return () => clearTimeout(t);
    }
  }, [playbackSrc, mediaAttached, retryToken, autoPlayOnView, playExclusive]);

  useEffect(() => {
    setForensicCanvasReady(false);
    setForensicCanvasFailed(false);
    previewEndedRef.current = false;
    retryCountRef.current = 0;
    setRetryToken(0);
    setAttachToken(0);
    wasDetachedRef.current = false;
  }, [src, mediaId, forensicRenderConfig?.sessionId, previewMaxSeconds]);

  useEffect(() => {
    if (!protect) {
      copyrightDismissedRef.current = true;
      setCopyrightDismissed(true);
      return;
    }
    resetCopyrightWarning();
  }, [mediaId, protect, resetCopyrightWarning, src]);

  const showCopyrightWarning =
    protect && !previewMode && !copyrightDismissed && started;

  // Core media events
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const clearBufferingSoon = () => {
      if (bufferingTimerRef.current) {
        clearTimeout(bufferingTimerRef.current);
        bufferingTimerRef.current = null;
      }
      setBuffering(false);
    };

    const onPlay = () => {
      setPlaying(true);
      setStarted(true);
      clearBufferingSoon();
    };
    const onPause = () => setPlaying(false);
    const onTime = () => {
      if (scrubbingRef.current) return;
      const now = performance.now();
      // Throttle React progress UI to ~4fps — avoids re-render stutter.
      if (now - lastUiTickRef.current >= 250) {
        lastUiTickRef.current = now;
        setCurrent(v.currentTime);
      }
      if (
        !previewMode &&
        v.currentTime > 0.5 &&
        now - lastProgressSaveRef.current >= 1000
      ) {
        lastProgressSaveRef.current = now;
        saveProgress(pKey, v.currentTime);
      }
      if (previewMode && previewMaxSeconds && v.currentTime >= previewMaxSeconds) {
        try {
          v.pause();
          v.currentTime = previewMaxSeconds;
        } catch {
          /* ignore */
        }
        setCurrent(previewMaxSeconds);
        setPlaying(false);
        if (!previewEndedRef.current) {
          previewEndedRef.current = true;
          onPreviewEnded?.();
        }
      }
    };
    const onMeta = () => {
      syncDuration();
      // Restore seek position ONCE after metadata — never on every progress tick.
      if (!restoredRef.current) {
        restoredRef.current = true;
        restoreProgress();
      }
    };
    const onEnded = () => {
      setPlaying(false);
      setScrubPct(null);
      scrubbingRef.current = false;
      if (!loop) {
        saveProgress(pKey, v.currentTime);
        if (protect) resetCopyrightWarning();
      }
    };
    const onVolume = () => {
      setIsMuted(v.muted);
      if (!volumeDraggingRef.current) setVolume(v.volume);
    };
    const onWaiting = () => {
      if (bufferingTimerRef.current) clearTimeout(bufferingTimerRef.current);
      // Ignore brief stalls (<180ms) so spinner doesn't flicker.
      bufferingTimerRef.current = setTimeout(() => setBuffering(true), 180);
    };
    const onPlaying = () => clearBufferingSoon();
    const onCanPlay = () => {
      clearBufferingSoon();
      syncDuration();
    };
    const onError = () => {
      if (retryCountRef.current >= MAX_RETRIES) return;
      const delay = RETRY_DELAYS_MS[Math.min(retryCountRef.current, RETRY_DELAYS_MS.length - 1)];
      retryCountRef.current += 1;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        restoredRef.current = false;
        setRetryToken((t) => t + 1);
        setMediaAttached(true);
      }, delay);
    };

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("loadeddata", onMeta);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("durationchange", syncDuration);
    v.addEventListener("ended", onEnded);
    v.addEventListener("volumechange", onVolume);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("error", onError);
    syncDuration();

    // Init volume from prefs without unmuting autoplay.
    v.volume = volume > 0 ? volume : volumeBeforeMuteRef.current || DEFAULT_VOLUME;
    volumeBeforeMuteRef.current = v.volume;
    v.muted = isMuted;

    return () => {
      if (bufferingTimerRef.current) clearTimeout(bufferingTimerRef.current);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("loadeddata", onMeta);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("durationchange", syncDuration);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("volumechange", onVolume);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("error", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once per src attach
  }, [src, mediaAttached, retryToken, syncDuration, restoreProgress, pKey, loop, protect, previewMode, previewMaxSeconds, resetCopyrightWarning, onPreviewEnded]);

  // IntersectionObserver: autoplay / pause / unload / preload
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !autoPlayOnView) return;

    const quality = getNetworkQuality();
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        // Chromium often reports intersectionRatio=0 while an element is fullscreen
        // (top layer). Treat fullscreen as fully in-view so we never pause/unload.
        if (isPlayerFullscreen()) {
          if (unloadTimerRef.current) {
            clearTimeout(unloadTimerRef.current);
            unloadTimerRef.current = null;
          }
          nearViewRef.current = true;
          inViewRef.current = true;
          setMediaAttached((prev) => (prev ? prev : true));
          return;
        }

        const ratio = entry.intersectionRatio;
        const near = ratio > 0.05 || entry.isIntersecting;
        nearViewRef.current = near;

        const nextPreload =
          preloadProp ?? suggestedPreload(quality, near || ratio >= AUTOPLAY_THRESHOLD);
        setPreload((prev) => (prev === nextPreload ? prev : nextPreload));

        if (near) {
          if (unloadTimerRef.current) {
            clearTimeout(unloadTimerRef.current);
            unloadTimerRef.current = null;
          }
          if (wasDetachedRef.current) {
            wasDetachedRef.current = false;
            setAttachToken((t) => t + 1);
          }
          setMediaAttached((prev) => (prev ? prev : true));
        } else if (!near) {
          if (keepMediaLoaded) return;
          if (!unloadTimerRef.current) {
            unloadTimerRef.current = setTimeout(() => {
              if (isPlayerFullscreen()) return;
              const v = videoRef.current;
              if (v) {
                saveProgress(pKey, v.currentTime);
                v.pause();
                v.removeAttribute("src");
                v.load();
              }
              wasDetachedRef.current = true;
              restoredRef.current = false;
              autoPlayingRef.current = false;
              setMediaAttached(false);
              setPlaying(false);
              resetCopyrightWarning();
            }, UNLOAD_AFTER_MS);
          }
        }

        const shouldPlay =
          ratio >= AUTOPLAY_THRESHOLD &&
          shouldAutoplayOnNetwork(quality) &&
          !userPausedRef.current &&
          !scrubbingRef.current &&
          !document.hidden;

        // Hysteresis: only pause after dropping below AUTOPAUSE_THRESHOLD.
        const shouldPause = ratio < AUTOPAUSE_THRESHOLD;

        inViewRef.current = ratio >= AUTOPAUSE_THRESHOLD;

        if (shouldPlay) {
          const v = videoRef.current;
          if (!v || v.paused || v.ended) {
            void playExclusive("autoplay");
          } else {
            autoPlayingRef.current = true;
          }
        } else if (shouldPause) {
          const v = videoRef.current;
          if (v && !v.paused) {
            pauseSelf(false);
            autoPlayingRef.current = false;
            registeredRef.current.autoplayIntent = false;
          }
          resetCopyrightWarning();
        }
      },
      {
        threshold: [0, 0.05, 0.25, AUTOPAUSE_THRESHOLD, AUTOPLAY_THRESHOLD, 0.75, 1],
        rootMargin: "120px 0px",
      }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [
    autoPlayOnView,
    playExclusive,
    pauseSelf,
    playerId,
    pKey,
    preloadProp,
    isPlayerFullscreen,
    resetCopyrightWarning,
    keepMediaLoaded,
  ]);

  useEffect(() => {
    const onFsChange = () => {
      const fs = isPlayerFullscreen();
      setIsFullscreen(fs);
      if (unloadTimerRef.current) {
        clearTimeout(unloadTimerRef.current);
        unloadTimerRef.current = null;
      }
      // Pinch-zoom + fullscreen fight hit-testing; always reset.
      setZoom(1);
      nearViewRef.current = true;
      inViewRef.current = true;
      // IO may have unloaded (or be about to) on a false off-screen reading.
      setMediaAttached(true);
      void ensureMediaSrc();
      focusPlayer();
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    const unbindIos = bindVideoFullscreenEvents(videoRef.current, onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
      unbindIos();
    };
  }, [ensureMediaSrc, focusPlayer, isPlayerFullscreen, mediaAttached, src]);

  const applySpeed = (rate: number) => {
    const v = videoRef.current;
    if (v) v.playbackRate = rate;
    setSpeed(rate);
    setSpeedOpen(false);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted || v.volume <= 0) {
      const restore =
        volumeBeforeMuteRef.current > 0 ? volumeBeforeMuteRef.current : DEFAULT_VOLUME;
      v.volume = restore;
      v.muted = false;
      setVolume(restore);
      setIsMuted(false);
      writeVolumePreference(restore);
      writeMutedPreference(false);
    } else {
      volumeBeforeMuteRef.current = v.volume > 0 ? v.volume : volumeBeforeMuteRef.current;
      v.muted = true;
      setIsMuted(true);
      writeMutedPreference(true);
    }
  };

  const volumePctFromPointer = useCallback((clientY: number) => {
    const track = volumeTrackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    if (rect.height <= 0) return 0;
    return Math.min(100, Math.max(0, ((rect.bottom - clientY) / rect.height) * 100));
  }, []);

  const endVolumeDrag = useCallback(() => {
    if (!volumeDraggingRef.current) return;
    volumeDraggingRef.current = false;
    setIsVolumeDragging(false);
  }, []);

  useEffect(() => {
    if (!isVolumeDragging) return;
    const onMove = (e: PointerEvent) => {
      if (!volumeDraggingRef.current) return;
      applyVolume(volumePctFromPointer(e.clientY) / 100);
    };
    const onUp = () => endVolumeDrag();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isVolumeDragging, applyVolume, volumePctFromPointer, endVolumeDrag]);

  const onVolumeTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    stopFeedNavigation(e);
    e.preventDefault();
    volumeDraggingRef.current = true;
    setIsVolumeDragging(true);
    setVolumeOpen(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    applyVolume(volumePctFromPointer(e.clientY) / 100);
  };

  const onVolumeTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!volumeDraggingRef.current) return;
    stopFeedNavigation(e);
    applyVolume(volumePctFromPointer(e.clientY) / 100);
  };

  const onVolumeTrackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    stopFeedNavigation(e);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    endVolumeDrag();
  };

  const toggleFullscreen = () => {
    void toggleVideoFullscreen(containerRef.current, videoRef.current).finally(
      () => {
        // iOS webkitEnterFullscreen may not fire document fullscreenchange.
        setIsFullscreen(
          isVideoFullscreen(containerRef.current, videoRef.current)
        );
      }
    );
  };

  const seekBy = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    const d = readVideoDuration(v) || duration;
    const next = Math.min(Math.max(0, v.currentTime + delta), d || v.currentTime + delta);
    v.currentTime = next;
    setCurrent(next);
    saveProgress(pKey, next);
  }, [duration, pKey]);

  const seekToPercent = useCallback(
    (pct: number) => {
      const v = videoRef.current;
      if (!v) return false;
      const clamped = Math.min(100, Math.max(0, pct));
      setScrubPct(clamped);
      const d = readVideoDuration(v) || duration;
      if (d <= 0) {
        pendingSeekPctRef.current = clamped;
        return false;
      }
      pendingSeekPctRef.current = null;
      const time = (clamped / 100) * d;
      try {
        if (typeof v.fastSeek === "function") v.fastSeek(time);
        else v.currentTime = time;
      } catch {
        v.currentTime = time;
      }
      setCurrent(time);
      if (d !== duration) setDuration(d);
      return true;
    },
    [duration]
  );

  const pctFromPointer = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  }, []);

  const endScrub = useCallback(() => {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    setIsScrubbing(false);
    setScrubPct(null);
    pendingSeekPctRef.current = null;
    const v = videoRef.current;
    if (v) {
      setCurrent(v.currentTime);
      saveProgress(pKey, v.currentTime);
      if (resumeAfterScrubRef.current) void playExclusive("user");
    }
    resumeAfterScrubRef.current = false;
  }, [pKey, playExclusive]);

  useEffect(() => {
    if (!isScrubbing) return;
    const onMove = (e: PointerEvent) => {
      if (!scrubbingRef.current) return;
      seekToPercent(pctFromPointer(e.clientX));
    };
    const onUp = () => endScrub();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isScrubbing, seekToPercent, pctFromPointer, endScrub]);

  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    stopFeedNavigation(e);
    focusPlayer();
    const v = videoRef.current;
    if (v) {
      resumeAfterScrubRef.current = !v.paused;
      if (resumeAfterScrubRef.current) v.pause();
    }
    scrubbingRef.current = true;
    setIsScrubbing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    seekToPercent(pctFromPointer(e.clientX));
  };

  const onTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    stopFeedNavigation(e);
    seekToPercent(pctFromPointer(e.clientX));
  };

  const onTrackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    stopFeedNavigation(e);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    endScrub();
  };

  const triggerLikeBurst = useCallback(() => {
    if (!onDoubleTapLike) return;
    onDoubleTapLike();
    setLikeBurst(true);
    window.setTimeout(() => setLikeBurst(false), 700);
  }, [onDoubleTapLike]);

  const onVideoPointerDown = (e: React.PointerEvent) => {
    stopFeedNavigation(e);
    focusPlayer();
    if (e.pointerType === "touch" || isCoarsePointer()) {
      longPressTimerRef.current = setTimeout(() => {
        const v = videoRef.current;
        if (!v) return;
        v.playbackRate = LONG_PRESS_RATE;
        holdBoostRef.current = true;
        setHoldBoost(true);
        setSpeed(LONG_PRESS_RATE);
      }, LONG_PRESS_MS);
    }
  };

  const onVideoPointerUp = (e: React.PointerEvent) => {
    stopFeedNavigation(e);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (holdBoostRef.current) {
      const v = videoRef.current;
      if (v) v.playbackRate = 1;
      holdBoostRef.current = false;
      setHoldBoost(false);
      setSpeed(1);
      return;
    }

    const now = Date.now();
    if (onDoubleTapLike && now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      triggerLikeBurst();
      return;
    }
    lastTapRef.current = now;

    // Feed immersive viewer: single tap opens viewer while playing; paused tap resumes.
    if (onOpenImmersive) {
      if (isFeedVideoControlZone(e.clientY, containerRef.current)) return;
      const v = videoRef.current;
      if (v?.paused) {
        userPausedRef.current = false;
        void playExclusive("user");
        return;
      }
      onOpenImmersive();
      return;
    }

    // pointerup toggles play/pause on the video surface.
    if (!started) {
      userPausedRef.current = false;
      void playExclusive("user");
    } else {
      togglePlay();
    }
  };

  const onVideoPointerCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (holdBoostRef.current) {
      const v = videoRef.current;
      if (v) v.playbackRate = 1;
      holdBoostRef.current = false;
      setHoldBoost(false);
      setSpeed(1);
    }
  };

  /** Tap empty letterbox / zoom margins (not controls) still toggles play. */
  const onSurfacePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    stopFeedNavigation(e);
    focusPlayer();
    if (onOpenImmersive) {
      const v = videoRef.current;
      if (v?.paused) {
        userPausedRef.current = false;
        void playExclusive("user");
        return;
      }
      onOpenImmersive();
      return;
    }
    if (!started) {
      userPausedRef.current = false;
      void playExclusive("user");
    } else {
      togglePlay();
    }
  };

  // Pinch zoom (mobile)
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchRef.current = { dist, scale: zoom };
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const next = Math.min(3, Math.max(1, (pinchRef.current.scale * dist) / pinchRef.current.dist));
      setZoom(next);
    }
  };
  const onTouchEnd = () => {
    if (zoom < 1.05) setZoom(1);
    pinchRef.current = null;
  };

  // Hover preview (desktop)
  const onMouseEnter = () => {
    if (isCoarsePointer() || !autoPlayOnView) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      if (inViewRef.current && playing) return;
      if (userPausedRef.current && inViewRef.current) return;
      void playExclusive("hover");
    }, HOVER_PREVIEW_DELAY_MS);
  };
  const onMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (!inViewRef.current || userPausedRef.current) {
      pauseSelf(false);
    }
  };

  const handlePlayerKey = useCallback(
    (e: KeyboardEvent | React.KeyboardEvent) => {
      if (isEditableKeyTarget(e.target)) return;

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          // preventDefault so a focused control button doesn't also activate (double toggle).
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekBy(-SEEK_STEP_SEC);
          break;
        case "ArrowRight":
          e.preventDefault();
          seekBy(SEEK_STEP_SEC);
          break;
        case "ArrowUp":
          e.preventDefault();
          applyVolume(Math.min(1, volume + VOLUME_STEP));
          break;
        case "ArrowDown":
          e.preventDefault();
          applyVolume(Math.max(0, volume - VOLUME_STEP));
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
        case "F":
          e.preventDefault();
          if (!protect) toggleFullscreen();
          break;
        case "Escape":
          if (document.fullscreenElement) {
            e.preventDefault();
            void document.exitFullscreen();
          }
          if (zoom > 1) setZoom(1);
          break;
        default:
          break;
      }
    },
    [applyVolume, protect, seekBy, togglePlay, volume, zoom]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (isFullscreen) return;
    handlePlayerKey(e);
  };

  // Fullscreen often leaves focus on a control button; capture keys at document level.
  useEffect(() => {
    if (!isFullscreen) return;
    const onDocKey = (e: KeyboardEvent) => {
      if (!isPlayerFullscreen()) return;
      handlePlayerKey(e);
    };
    document.addEventListener("keydown", onDocKey);
    return () => document.removeEventListener("keydown", onDocKey);
  }, [handlePlayerKey, isFullscreen, isPlayerFullscreen]);

  const liveDuration = (() => {
    const v = videoRef.current;
    if (v) {
      const d = readVideoDuration(v);
      if (d > 0) return d;
    }
    return duration;
  })();

  const progress = liveDuration > 0 ? (current / liveDuration) * 100 : 0;
  const displayProgress = scrubPct ?? progress;
  const displayCurrent =
    scrubPct !== null && liveDuration > 0 ? (scrubPct / 100) * liveDuration : current;
  const effectiveMuted = isMuted || volume <= 0;
  const displayVolumePct = effectiveMuted ? 0 : Math.round(volume * 100);
  const VolumeIcon = effectiveMuted ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const showVolumePanel = volumeOpen || isVolumeDragging;

  const forensicRequired = protect && Boolean(mediaId);
  const forensicBlocked = forensicRequired && (forensicSessionFailed || forensicCanvasFailed);
  const markedOutputReady =
    forensicRequired && Boolean(forensicRenderConfig) && forensicCanvasReady;
  const forensicLoading =
    forensicRequired && !forensicBlocked && !markedOutputReady;

  const videoStyle: CSSProperties = {
    transform: zoom > 1 ? `scale(${zoom})` : undefined,
    transition: pinchRef.current ? undefined : "transform 200ms ease",
    opacity: forensicRequired && markedOutputReady ? 0 : undefined,
  };

  return (
    <div
      ref={containerRef}
      data-feed-video-id={playerId}
      className={cn(
        "relative isolate overflow-hidden bg-black group/video outline-none",
        className
      )}
      tabIndex={0}
      role="group"
      aria-label="동영상 플레이어"
      onClick={stopFeedNavigation}
      onPointerDown={(e) => {
        stopFeedNavigation(e);
        focusPlayer();
      }}
      onPointerUp={onSurfacePointerUp}
      onKeyDown={onKeyDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <video
        ref={videoRef}
        data-src={playbackSrc}
        poster={poster}
        className={cn(
          fillMode
            ? cn("absolute inset-0 h-full w-full", fillFitClass)
            : "block w-full h-auto",
          "origin-center backface-hidden",
          zoom > 1 && "will-change-transform"
        )}
        style={videoStyle}
        muted={isMuted}
        playsInline={playsInline}
        preload={preload}
        loop={loop}
        controls={false}
        disablePictureInPicture
        controlsList="nodownload noremoteplayback noplaybackrate"
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={onVideoPointerDown}
        onPointerUp={onVideoPointerUp}
        onPointerCancel={onVideoPointerCancel}
      />

      <ForensicVideoCanvas
        videoRef={videoRef}
        active={Boolean(forensicRenderConfig)}
        config={forensicRenderConfig ?? null}
        objectFit={wantsContain ? "contain" : "cover"}
        mediaId={mediaId}
        onMarked={() => setForensicCanvasReady(true)}
        onFailed={() => setForensicCanvasFailed(true)}
        className={cn(
          fillMode
            ? cn("absolute inset-0 h-full w-full", fillFitClass)
            : "block w-full h-auto",
          "origin-center z-[1] pointer-events-none",
          !markedOutputReady && "opacity-0"
        )}
      />

      {forensicLoading ? (
        <div
          className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-black"
          aria-hidden
        >
          <Loader2 className="h-10 w-10 animate-spin text-white/70" />
        </div>
      ) : null}

      {forensicBlocked ? (
        <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-black p-4 text-center text-sm text-white/80">
          워터마크를 적용할 수 없습니다. 새로고침 후 다시 시도해 주세요.
        </div>
      ) : null}

      {buffering && (
        <div
          className="pointer-events-none absolute inset-0 z-[4] flex items-center justify-center bg-black/20 transition-opacity duration-200"
          aria-hidden
        >
          <Loader2 className="h-10 w-10 animate-spin text-white/90" />
        </div>
      )}

      {likeBurst && (
        <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center">
          <Heart
            className="h-20 w-20 text-white drop-shadow-lg animate-in zoom-in-50 fade-in duration-300 fill-white"
            fill="currentColor"
          />
        </div>
      )}

      {holdBoost && (
        <div className="pointer-events-none absolute top-3 right-3 z-[5] rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-white">
          2x
        </div>
      )}

      {showCopyrightWarning ? (
        <PaidVideoCopyrightWarning onDismiss={dismissCopyrightWarning} />
      ) : null}

      {!playing && !buffering && !showCopyrightWarning && !previewMode && (
        <div
          className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center"
          aria-hidden
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/65 text-white shadow-[0_2px_12px_rgba(0,0,0,0.45)] ring-1 ring-white/20">
            <Play className="h-7 w-7 translate-x-[2px]" fill="currentColor" />
          </span>
        </div>
      )}

      {started && !previewMode && (
        <>
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 z-[3] px-3 pb-2 pt-8",
              "bg-gradient-to-t from-black/80 via-black/35 to-transparent"
            )}
          />
          <div
            data-video-controls
            className="absolute inset-x-0 bottom-0 z-[4] px-3 pb-2"
            onClick={stopFeedNavigation}
            onPointerDown={stopFeedNavigation}
          >
          <div
            ref={trackRef}
            data-video-seek-bar
            role="slider"
            aria-label="탐색"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(displayProgress)}
            tabIndex={0}
            className="relative flex h-6 cursor-pointer touch-none items-center"
            onPointerDown={onTrackPointerDown}
            onPointerMove={onTrackPointerMove}
            onPointerUp={onTrackPointerUp}
            onPointerCancel={onTrackPointerUp}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                seekToPercent(displayProgress - 2);
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                seekToPercent(displayProgress + 2);
              }
            }}
          >
            <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/30" />
            <div
              className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white"
              style={{ width: `${displayProgress}%` }}
            />
            <div
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
              style={{ left: `${displayProgress}%` }}
            />
          </div>

          <div className="mt-0.5 flex items-center gap-3 text-white">
            <button
              type="button"
              aria-label={playing ? "일시정지" : "재생"}
              onClick={(e) => {
                stopFeedNavigation(e);
                focusPlayer();
                togglePlay();
              }}
            >
              {playing ? (
                <Pause className="h-5 w-5" fill="currentColor" />
              ) : (
                <Play className="h-5 w-5" fill="currentColor" />
              )}
            </button>

            <div
              className="relative"
              onMouseEnter={() => setVolumeOpen(true)}
              onMouseLeave={() => {
                if (!volumeDraggingRef.current) setVolumeOpen(false);
              }}
              onFocus={() => setVolumeOpen(true)}
              onBlur={(e) => {
                if (
                  !e.currentTarget.contains(e.relatedTarget as Node | null) &&
                  !volumeDraggingRef.current
                ) {
                  setVolumeOpen(false);
                }
              }}
            >
              {showVolumePanel && (
                <div
                  className="absolute bottom-full left-1/2 z-10 mb-1 flex -translate-x-1/2 flex-col items-center rounded-full bg-black/85 px-2 pb-1.5 pt-3 shadow-lg ring-1 ring-white/10 backdrop-blur-sm"
                  onClick={stopFeedNavigation}
                  onPointerDown={stopFeedNavigation}
                >
                  <div
                    ref={volumeTrackRef}
                    role="slider"
                    aria-label="볼륨"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={displayVolumePct}
                    aria-orientation="vertical"
                    tabIndex={0}
                    className="relative flex h-20 w-6 cursor-pointer touch-none items-center justify-center"
                    onPointerDown={onVolumeTrackPointerDown}
                    onPointerMove={onVolumeTrackPointerMove}
                    onPointerUp={onVolumeTrackPointerUp}
                    onPointerCancel={onVolumeTrackPointerUp}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        applyVolume(Math.min(1, volume + 0.05));
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        applyVolume(Math.max(0, volume - 0.05));
                      }
                    }}
                  >
                    <div className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-white/30" />
                    <div
                      className="absolute bottom-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-white"
                      style={{ height: `${displayVolumePct}%` }}
                    />
                    <div
                      className="absolute left-1/2 h-3 w-3 -translate-x-1/2 translate-y-1/2 rounded-full bg-white shadow"
                      style={{ bottom: `${displayVolumePct}%` }}
                    />
                  </div>
                </div>
              )}
              <button
                type="button"
                aria-label={effectiveMuted ? "음소거 해제" : "음소거"}
                onClick={(e) => {
                  stopFeedNavigation(e);
                  toggleMute();
                }}
              >
                <VolumeIcon className="h-5 w-5" />
              </button>
            </div>

            <span className="text-[11px] tabular-nums text-white/90">
              {formatTime(displayCurrent)} / {formatTime(liveDuration)}
            </span>

            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  aria-label="재생 속도"
                  onClick={(e) => {
                    stopFeedNavigation(e);
                    setSpeedOpen((o) => !o);
                  }}
                  className="rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums hover:bg-white/25"
                >
                  {speed}x
                </button>
                {speedOpen && (
                  <div
                    className="absolute bottom-full right-0 mb-2 w-24 overflow-hidden rounded-lg bg-black/90 py-1 text-xs shadow-lg ring-1 ring-white/10"
                    onClick={stopFeedNavigation}
                  >
                    <p className="px-3 py-1 text-[10px] text-white/50">재생 속도</p>
                    {SPEED_OPTIONS.map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={(e) => {
                          stopFeedNavigation(e);
                          applySpeed(rate);
                        }}
                        className={cn(
                          "block w-full px-3 py-1.5 text-left hover:bg-white/10",
                          rate === speed ? "font-bold text-white" : "text-white/80"
                        )}
                      >
                        {rate === 1 ? "1x (기본)" : `${rate}x`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!protect && (
                <button
                  type="button"
                  aria-label="전체화면"
                  onClick={(e) => {
                    stopFeedNavigation(e);
                    toggleFullscreen();
                  }}
                >
                  {isFullscreen ? (
                    <Minimize className="h-5 w-5" />
                  ) : (
                    <Maximize className="h-5 w-5" />
                  )}
                </button>
              )}
            </div>
          </div>
          </div>
        </>
      )}
    </div>
  );
}
