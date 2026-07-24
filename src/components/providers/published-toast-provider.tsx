"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { PublishedToastPill } from "@/components/ui/published-toast";
import type { PublishedToastInput } from "@/lib/published-toast-types";
import {
  clearPublishedToast,
  dismissPublishedToastCurrent,
  getPublishedToastSnapshot,
  pushErrorToast,
  pushInfoToast,
  pushPublishedToast,
  pushPublishingToast,
  subscribePublishedToast,
  type QueuedToast,
} from "@/lib/published-toast-store";

export type { PublishedToastInput } from "@/lib/published-toast-types";
export {
  FLASH_POST_STORAGE_KEY,
  SCROLL_FEED_TOP_KEY,
} from "@/lib/published-toast-types";

type PublishedToastContextValue = {
  showPublishedToast: (input: {
    postId: string;
    userImage?: string | null;
    userName?: string | null;
    avatars?: PublishedToastInput["avatars"];
    message?: string;
  }) => void;
  showPublishingToast: (input?: {
    userImage?: string | null;
    userName?: string | null;
    avatars?: PublishedToastInput["avatars"];
    message?: string;
  }) => void;
  showErrorToast: (input: { message: string; detail?: string }) => void;
  showInfoToast: (input: {
    message: string;
    detail?: string;
    href?: string;
    durationMs?: number;
  }) => void;
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

const DEFAULT_DURATION = 4500;

function useStoreCurrent(): QueuedToast | null {
  return useSyncExternalStore(
    subscribePublishedToast,
    () => getPublishedToastSnapshot().current,
    () => null
  );
}

export function PublishedToastProvider({ children }: { children: ReactNode }) {
  const current = useStoreCurrent();
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [mounted, setMounted] = useState(false);

  const timerRef = useRef<number | null>(null);
  const remainingRef = useRef(DEFAULT_DURATION);
  const pausedRef = useRef(false);
  const deadlineRef = useRef<number | null>(null);
  const shownIdRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const runExit = useCallback(() => {
    setExiting(true);
    window.setTimeout(() => {
      setExiting(false);
      setVisible(false);
      shownIdRef.current = null;
      dismissPublishedToastCurrent();
    }, 200);
  }, []);

  const startDismissTimer = useCallback(
    (ms: number) => {
      clearTimer();
      if (ms <= 0) {
        runExit();
        return;
      }
      remainingRef.current = ms;
      deadlineRef.current = Date.now() + ms;
      timerRef.current = window.setTimeout(runExit, ms);
    },
    [clearTimer, runExit]
  );

  // 새 toast가 오면 등장 애니메이션
  useEffect(() => {
    if (!current) {
      setVisible(false);
      setExiting(false);
      shownIdRef.current = null;
      clearTimer();
      return;
    }
    if (shownIdRef.current === current.id) return;
    shownIdRef.current = current.id;
    setExiting(false);
    setVisible(false);
    pausedRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setVisible(true));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [current, clearTimer]);

  // 자동 종료 타이머 (게시 중 제외)
  useEffect(() => {
    if (!current || !visible || exiting) return;
    if (current.kind === "publishing") return;
    startDismissTimer(current.durationMs ?? DEFAULT_DURATION);
    return () => clearTimer();
  }, [current, visible, exiting, startDismissTimer, clearTimer]);

  const dismissToast = useCallback(() => {
    clearTimer();
    if (!getPublishedToastSnapshot().current) {
      clearPublishedToast();
      return;
    }
    runExit();
  }, [clearTimer, runExit]);

  const onPause = useCallback(() => {
    if (pausedRef.current) return;
    const cur = getPublishedToastSnapshot().current;
    if (!cur || cur.kind === "publishing") return;
    pausedRef.current = true;
    if (deadlineRef.current != null) {
      remainingRef.current = Math.max(0, deadlineRef.current - Date.now());
    }
    clearTimer();
  }, [clearTimer]);

  const onResume = useCallback(() => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    startDismissTimer(remainingRef.current);
  }, [startDismissTimer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && getPublishedToastSnapshot().current) {
        e.preventDefault();
        dismissToast();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismissToast]);

  const value = useMemo<PublishedToastContextValue>(
    () => ({
      showPublishedToast: pushPublishedToast,
      showPublishingToast: pushPublishingToast,
      showErrorToast: pushErrorToast,
      showInfoToast: pushInfoToast,
      dismissToast,
    }),
    [dismissToast]
  );

  return (
    <PublishedToastContext.Provider value={value}>
      {children}
      {mounted &&
        current &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 z-[320] flex justify-center px-3"
            style={{
              top: "calc(var(--header-h, 3.5rem) + 0.5rem)",
            }}
          >
            <div
              className={`pointer-events-auto will-change-transform transition-all ease-out ${
                visible && !exiting
                  ? "translate-y-0 opacity-100"
                  : "-translate-y-5 opacity-0"
              }`}
              style={{ transitionDuration: exiting ? "200ms" : "250ms" }}
            >
              <PublishedToastPill
                toast={current}
                onDismiss={dismissToast}
                onPause={onPause}
                onResume={onResume}
                onShowInfo={pushInfoToast}
              />
            </div>
          </div>,
          document.body
        )}
    </PublishedToastContext.Provider>
  );
}
