import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

/** Ignore control-center / notification-shade flickers. */
const MIN_BACKGROUND_MS = 300;
/** Avoid a refetch stampede if the user hops in and out. */
const MIN_SYNC_INTERVAL_MS = 8_000;

/**
 * Warm-start helper: fire when the process was backgrounded and is active again.
 * Does not run on first mount (AppState "change" only).
 */
export function useAppForeground(onForeground: (backgroundedMs: number) => void) {
  const cbRef = useRef(onForeground);
  cbRef.current = onForeground;
  const backgroundedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === "background" || next === "inactive") {
        if (backgroundedAtRef.current == null) backgroundedAtRef.current = Date.now();
        return;
      }
      if (next !== "active") return;
      const started = backgroundedAtRef.current;
      backgroundedAtRef.current = null;
      if (started == null) return;
      cbRef.current(Date.now() - started);
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, []);
}

/**
 * Quietly refresh list caches on resume. Screens keep showing the last
 * in-memory data — never resetQueries / never a full-screen spinner.
 */
export function ForegroundSync() {
  const queryClient = useQueryClient();
  const lastSyncRef = useRef(0);

  useAppForeground((backgroundedMs) => {
    if (backgroundedMs < MIN_BACKGROUND_MS) return;
    const now = Date.now();
    if (now - lastSyncRef.current < MIN_SYNC_INTERVAL_MS) return;
    lastSyncRef.current = now;
    void queryClient.refetchQueries({ queryKey: ["mobile-dm-inbox"] });
    void queryClient.refetchQueries({ queryKey: ["mobile-marketplace"] });
    void queryClient.refetchQueries({ queryKey: ["mobile-commerce-market"] });
    void queryClient.refetchQueries({ queryKey: ["mobile-notifications"] });
  });

  return null;
}

export const APP_FOREGROUND_MIN_BACKGROUND_MS = MIN_BACKGROUND_MS;
export const APP_FOREGROUND_MIN_SYNC_MS = MIN_SYNC_INTERVAL_MS;
