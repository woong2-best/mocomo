"use client";

import { useLiveOverlayContextOptional } from "@/components/live/overlays/live-overlay-context";
import { LiveOverlayWidgetFrame } from "@/components/live/overlays/live-overlay-widget-frame";
import {
  LotteryOverlayWidget,
  TextOverlayWidget,
  WheelOverlayWidget,
} from "@/components/live/overlays/live-overlay-widgets";
import type {
  LiveOverlayLotteryProps,
  LiveOverlayTextProps,
  LiveOverlayWheelProps,
} from "@/lib/live-overlays/types";

/** 미리보기·시청 화면 위 오버레이 (WHIP 스트림과 분리) */
export function LiveOverlayLayer({
  className = "",
  pointerEvents = "none",
}: {
  className?: string;
  pointerEvents?: "none" | "auto";
}) {
  const ctx = useLiveOverlayContextOptional();
  if (!ctx || !ctx.state.widgets.length) return null;

  const { state, selectedId, setSelectedId, isHost, updateWidget, removeWidget } = ctx;
  const sorted = [...state.widgets].sort((a, b) => a.z - b.z);

  return (
    <div
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{ pointerEvents: isHost ? "auto" : pointerEvents }}
      onPointerDown={() => {
        if (isHost) setSelectedId(null);
      }}
    >
      {sorted.map((widget) => (
        <LiveOverlayWidgetFrame
          key={widget.id}
          widget={widget}
          selected={selectedId === widget.id}
          editable={isHost}
          onSelect={() => setSelectedId(widget.id)}
          onChange={(patch) => updateWidget(widget.id, patch)}
          onRemove={() => removeWidget(widget.id)}
        >
          {widget.type === "text" && (
            <TextOverlayWidget props={widget.props as LiveOverlayTextProps} />
          )}
          {widget.type === "wheel" && (
            <WheelOverlayWidget props={widget.props as LiveOverlayWheelProps} />
          )}
          {widget.type === "lottery" && (
            <LotteryOverlayWidget props={widget.props as LiveOverlayLotteryProps} />
          )}
        </LiveOverlayWidgetFrame>
      ))}
    </div>
  );
}
