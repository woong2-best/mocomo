"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { getDioramaPreset } from "@/lib/diorama/living-room-preset";
import { startAptAmbientPad, stopAptAmbientPad } from "@/lib/apt/first-impression/apt-ambient-audio";
import {
  FIRST_ENTRY_LIVING_ROOM_ID,
  FIRST_ENTRY_TIMING,
  markFirstImpressionComplete,
  PERF_MARK_ENTRY_START,
  PERF_MARK_INTERIOR_READY,
  shouldPlayFirstImpression,
} from "@/lib/apt/first-impression/constants";
import { easeOutCubic, lerp } from "@/lib/apt/first-impression/easing";

export type FirstEntryPhase =
  | "idle"
  | "loading"
  | "reveal"
  | "dwell"
  | "enter-room"
  | "ui-fade"
  | "complete";

export type FirstEntryState = {
  active: boolean;
  phase: FirstEntryPhase;
  overlayVisible: boolean;
  overlayLabel: string | null;
  hudVisible: boolean;
  dollhouseCameraZoom: number;
  overviewRevealOpacity: number;
  vignetteOpacity: number;
  skipFirstEntry: () => void;
};

function resolveLivingRoomId(rooms: AptRoom[]): string | null {
  const living = rooms.find((r) => r.id === FIRST_ENTRY_LIVING_ROOM_ID);
  if (living && getDioramaPreset(living.id, living.type)) return living.id;
  for (const room of rooms) {
    if (room.type === "hall" || room.type === "entrance" || room.type === "balcony") continue;
    if (getDioramaPreset(room.id, room.type)) return room.id;
  }
  return null;
}

export function useAptFirstEntry({
  enabled,
  rooms,
  enterRoom,
}: {
  enabled: boolean;
  rooms: AptRoom[];
  enterRoom: (roomId: string) => void;
}): FirstEntryState {
  const playIntro = enabled && shouldPlayFirstImpression();
  const [phase, setPhase] = useState<FirstEntryPhase>(playIntro ? "loading" : "complete");
  const [revealT, setRevealT] = useState(0);
  const timersRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const revealStartRef = useRef(0);
  const roomEnteredRef = useRef(false);
  const startedRef = useRef(false);
  const livingRoomId = resolveLivingRoomId(rooms);

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const finish = useCallback(() => {
    clearTimers();
    markFirstImpressionComplete();
    stopAptAmbientPad();
    setPhase("complete");
    setRevealT(1);
    if (livingRoomId && !roomEnteredRef.current) {
      roomEnteredRef.current = true;
      enterRoom(livingRoomId);
    }
    if (typeof performance !== "undefined") {
      performance.mark(PERF_MARK_INTERIOR_READY);
    }
  }, [clearTimers, enterRoom, livingRoomId]);

  const skipFirstEntry = useCallback(() => {
    finish();
  }, [finish]);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  }, []);

  const runRevealAnimation = useCallback(() => {
    revealStartRef.current = performance.now();
    const tick = () => {
      const elapsed = performance.now() - revealStartRef.current;
      const t = Math.min(1, elapsed / FIRST_ENTRY_TIMING.reveal);
      setRevealT(t);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!playIntro || startedRef.current) return;
    startedRef.current = true;

    if (typeof performance !== "undefined") {
      performance.mark(PERF_MARK_ENTRY_START);
    }
    startAptAmbientPad();

    schedule(() => {
      setPhase("reveal");
      runRevealAnimation();
    }, FIRST_ENTRY_TIMING.loading);

    schedule(() => setPhase("dwell"), FIRST_ENTRY_TIMING.loading + FIRST_ENTRY_TIMING.reveal);

    schedule(() => {
      setPhase("enter-room");
      if (livingRoomId) {
        roomEnteredRef.current = true;
        enterRoom(livingRoomId);
      }
    }, FIRST_ENTRY_TIMING.loading + FIRST_ENTRY_TIMING.reveal + FIRST_ENTRY_TIMING.dwell);

    schedule(() => setPhase("ui-fade"), FIRST_ENTRY_TIMING.loading + FIRST_ENTRY_TIMING.reveal + FIRST_ENTRY_TIMING.dwell + FIRST_ENTRY_TIMING.enterRoom);

    schedule(
      finish,
      FIRST_ENTRY_TIMING.loading +
        FIRST_ENTRY_TIMING.reveal +
        FIRST_ENTRY_TIMING.dwell +
        FIRST_ENTRY_TIMING.enterRoom +
        FIRST_ENTRY_TIMING.uiFade
    );

    return () => {
      clearTimers();
      stopAptAmbientPad(200);
    };
  }, [playIntro, schedule, runRevealAnimation, enterRoom, livingRoomId, finish, clearTimers]);

  const active = phase !== "idle" && phase !== "complete";
  const easedReveal = easeOutCubic(revealT);
  const dollhouseCameraZoom = active && phase !== "loading" ? lerp(0.68, 1, easedReveal) : 1;
  const overviewRevealOpacity =
    phase === "loading" ? 0 : phase === "reveal" ? easedReveal : 1;
  const vignetteOpacity =
    phase === "loading" ? 1 : phase === "reveal" ? lerp(0.85, 0.25, easedReveal) : phase === "dwell" ? 0.2 : 0;
  const hudVisible = phase === "ui-fade" || phase === "complete";
  const overlayVisible = phase === "loading" || phase === "reveal";
  const overlayLabel =
    phase === "loading" ? "집을 준비하고 있어요…" : phase === "reveal" ? null : null;

  return {
    active,
    phase,
    overlayVisible,
    overlayLabel,
    hudVisible,
    dollhouseCameraZoom,
    overviewRevealOpacity,
    vignetteOpacity,
    skipFirstEntry,
  };
}
