"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const ITEM_H = 40;
const VISIBLE = 5;
const PADDING = Math.floor(VISIBLE / 2) * ITEM_H;

type AppleWheelPickerProps<T extends string | number> = {
  items: readonly T[];
  value: T;
  onChange: (value: T) => void;
  format?: (value: T) => string;
  className?: string;
  disabled?: boolean;
};

export function AppleWheelPicker<T extends string | number>({
  items,
  value,
  onChange,
  format = (v) => String(v),
  className,
  disabled,
}: AppleWheelPickerProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  const scrollEndTimer = useRef<number | null>(null);
  const userScrolling = useRef(false);

  const index = Math.max(0, items.indexOf(value));

  const scrollToIndex = useCallback((i: number, smooth = false) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: i * ITEM_H, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const pickIndex = useCallback(
    (rawIndex: number, snap = false) => {
      if (items.length === 0) return;
      const clamped = Math.max(0, Math.min(items.length - 1, rawIndex));
      if (snap) scrollToIndex(clamped);
      const next = items[clamped];
      if (next !== valueRef.current) {
        valueRef.current = next;
        onChange(next);
      }
    },
    [items, onChange, scrollToIndex]
  );

  useEffect(() => {
    valueRef.current = value;
    if (!userScrolling.current) scrollToIndex(index);
  }, [index, value, scrollToIndex]);

  const onScroll = useCallback(() => {
    userScrolling.current = true;
    const el = ref.current;
    if (!el) return;
    const i = Math.round(el.scrollTop / ITEM_H);
    pickIndex(i, false);

    if (scrollEndTimer.current != null) window.clearTimeout(scrollEndTimer.current);
    scrollEndTimer.current = window.setTimeout(() => {
      userScrolling.current = false;
      const current = ref.current;
      if (!current) return;
      const snapped = Math.round(current.scrollTop / ITEM_H);
      pickIndex(snapped, true);
    }, 100);
  }, [pickIndex]);

  useEffect(() => {
    return () => {
      if (scrollEndTimer.current != null) window.clearTimeout(scrollEndTimer.current);
    };
  }, []);

  return (
    <div className={cn("relative flex-1 min-w-[52px]", className)} style={{ height: ITEM_H * VISIBLE }}>
      <div
        className="pointer-events-none absolute inset-x-0.5 top-1/2 -translate-y-1/2 h-10 rounded-[10px] bg-folk-terracotta/15 border border-folk-terracotta/35"
        aria-hidden
      />
      <div
        ref={ref}
        className={cn(
          "h-full overflow-y-auto overscroll-contain scrollbar-none snap-y snap-mandatory touch-pan-y",
          disabled && "pointer-events-none opacity-50"
        )}
        style={{
          paddingTop: PADDING,
          paddingBottom: PADDING,
          WebkitOverflowScrolling: "touch",
        }}
        onScroll={onScroll}
      >
        {items.map((item, i) => {
          const selected = item === value;
          const dist = Math.abs(i - index);
          return (
            <div
              key={String(item)}
              role="option"
              aria-selected={selected}
              className={cn(
                "flex h-10 snap-center items-center justify-center tabular-nums transition-all duration-150 select-none",
                selected
                  ? "text-base font-semibold text-foreground"
                  : dist === 1
                    ? "text-sm text-muted-foreground/80"
                    : "text-xs text-muted-foreground/45"
              )}
            >
              {format(item)}
            </div>
          );
        })}
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-card via-card/80 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card via-card/80 to-transparent"
        aria-hidden
      />
    </div>
  );
}
