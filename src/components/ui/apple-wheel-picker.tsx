"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const ITEM_H = 36;
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
  const index = Math.max(0, items.indexOf(value));
  const scrolling = useRef(false);

  const scrollToIndex = useCallback(
    (i: number, smooth = false) => {
      const el = ref.current;
      if (!el) return;
      el.scrollTo({ top: i * ITEM_H, behavior: smooth ? "smooth" : "auto" });
    },
    []
  );

  useEffect(() => {
    if (scrolling.current) return;
    scrollToIndex(index);
  }, [index, scrollToIndex]);

  function snapToNearest() {
    const el = ref.current;
    if (!el || items.length === 0) return;
    const i = Math.round(el.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(items.length - 1, i));
    scrollToIndex(clamped);
    if (items[clamped] !== value) onChange(items[clamped]);
  }

  return (
    <div className={cn("relative h-[180px] flex-1 min-w-0", className)}>
      <div
        className="pointer-events-none absolute inset-x-1 top-1/2 -translate-y-1/2 h-9 rounded-lg bg-white/10 border border-white/10"
        aria-hidden
      />
      <div
        ref={ref}
        className={cn(
          "h-full overflow-y-auto overscroll-contain scrollbar-none snap-y snap-mandatory",
          disabled && "pointer-events-none opacity-50"
        )}
        style={{
          paddingTop: PADDING,
          paddingBottom: PADDING,
          WebkitOverflowScrolling: "touch",
        }}
        onScroll={() => {
          scrolling.current = true;
        }}
        onTouchEnd={() => {
          scrolling.current = false;
          snapToNearest();
        }}
        onMouseUp={() => {
          scrolling.current = false;
          snapToNearest();
        }}
        onWheel={() => {
          window.setTimeout(() => {
            scrolling.current = false;
            snapToNearest();
          }, 80);
        }}
      >
        {items.map((item, i) => {
          const selected = item === value;
          return (
            <button
              key={String(item)}
              type="button"
              tabIndex={-1}
              className={cn(
                "flex h-9 w-full snap-center items-center justify-center text-sm transition-all",
                selected
                  ? "font-semibold text-foreground scale-105"
                  : "text-muted-foreground/70 scale-95"
              )}
              onClick={() => {
                onChange(item);
                scrollToIndex(i, true);
              }}
            >
              {format(item)}
            </button>
          );
        })}
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-card to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent"
        aria-hidden
      />
    </div>
  );
}
