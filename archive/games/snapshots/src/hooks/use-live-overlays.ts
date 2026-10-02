"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveSocket } from "@/hooks/use-live-socket";
import {
  createOverlayWidget,
  emptyOverlayState,
  loadOverlayStateFromStorage,
  normalizeOverlayState,
  pickWeightedSegment,
  saveOverlayStateToStorage,
} from "@/lib/live-overlays/defaults";
import {
  computeWheelSpinTarget,
  createDefaultWheelProps,
  WHEEL_SPIN_MS,
} from "@/lib/live-overlays/wheel-theme";
import {
  publishLiveOverlayState,
  subscribeLiveOverlayState,
} from "@/lib/live-overlays/socket";
import type {
  LiveOverlayState,
  LiveOverlayWidget,
  LiveOverlayWidgetType,
} from "@/lib/live-overlays/types";

function bumpState(state: LiveOverlayState, widgets: LiveOverlayWidget[]): LiveOverlayState {
  return { version: state.version + 1, widgets };
}

export function useLiveOverlays(
  channelId: string,
  userId: string | undefined,
  hostUserId: string | undefined,
  editable: boolean
) {
  const isHost = editable && !!userId && userId === hostUserId;
  const { socket, connected } = useLiveSocket(userId, channelId);
  const [state, setState] = useState<LiveOverlayState>(emptyOverlayState);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const publishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);
  const stateRef = useRef(state);
  const hostVersionRef = useRef(0);
  stateRef.current = state;
  hostVersionRef.current = state.version;

  const schedulePublish = useCallback(
    (next: LiveOverlayState) => {
      if (!isHost) return;
      saveOverlayStateToStorage(channelId, next);
      if (publishTimer.current) clearTimeout(publishTimer.current);
      publishTimer.current = setTimeout(() => {
        publishLiveOverlayState(socket, channelId, next);
        void fetch(`/api/live/${channelId}/overlay`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: next }),
        }).catch(() => {});
      }, 120);
    },
    [channelId, isHost, socket]
  );

  const applyState = useCallback(
    (next: LiveOverlayState, publish = false) => {
      setState(next);
      if (publish) schedulePublish(next);
    },
    [schedulePublish]
  );

  useEffect(() => {
    if (!isHost || hydrated.current) return;
    hydrated.current = true;
    const saved = loadOverlayStateFromStorage(channelId);
    if (saved?.widgets.length) {
      applyState(normalizeOverlayState(saved), true);
      return;
    }
    void fetch(`/api/live/${channelId}/overlay`, { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { state?: LiveOverlayState } | null) => {
        if (body?.state?.widgets?.length) {
          applyState(normalizeOverlayState(body.state), true);
        }
      })
      .catch(() => {});
  }, [applyState, channelId, isHost]);

  useEffect(() => {
    return subscribeLiveOverlayState(socket, (payload) => {
      if (payload.channelId !== channelId) return;
      if (isHost && payload.state.version <= hostVersionRef.current) return;
      setState(normalizeOverlayState(payload.state));
    });
  }, [channelId, isHost, socket]);

  /** 시청자 — 소켓 외 DB 폴링 (늦게 입장·모바일 대비) */
  useEffect(() => {
    if (isHost) return;
    let cancelled = false;

    async function pull() {
      try {
        const res = await fetch(`/api/live/${channelId}/overlay`, {
          credentials: "include",
          cache: "no-store",
        });
        if (cancelled || !res.ok) return;
        const body = (await res.json()) as { state?: LiveOverlayState };
        if (!body.state?.widgets) return;
        setState((prev) => {
          const next = normalizeOverlayState(body.state!);
          if (next.version <= prev.version && prev.widgets.length) return prev;
          return next;
        });
      } catch {
        /* ignore */
      }
    }

    void pull();
    const id = window.setInterval(pull, 6000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [channelId, isHost]);

  const addWidget = useCallback(
    (type: LiveOverlayWidgetType) => {
      if (!isHost) return;
      const maxZ = state.widgets.reduce((m, w) => Math.max(m, w.z), 0);
      const widget = createOverlayWidget(type, maxZ + 1);
      const next = bumpState(state, [...state.widgets, widget]);
      setSelectedId(widget.id);
      applyState(next, true);
    },
    [applyState, isHost, state]
  );

  const updateWidget = useCallback(
    (id: string, patch: Partial<LiveOverlayWidget>) => {
      if (!isHost) return;
      const next = bumpState(
        state,
        state.widgets.map((w) => (w.id === id ? { ...w, ...patch } : w))
      );
      applyState(next, true);
    },
    [applyState, isHost, state]
  );

  const updateWidgetProps = useCallback(
    (id: string, props: LiveOverlayWidget["props"]) => {
      if (!isHost) return;
      const cur = stateRef.current;
      const next = bumpState(
        cur,
        cur.widgets.map((w) => (w.id === id ? { ...w, props } : w))
      );
      applyState(next, true);
    },
    [applyState, isHost]
  );

  const removeWidget = useCallback(
    (id: string) => {
      if (!isHost) return;
      const next = bumpState(
        state,
        state.widgets.filter((w) => w.id !== id)
      );
      if (selectedId === id) setSelectedId(null);
      applyState(next, true);
    },
    [applyState, isHost, selectedId, state]
  );

  const spinWheel = useCallback(
    (id: string) => {
      if (!isHost) return;
      const widget = stateRef.current.widgets.find((w) => w.id === id);
      if (!widget || widget.type !== "wheel") return;
      const props = widget.props as import("@/lib/live-overlays/types").LiveOverlayWheelProps;
      if (props.spinning || !props.segments.some((s) => s.label.trim())) return;

      const { index, label } = pickWeightedSegment(props.segments);
      const target = computeWheelSpinTarget(props.rotation, index, props.segments.length);

      updateWidgetProps(id, { ...props, spinning: true });

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const latest = stateRef.current.widgets.find((w) => w.id === id);
          if (!latest || latest.type !== "wheel") return;
          const latestProps = latest.props as import("@/lib/live-overlays/types").LiveOverlayWheelProps;
          if (!latestProps.spinning) return;
          updateWidgetProps(id, { ...latestProps, spinning: true, rotation: target });
        });
      });

      window.setTimeout(() => {
        const latest = stateRef.current.widgets.find((w) => w.id === id);
        if (!latest || latest.type !== "wheel") return;
        const latestProps = latest.props as import("@/lib/live-overlays/types").LiveOverlayWheelProps;
        updateWidgetProps(id, {
          ...latestProps,
          spinning: false,
          rotation: target,
          lastResult: label,
        });
      }, WHEEL_SPIN_MS);
    },
    [isHost, updateWidgetProps]
  );

  const resetWheel = useCallback(
    (id: string) => {
      if (!isHost) return;
      const widget = state.widgets.find((w) => w.id === id);
      if (!widget || widget.type !== "wheel") return;
      updateWidgetProps(id, createDefaultWheelProps());
    },
    [isHost, state.widgets, updateWidgetProps]
  );

  const drawLottery = useCallback(
    (id: string) => {
      if (!isHost) return;
      const widget = state.widgets.find((w) => w.id === id);
      if (!widget || widget.type !== "lottery") return;
      const props = widget.props as import("@/lib/live-overlays/types").LiveOverlayLotteryProps;
      const pool = props.entries.map((e) => e.trim()).filter(Boolean);
      if (!pool.length || props.drawing) return;
      updateWidgetProps(id, { ...props, drawing: true, winner: null });
      window.setTimeout(() => {
        const latest = stateRef.current.widgets.find((w) => w.id === id);
        if (!latest || latest.type !== "lottery") return;
        const latestProps = latest.props as import("@/lib/live-overlays/types").LiveOverlayLotteryProps;
        const winner = pool[Math.floor(Math.random() * pool.length)];
        const nextEntries = latestProps.removeWinner
          ? latestProps.entries.filter((e) => e.trim() !== winner)
          : latestProps.entries;
        updateWidgetProps(id, {
          ...latestProps,
          drawing: false,
          winner,
          entries: nextEntries,
          history: [winner, ...latestProps.history].slice(0, 20),
        });
      }, 1800);
    },
    [isHost, state.widgets, updateWidgetProps]
  );

  const startQuiz = useCallback(
    (id: string) => {
      if (!isHost) return;
      const widget = stateRef.current.widgets.find((w) => w.id === id);
      if (!widget || widget.type !== "quiz") return;
      const props = widget.props as import("@/lib/live-overlays/types").LiveOverlayQuizProps;
      updateWidgetProps(id, {
        ...props,
        phase: "active",
        timeLeft: props.durationSec,
        answeredIds: [],
        lastWinner: null,
      });
    },
    [isHost, updateWidgetProps]
  );

  const revealQuiz = useCallback(
    (id: string) => {
      if (!isHost) return;
      const widget = stateRef.current.widgets.find((w) => w.id === id);
      if (!widget || widget.type !== "quiz") return;
      const props = widget.props as import("@/lib/live-overlays/types").LiveOverlayQuizProps;
      updateWidgetProps(id, { ...props, phase: "reveal", timeLeft: 0 });
    },
    [isHost, updateWidgetProps]
  );

  const resetQuizRound = useCallback(
    (id: string) => {
      if (!isHost) return;
      const widget = stateRef.current.widgets.find((w) => w.id === id);
      if (!widget || widget.type !== "quiz") return;
      const props = widget.props as import("@/lib/live-overlays/types").LiveOverlayQuizProps;
      updateWidgetProps(id, {
        ...props,
        phase: "idle",
        timeLeft: 0,
        answeredIds: [],
        lastWinner: null,
      });
    },
    [isHost, updateWidgetProps]
  );

  const clearQuizScores = useCallback(
    (id: string) => {
      if (!isHost) return;
      const widget = stateRef.current.widgets.find((w) => w.id === id);
      if (!widget || widget.type !== "quiz") return;
      const props = widget.props as import("@/lib/live-overlays/types").LiveOverlayQuizProps;
      updateWidgetProps(id, { ...props, scores: [] });
    },
    [isHost, updateWidgetProps]
  );

  const startWordGuess = useCallback(
    (id: string) => {
      if (!isHost) return;
      const widget = stateRef.current.widgets.find((w) => w.id === id);
      if (!widget || widget.type !== "wordGuess") return;
      const props = widget.props as import("@/lib/live-overlays/types").LiveOverlayWordGuessProps;
      updateWidgetProps(id, {
        ...props,
        phase: "active",
        timeLeft: props.durationSec,
        winner: null,
        recentGuesses: [],
      });
    },
    [isHost, updateWidgetProps]
  );

  const revealWordGuess = useCallback(
    (id: string) => {
      if (!isHost) return;
      const widget = stateRef.current.widgets.find((w) => w.id === id);
      if (!widget || widget.type !== "wordGuess") return;
      const props = widget.props as import("@/lib/live-overlays/types").LiveOverlayWordGuessProps;
      updateWidgetProps(id, { ...props, phase: "reveal", timeLeft: 0 });
    },
    [isHost, updateWidgetProps]
  );

  const resetWordGuessRound = useCallback(
    (id: string) => {
      if (!isHost) return;
      const widget = stateRef.current.widgets.find((w) => w.id === id);
      if (!widget || widget.type !== "wordGuess") return;
      const props = widget.props as import("@/lib/live-overlays/types").LiveOverlayWordGuessProps;
      updateWidgetProps(id, {
        ...props,
        phase: "idle",
        timeLeft: 0,
        winner: null,
        recentGuesses: [],
      });
    },
    [isHost, updateWidgetProps]
  );

  const startChosungQuiz = useCallback(
    (id: string) => {
      if (!isHost) return;
      const widget = stateRef.current.widgets.find((w) => w.id === id);
      if (!widget || widget.type !== "chosungQuiz") return;
      const props = widget.props as import("@/lib/live-overlays/types").LiveOverlayChosungQuizProps;
      updateWidgetProps(id, {
        ...props,
        phase: "active",
        timeLeft: props.durationSec,
        winner: null,
        recentGuesses: [],
      });
    },
    [isHost, updateWidgetProps]
  );

  const revealChosungQuiz = useCallback(
    (id: string) => {
      if (!isHost) return;
      const widget = stateRef.current.widgets.find((w) => w.id === id);
      if (!widget || widget.type !== "chosungQuiz") return;
      const props = widget.props as import("@/lib/live-overlays/types").LiveOverlayChosungQuizProps;
      updateWidgetProps(id, { ...props, phase: "reveal", timeLeft: 0 });
    },
    [isHost, updateWidgetProps]
  );

  const resetChosungQuizRound = useCallback(
    (id: string) => {
      if (!isHost) return;
      const widget = stateRef.current.widgets.find((w) => w.id === id);
      if (!widget || widget.type !== "chosungQuiz") return;
      const props = widget.props as import("@/lib/live-overlays/types").LiveOverlayChosungQuizProps;
      updateWidgetProps(id, {
        ...props,
        phase: "idle",
        timeLeft: 0,
        winner: null,
        recentGuesses: [],
      });
    },
    [isHost, updateWidgetProps]
  );

  const clearChosungQuizScores = useCallback(
    (id: string) => {
      if (!isHost) return;
      const widget = stateRef.current.widgets.find((w) => w.id === id);
      if (!widget || widget.type !== "chosungQuiz") return;
      const props = widget.props as import("@/lib/live-overlays/types").LiveOverlayChosungQuizProps;
      updateWidgetProps(id, { ...props, scores: [] });
    },
    [isHost, updateWidgetProps]
  );

  return {
    state,
    selectedId,
    setSelectedId,
    isHost,
    connected,
    addWidget,
    updateWidget,
    updateWidgetProps,
    removeWidget,
    spinWheel,
    resetWheel,
    drawLottery,
    startQuiz,
    revealQuiz,
    resetQuizRound,
    clearQuizScores,
    startWordGuess,
    revealWordGuess,
    resetWordGuessRound,
    startChosungQuiz,
    revealChosungQuiz,
    resetChosungQuizRound,
    clearChosungQuizScores,
  };
}
