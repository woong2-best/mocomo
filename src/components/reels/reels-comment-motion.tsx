"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  REELS_COMMENT_DURATION_MS,
  REELS_COMMENT_EASE,
  isCompactReelsViewport,
  reelsCommentBackdropHeight,
  reelsCommentSheetHeight,
  reelsCommentSheetTranslateY,
  reelsCommentShouldClose,
  reelsCommentVideoAtProgress,
} from "@/lib/reels/comment-sheet-motion";

type MotionApi = {
  bindFrame: (el: HTMLElement | null) => void;
  bindVideo: (el: HTMLElement | null) => void;
  applyVideo: (progress: number, dragging: boolean) => void;
  getFrameHeight: () => number;
  getFrameElement: () => HTMLElement | null;
};

const ReelsCommentMotionContext = createContext<MotionApi | null>(null);

function resetVideoMotion(video: HTMLElement) {
  video.style.transform = "";
  video.style.borderRadius = "";
  video.style.transition = "";
  video.style.transformOrigin = "";
  video.style.overflow = "";
}

export function useCompactReelsViewport() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () => setCompact(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return compact;
}

export function useReelsCommentMotion(): MotionApi {
  const ctx = useContext(ReelsCommentMotionContext);
  if (ctx) return ctx;
  return {
    bindFrame: () => {},
    bindVideo: () => {},
    applyVideo: () => {},
    getFrameHeight: () =>
      typeof window !== "undefined" ? window.innerHeight : 800,
    getFrameElement: () => null,
  };
}

export function ReelsCommentMotionRoot({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const frameEl = useRef<HTMLElement | null>(null);
  const videoEl = useRef<HTMLElement | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const getFrameHeight = useCallback(() => {
    const measured = frameEl.current?.clientHeight ?? 0;
    if (measured > 200) return measured;
    return typeof window !== "undefined" ? window.innerHeight : 800;
  }, []);

  const applyVideo = useCallback(
    (progress: number, dragging: boolean) => {
      const video = videoEl.current;
      if (!video) return;
      const compact = isCompactReelsViewport();
      if (!compact || !enabledRef.current) {
        resetVideoMotion(video);
        return;
      }
      const frame = getFrameHeight();
      const sheet = reelsCommentSheetHeight(frame, 0);
      const v = reelsCommentVideoAtProgress(progress, frame, sheet);
      video.style.transformOrigin = "center center";
      video.style.overflow = "hidden";
      video.style.transition = dragging
        ? "none"
        : `transform ${REELS_COMMENT_DURATION_MS}ms ${REELS_COMMENT_EASE}, border-radius ${REELS_COMMENT_DURATION_MS}ms ${REELS_COMMENT_EASE}`;
      video.style.transform = `translate3d(0, ${v.translateY}px, 0) scale(${v.scale})`;
      video.style.borderRadius = `${v.borderRadius}px`;
    },
    [getFrameHeight]
  );

  useEffect(() => {
    if (!enabled) applyVideo(0, true);
  }, [applyVideo, enabled]);

  const api = useMemo<MotionApi>(
    () => ({
      bindFrame: (el) => {
        frameEl.current = el;
      },
      bindVideo: (el) => {
        videoEl.current = el;
        if (el && !enabledRef.current) resetVideoMotion(el);
      },
      applyVideo,
      getFrameHeight,
      getFrameElement: () => frameEl.current,
    }),
    [applyVideo, getFrameHeight]
  );

  return (
    <ReelsCommentMotionContext.Provider value={api}>
      {children}
    </ReelsCommentMotionContext.Provider>
  );
}

type Drag = {
  y: number;
  p: number;
  id: number;
  active: boolean;
  scrollTop: number;
  samples: { y: number; t: number }[];
};

function velocityY(samples: { y: number; t: number }[]) {
  if (samples.length < 2) return 0;
  const a = samples[0];
  const b = samples[samples.length - 1];
  const dt = b.t - a.t;
  if (dt < 16) return 0;
  return ((b.y - a.y) / dt) * 1000;
}

function remember(samples: { y: number; t: number }[], y: number) {
  samples.push({ y, t: performance.now() });
  if (samples.length > 6) samples.shift();
}

/**
 * Phone comment sheet: progress drives the sheet, the dismiss layer, and the video.
 * Handle drag and a pull from the top of the list dismiss; a tap on the video does too.
 */
export function useMobileReelsCommentSheet(open: boolean, onClose: () => void) {
  const motion = useReelsCommentMotion();
  const motionRef = useRef(motion);
  motionRef.current = motion;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const hitRef = useRef<HTMLButtonElement | null>(null);
  const progressRef = useRef(0);
  const closingRef = useRef(false);
  const closeTimer = useRef<number | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const listDragRef = useRef<Drag | null>(null);
  const blockClickRef = useRef(false);

  const paint = useCallback((progress: number, dragging: boolean) => {
    const next = Math.min(1, Math.max(0, progress));
    progressRef.current = next;
    const frame = motionRef.current.getFrameHeight();
    const sheet = reelsCommentSheetHeight(frame, 0);
    motionRef.current.applyVideo(next, dragging);
    const sheetEl = sheetRef.current;
    if (sheetEl) {
      sheetEl.style.height = `${sheet}px`;
      sheetEl.style.transition = dragging
        ? "none"
        : `transform ${REELS_COMMENT_DURATION_MS}ms ${REELS_COMMENT_EASE}`;
      sheetEl.style.transform = `translate3d(0, ${reelsCommentSheetTranslateY(next, sheet)}px, 0)`;
    }
    const hitEl = hitRef.current;
    if (hitEl) {
      hitEl.style.transition = dragging
        ? "none"
        : `height ${REELS_COMMENT_DURATION_MS}ms ${REELS_COMMENT_EASE}`;
      hitEl.style.height = `${reelsCommentBackdropHeight(frame, sheet, next)}px`;
    }
  }, []);

  const paintRef = useRef(paint);
  paintRef.current = paint;

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    if (!isCompactReelsViewport()) {
      onCloseRef.current();
      return;
    }
    closingRef.current = true;
    paintRef.current(0, false);
    if (closeTimer.current != null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      onCloseRef.current();
    }, REELS_COMMENT_DURATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimer.current != null) window.clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    closingRef.current = false;
    paintRef.current(0, true);
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => {
        if (!closingRef.current) paintRef.current(1, false);
      });
    });
    const frame = motionRef.current.getFrameElement();
    const ro =
      frame && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            if (!closingRef.current) paintRef.current(progressRef.current, true);
          })
        : null;
    if (frame && ro) ro.observe(frame);
    const mq = window.matchMedia("(max-width: 1023px)");
    const onViewport = () => {
      if (!closingRef.current) paintRef.current(progressRef.current, true);
    };
    mq.addEventListener("change", onViewport);
    return () => {
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
      ro?.disconnect();
      mq.removeEventListener("change", onViewport);
    };
  }, [open]);

  const settle = useCallback(
    (progress: number, velocity: number) => {
      if (closingRef.current) return;
      if (reelsCommentShouldClose(progress, velocity)) requestClose();
      else paintRef.current(1, false);
    },
    [requestClose]
  );

  const onSheetPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || closingRef.current || !isCompactReelsViewport()) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, a, input, textarea, [data-comment-scroll]")) return;
    dragRef.current = {
      y: e.clientY,
      p: progressRef.current,
      id: e.pointerId,
      active: false,
      scrollTop: 0,
      samples: [{ y: e.clientY, t: performance.now() }],
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onSheetPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== e.pointerId) return;
    const dy = e.clientY - drag.y;
    remember(drag.samples, e.clientY);
    if (!drag.active) {
      if (Math.abs(dy) < 8) return;
      drag.active = true;
    }
    const sheet = Math.max(1, reelsCommentSheetHeight(motionRef.current.getFrameHeight(), 0));
    paintRef.current(drag.p - dy / sheet, true);
  }, []);

  const onSheetPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.id !== e.pointerId) return;
      dragRef.current = null;
      if (!drag.active) return;
      const sheet = Math.max(1, reelsCommentSheetHeight(motionRef.current.getFrameHeight(), 0));
      const dy = e.clientY - drag.y;
      settle(drag.p - dy / sheet, velocityY(drag.samples));
    },
    [settle]
  );

  const onListPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || closingRef.current || !isCompactReelsViewport()) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, a, input, textarea")) return;
    listDragRef.current = {
      y: e.clientY,
      p: progressRef.current,
      id: e.pointerId,
      active: false,
      scrollTop: e.currentTarget.scrollTop,
      samples: [{ y: e.clientY, t: performance.now() }],
    };
  }, []);

  const onListPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = listDragRef.current;
    if (!drag || drag.id !== e.pointerId || drag.scrollTop > 2) return;
    const dy = e.clientY - drag.y;
    remember(drag.samples, e.clientY);
    if (!drag.active) {
      if (dy < 8) return;
      drag.active = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const sheet = Math.max(1, reelsCommentSheetHeight(motionRef.current.getFrameHeight(), 0));
    paintRef.current(drag.p - dy / sheet, true);
  }, []);

  const onListPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = listDragRef.current;
      if (!drag || drag.id !== e.pointerId) return;
      listDragRef.current = null;
      if (!drag.active) return;
      blockClickRef.current = true;
      const sheet = Math.max(1, reelsCommentSheetHeight(motionRef.current.getFrameHeight(), 0));
      const dy = e.clientY - drag.y;
      settle(drag.p - dy / sheet, velocityY(drag.samples));
    },
    [settle]
  );

  const onListClickCapture = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (!blockClickRef.current) return;
    blockClickRef.current = false;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return useMemo(
    () => ({
      sheetRef,
      hitRef,
      requestClose,
      onSheetPointerDown,
      onSheetPointerMove,
      onSheetPointerUp,
      onListPointerDown,
      onListPointerMove,
      onListPointerUp,
      onListClickCapture,
    }),
    [
      requestClose,
      onSheetPointerDown,
      onSheetPointerMove,
      onSheetPointerUp,
      onListPointerDown,
      onListPointerMove,
      onListPointerUp,
      onListClickCapture,
    ]
  );
}
