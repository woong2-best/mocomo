"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const ITEM_H = 44;
const VISIBLE = 5;
const PADDING = Math.floor(VISIBLE / 2) * ITEM_H;

type AppleWheelPickerProps<T extends string | number> = {
  items: readonly T[];
  value: T;
  onChange: (value: T) => void;
  format?: (value: T) => string;
  className?: string;
  disabled?: boolean;
  label?: string;
};

export function AppleWheelPicker<T extends string | number>({
  items,
  value,
  onChange,
  format = (v) => String(v),
  className,
  disabled,
  label,
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
      if (snap) scrollToIndex(clamped, true);
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
      pickIndex(Math.round(current.scrollTop / ITEM_H), true);
    }, 90);
  }, [pickIndex]);

  useEffect(() => {
    return () => {
      if (scrollEndTimer.current != null) window.clearTimeout(scrollEndTimer.current);
    };
  }, []);

  return (
    <div
      className={cn("relative shrink-0 w-[88px]", className)}
      style={{ height: ITEM_H * VISIBLE }}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      {label ? (
        <p className="absolute -top-5 inset-x-0 text-center text-[10px] font-medium text-muted-foreground">
          {label}
        </p>
      ) : null}
      <div
        className="pointer-events-none absolute inset-x-1 top-1/2 -translate-y-1/2 h-11 rounded-xl bg-folk-terracotta/12 border border-folk-terracotta/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
        aria-hidden
      />
      <div
        ref={ref}
        className={cn(
          "h-full w-full overflow-y-auto overflow-x-hidden overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-y snap-mandatory",
          disabled && "pointer-events-none opacity-50"
        )}
        style={{
          paddingTop: PADDING,
          paddingBottom: PADDING,
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
        }}
        onScroll={onScroll}
        onWheel={(e) => e.stopPropagation()}
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
                "flex h-11 snap-center items-center justify-center tabular-nums select-none transition-all duration-100",
                selected
                  ? "text-xl font-semibold text-foreground"
                  : dist === 1
                    ? "text-base text-muted-foreground/75"
                    : "text-sm text-muted-foreground/40"
              )}
            >
              {format(item)}
            </div>
          );
        })}
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-card via-card/90 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card via-card/90 to-transparent"
        aria-hidden
      />
    </div>
  );
}
