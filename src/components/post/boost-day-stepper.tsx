"use client";

import { useCallback, useEffect, useRef } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const HOLD_DELAY_MS = 400;
const HOLD_REPEAT_MS = 90;

export function BoostDayStepper({
  value,
  onChange,
  maxDays,
  minDays = 0,
  label,
  addLabel,
  removeLabel,
}: {
  value: number;
  onChange: (days: number) => void;
  maxDays: number;
  minDays?: number;
  label?: string;
  addLabel: string;
  removeLabel: string;
}) {
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const timersRef = useRef<{ delay?: number; interval?: number }>({});

  const clamp = useCallback(
    (next: number) => Math.min(maxDays, Math.max(minDays, next)),
    [maxDays, minDays]
  );

  const step = useCallback(
    (dir: 1 | -1) => {
      const next = clamp(valueRef.current + dir);
      if (next === valueRef.current) return;
      onChangeRef.current(next);
    },
    [clamp]
  );

  const stop = useCallback(() => {
    window.clearTimeout(timersRef.current.delay);
    window.clearInterval(timersRef.current.interval);
    timersRef.current = {};
  }, []);

  const start = useCallback(
    (dir: 1 | -1) => {
      stop();
      step(dir);
      timersRef.current.delay = window.setTimeout(() => {
        timersRef.current.interval = window.setInterval(() => step(dir), HOLD_REPEAT_MS);
      }, HOLD_DELAY_MS);
    },
    [step, stop]
  );

  useEffect(() => stop, [stop]);

  function bindHold(dir: 1 | -1) {
    return {
      onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        start(dir);
      },
      onPointerUp: stop,
      onPointerCancel: stop,
    };
  }

  const atMin = value <= minDays;
  const atMax = value >= maxDays;

  return (
    <div className="space-y-2">
      {label ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 px-3 py-2.5">
        <p className="min-w-0 text-2xl font-bold tabular-nums tracking-tight text-folk-cobalt">
          {value}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <HoldButton
            label={removeLabel}
            disabled={atMin}
            {...bindHold(-1)}
          >
            <Minus className="h-4 w-4" />
          </HoldButton>
          <HoldButton
            label={addLabel}
            disabled={atMax}
            {...bindHold(1)}
          >
            <Plus className="h-4 w-4" />
          </HoldButton>
        </div>
      </div>
    </div>
  );
}

function HoldButton({
  label,
  disabled,
  children,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
}: {
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
  onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-folk-cobalt/30 bg-background text-folk-cobalt",
        "select-none touch-none transition-colors",
        "hover:bg-folk-cobalt/10 active:scale-95",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
      )}
    >
      {children}
    </button>
  );
}
