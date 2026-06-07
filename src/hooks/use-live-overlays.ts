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
import { createDefaultWheelProps } from "@/lib/live-overlays/wheel-theme";
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
    }
  }, [applyState, channelId, isHost]);

  useEffect(() => {
    return subscribeLiveOverlayState(socket, (payload) => {
      if (payload.channelId !== channelId) return;
      if (isHost && payload.state.version <= hostVersionRef.current) return;
      setState(normalizeOverlayState(payload.state));
    });
  }, [channelId, isHost, socket]);

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
      const next = bumpState(
        state,
        state.widgets.map((w) => (w.id === id ? { ...w, props } : w))
      );
      applyState(next, true);
    },
    [applyState, isHost, state]
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
      const widget = state.widgets.find((w) => w.id === id);
      if (!widget || widget.type !== "wheel") return;
      const props = widget.props as import("@/lib/live-overlays/types").LiveOverlayWheelProps;
      if (props.spinning) return;
      const { index, label } = pickWeightedSegment(props.segments);
      const segCount = Math.max(1, props.segments.length);
      const segAngle = 360 / segCount;
      const extra = 360 * (4 + Math.floor(Math.random() * 3));
      const target = props.rotation + extra + (segCount - index) * segAngle - segAngle / 2;
      const spinningProps = { ...props, spinning: true };
      updateWidgetProps(id, spinningProps);
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
      }, 4200);
    },
    [isHost, state.widgets, updateWidgetProps]
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
  };
}
