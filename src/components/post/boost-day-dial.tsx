"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { scrollPortToSelector } from "@/lib/reels/scroll-port";
import { cn } from "@/lib/utils";

const ITEM_PX = 56;

export function BoostDayDial({
  value,
  onChange,
  maxDays,
  label,
  alignKey,
}: {
  value: number;
  onChange: (days: number) => void;
  maxDays: number;
  label?: string;
  alignKey?: string | number | boolean;
}) {
  const portRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const days = useMemo(
    () => Array.from({ length: Math.max(1, maxDays) }, (_, i) => i + 1),
    [maxDays]
  );

  const scrollToDay = useCallback((day: number, behavior: ScrollBehavior = "smooth") => {
    scrollPortToSelector(
      portRef.current,
      `[data-boost-day="${day}"]`,
      "x",
      behavior
    );
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => scrollToDay(value, "auto"));
    // Recenter when the dialog opens or the day list length changes — not on every drag tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- value is read once per align
  }, [alignKey, maxDays, scrollToDay]);

  const syncFromScroll = useCallback(() => {
    const port = portRef.current;
    if (!port) return;
    const items = port.querySelectorAll<HTMLElement>("[data-boost-day]");
    const mid = port.scrollLeft + port.clientWidth / 2;
    let best = value;
    let bestDist = Infinity;
    items.forEach((el) => {
      const day = Number(el.dataset.boostDay);
      if (!Number.isFinite(day)) return;
      const center = el.offsetLeft + el.offsetWidth / 2;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = day;
      }
    });
    if (best !== value) onChange(best);
  }, [onChange, value]);

  useEffect(() => {
    const port = portRef.current;
    if (!port) return;
    let raf = 0;
    const onScroll = () => {
      draggingRef.current = true;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(syncFromScroll);
    };
    const onScrollEnd = () => {
      draggingRef.current = false;
      syncFromScroll();
    };
    port.addEventListener("scroll", onScroll, { passive: true });
    port.addEventListener("scrollend", onScrollEnd as EventListener);
    return () => {
      cancelAnimationFrame(raf);
      port.removeEventListener("scroll", onScroll);
      port.removeEventListener("scrollend", onScrollEnd as EventListener);
    };
  }, [syncFromScroll]);

  useEffect(() => {
    const port = portRef.current;
    if (!port) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      if (Math.abs(e.deltaY) < 4) return;
      e.preventDefault();
      const next = Math.min(maxDays, Math.max(1, value + (e.deltaY > 0 ? 1 : -1)));
      if (next === value) return;
      onChange(next);
      scrollToDay(next);
    };
    port.addEventListener("wheel", onWheel, { passive: false });
    return () => port.removeEventListener("wheel", onWheel);
  }, [maxDays, onChange, scrollToDay, value]);

  return (
    <div className="space-y-2">
      {label ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      ) : null}
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-folk-cream to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-folk-cream to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-folk-cobalt/40 bg-folk-cobalt/10"
        />
        <div
          ref={portRef}
          role="slider"
          aria-label={label}
          aria-valuemin={1}
          aria-valuemax={maxDays}
          aria-valuenow={value}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              e.preventDefault();
              const next = Math.max(1, value - 1);
              onChange(next);
              scrollToDay(next);
            } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              e.preventDefault();
              const next = Math.min(maxDays, value + 1);
              onChange(next);
              scrollToDay(next);
            }
          }}
          className={cn(
            "flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [overflow-anchor:none]",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "outline-none focus-visible:ring-2 focus-visible:ring-folk-cobalt/40"
          )}
          style={{
            paddingInline: `calc(50% - ${ITEM_PX / 2}px)`,
          }}
        >
          {days.map((day) => {
            const active = day === value;
            return (
              <button
                key={day}
                type="button"
                data-boost-day={day}
                onClick={() => {
                  onChange(day);
                  scrollToDay(day);
                }}
                className={cn(
                  "relative z-[1] flex h-14 shrink-0 snap-center items-center justify-center tabular-nums transition-all",
                  active
                    ? "text-xl font-bold text-folk-cobalt"
                    : "text-base font-semibold text-muted-foreground hover:text-foreground"
                )}
                style={{ width: ITEM_PX }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
