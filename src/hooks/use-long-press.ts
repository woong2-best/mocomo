"use client";

import { useCallback, useRef, type DragEvent, type MouseEvent, type TouchEvent } from "react";

export const LONG_PRESS_MS = 500;

type LongPressOptions = {
  delay?: number;
  moveThreshold?: number;
  disabled?: boolean;
};

export function useLongPress(onLongPress: () => void, options: LongPressOptions = {}) {
  const delay = options.delay ?? LONG_PRESS_MS;
  const moveThreshold = options.moveThreshold ?? 10;
  const timerRef = useRef<number | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);
  const touchRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    originRef.current = null;
  }, []);

  const start = useCallback(
    (x: number, y: number) => {
      if (options.disabled) return;
      firedRef.current = false;
      originRef.current = { x, y };
      timerRef.current = window.setTimeout(() => {
        firedRef.current = true;
        timerRef.current = null;
        onLongPress();
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate(12);
        }
      }, delay);
    },
    [delay, onLongPress, options.disabled],
  );

  const move = useCallback(
    (x: number, y: number) => {
      if (!originRef.current) return;
      const dx = x - originRef.current.x;
      const dy = y - originRef.current.y;
      if (dx * dx + dy * dy > moveThreshold * moveThreshold) clearTimer();
    },
    [clearTimer, moveThreshold],
  );

  const consumeLongPress = useCallback(() => {
    const fired = firedRef.current;
    firedRef.current = false;
    return fired;
  }, []);

  return {
    consumeLongPress,
    handlers: {
      onTouchStart: (event: TouchEvent) => {
        touchRef.current = true;
        const point = event.touches[0];
        if (point) start(point.clientX, point.clientY);
      },
      onTouchMove: (event: TouchEvent) => {
        const point = event.touches[0];
        if (point) move(point.clientX, point.clientY);
      },
      onTouchEnd: () => {
        clearTimer();
        window.setTimeout(() => {
          touchRef.current = false;
        }, 400);
      },
      onTouchCancel: () => {
        clearTimer();
      },
      onMouseDown: (event: MouseEvent) => {
        if (touchRef.current || event.button !== 0) return;
        start(event.clientX, event.clientY);
      },
      onMouseMove: (event: MouseEvent) => {
        if (touchRef.current) return;
        move(event.clientX, event.clientY);
      },
      onMouseUp: () => {
        if (touchRef.current) {
          touchRef.current = false;
          return;
        }
        clearTimer();
      },
      onMouseLeave: () => {
        if (!touchRef.current) clearTimer();
      },
      onContextMenu: (event: MouseEvent) => {
        event.preventDefault();
      },
      onDragStart: (event: DragEvent) => {
        event.preventDefault();
      },
    },
  };
}
