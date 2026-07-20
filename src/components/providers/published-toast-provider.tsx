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
} from "react";
import { createPortal } from "react-dom";
import { PublishedToastPill } from "@/components/ui/published-toast";
import type { PublishedToastInput, PublishedToastKind } from "@/lib/published-toast-types";

export type { PublishedToastInput, PublishedToastKind } from "@/lib/published-toast-types";
export { FLASH_POST_STORAGE_KEY } from "@/lib/published-toast-types";

type QueuedToast = PublishedToastInput & {
  id: string;
  kind: PublishedToastKind;
};

type PublishedToastContextValue = {
  showPublishedToast: (input: {
    postId: string;
    userImage?: string | null;
    userName?: string | null;
    message?: string;
  }) => void;
  showPublishingToast: (input?: {
    userImage?: string | null;
    userName?: string | null;
    message?: string;
  }) => void;
  showErrorToast: (input: { message: string; detail?: string }) => void;
  showInfoToast: (input: { message: string; durationMs?: number }) => void;
  dismissToast: () => void;
};

const PublishedToastContext = createContext<PublishedToastContextValue | null>(null);

export function usePublishedToast() {
  const ctx = useContext(PublishedToastContext);
  if (!ctx) {
    throw new Error("usePublishedToast must be used within PublishedToastProvider");
  }
  return ctx;
}

export function usePublishedToastOptional() {
  return useContext(PublishedToastContext);
}

let toastSeq = 0;
function nextId() {
  toastSeq += 1;
  return `pt-${Date.now()}-${toastSeq}`;
}

const DEFAULT_DURATION = 3000;

export function PublishedToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueuedToast[]>([]);
  const [current, setCurrent] = useState<QueuedToast | null>(null);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [mounted, setMounted] = useState(false);

  const timerRef = useRef<number | null>(null);
  const remainingRef = useRef(DEFAULT_DURATION);
  const pausedRef = useRef(false);
  const pauseStartedRef = useRef<number | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const currentRef = useRef<QueuedToast | null>(null);
  currentRef.current = current;

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const finishExit = useCallback(() => {
    setExiting(false);
    setVisible(false);
    setCurrent(null);
    setQueue((q) => {
      if (q.length === 0) return q;
      const [next, ...rest] = q;
      window.setTimeout(() => {
        setCurrent(next);
        setExiting(false);
        setVisible(false);
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => setVisible(true));
        });
      }, 40);
      return rest;
    });
  }, []);

  const startDismissTimer = useCallback(
    (ms: number) => {
      clearTimer();
      if (ms <= 0) {
        setExiting(true);
        window.setTimeout(finishExit, 200);
        return;
      }
      remainingRef.current = ms;
      deadlineRef.current = Date.now() + ms;
      timerRef.current = window.setTimeout(() => {
        setExiting(true);
        window.setTimeout(finishExit, 200);
      }, ms);
    },
    [clearTimer, finishExit]
  );

  useEffect(() => {
    if (!current || !visible || exiting) return;
    if (current.kind === "publishing") return;
    const duration = current.durationMs ?? DEFAULT_DURATION;
    remainingRef.current = duration;
    pausedRef.current = false;
    pauseStartedRef.current = null;
    startDismissTimer(duration);
    return () => clearTimer();
  }, [current, visible, exiting, startDismissTimer, clearTimer]);

  const dismissToast = useCallback(() => {
    clearTimer();
    if (!currentRef.current) {
      setQueue([]);
      return;
    }
    setExiting(true);
    window.setTimeout(finishExit, 200);
  }, [clearTimer, finishExit]);

  const enqueue = useCallback((item: QueuedToast) => {
    setCurrent((cur) => {
      const present = (next: QueuedToast) => {
        setExiting(false);
        setVisible(false);
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => setVisible(true));
        });
        return next;
      };

      if (!cur) {
        return present(item);
      }
      // 게시 중 → 성공/실패로 즉시 교체
      if (cur.kind === "publishing" && item.kind !== "publishing") {
        return present(item);
      }
      setQueue((q) => [...q, item]);
      return cur;
    });
  }, []);

  const showPublishedToast = useCallback(
    (input: {
      postId: string;
      userImage?: string | null;
      userName?: string | null;
      message?: string;
    }) => {
      enqueue({
        id: nextId(),
        kind: "published",
        message: input.message ?? "게시됨",
        postId: input.postId,
        href: `/post/${input.postId}`,
        userImage: input.userImage,
        userName: input.userName,
        showActions: true,
        durationMs: DEFAULT_DURATION,
      });
    },
    [enqueue]
  );

  const showPublishingToast = useCallback(
    (input?: { userImage?: string | null; userName?: string | null; message?: string }) => {
      enqueue({
        id: nextId(),
        kind: "publishing",
        message: input?.message ?? "게시 중…",
        userImage: input?.userImage,
        userName: input?.userName,
        durationMs: 60_000,
      });
    },
    [enqueue]
  );

  const showErrorToast = useCallback(
    (input: { message: string; detail?: string }) => {
      enqueue({
        id: nextId(),
        kind: "error",
        message: input.message,
        detail: input.detail,
        durationMs: 4000,
      });
    },
    [enqueue]
  );

  const showInfoToast = useCallback(
    (input: { message: string; durationMs?: number }) => {
      enqueue({
        id: nextId(),
        kind: "info",
        message: input.message,
        durationMs: input.durationMs ?? DEFAULT_DURATION,
      });
    },
    [enqueue]
  );

  const onPause = useCallback(() => {
    if (pausedRef.current || currentRef.current?.kind === "publishing") return;
    pausedRef.current = true;
    pauseStartedRef.current = Date.now();
    if (deadlineRef.current != null) {
      remainingRef.current = Math.max(0, deadlineRef.current - Date.now());
    }
    clearTimer();
  }, [clearTimer]);

  const onResume = useCallback(() => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    pauseStartedRef.current = null;
    startDismissTimer(remainingRef.current);
  }, [startDismissTimer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && currentRef.current) {
        e.preventDefault();
        dismissToast();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismissToast]);

  const value = useMemo(
    () => ({
      showPublishedToast,
      showPublishingToast,
      showErrorToast,
      showInfoToast,
      dismissToast,
    }),
    [showPublishedToast, showPublishingToast, showErrorToast, showInfoToast, dismissToast]
  );

  return (
    <PublishedToastContext.Provider value={value}>
      {children}
      {mounted &&
        current &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 top-0 z-[240] flex justify-center px-3 pt-safe"
            style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))" }}
          >
            <div
              className={`pointer-events-auto transition-all duration-200 ease-out ${
                visible && !exiting
                  ? "translate-y-0 opacity-100"
                  : "-translate-y-5 opacity-0"
              }`}
              style={{
                transitionDuration: exiting ? "200ms" : "250ms",
              }}
            >
              <PublishedToastPill
                toast={current}
                onDismiss={dismissToast}
                onPause={onPause}
                onResume={onResume}
                onShowInfo={showInfoToast}
              />
            </div>
          </div>,
          document.body
        )}
    </PublishedToastContext.Provider>
  );
}
