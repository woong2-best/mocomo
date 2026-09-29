"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { LiveFolderFilter } from "@/components/live/live-folder-rail";
import { cn } from "@/lib/utils";

const BAR_H = 46;
const GLOW_PAD = 8;
const SLANT = (22 * Math.PI) / 180;
const SHIFT = BAR_H * Math.tan(SLANT);

const TABS: { id: LiveFolderFilter; full: string; short: string }[] = [
  { id: "ALL", full: "ALL", short: "ALL" },
  { id: "FOLLOWING", full: "FOLLOW", short: "FOL" },
  { id: "GAME", full: "GAME", short: "GAME" },
  { id: "JUST_CHATTING", full: "CHAT", short: "CHAT" },
  { id: "IRL", full: "FESTIVAL", short: "FES" },
  { id: "MUSIC", full: "MUSIC", short: "MUS" },
  { id: "LIVE", full: "R-18", short: "R-18" },
];

type Slot = {
  id: LiveFolderFilter;
  full: string;
  short: string;
  points: string;
  left: number;
  topW: number;
  labelShift: number;
};

function buildSlots(width: number, active: LiveFolderFilter): Slot[] {
  if (width <= 0) return [];
  const last = TABS.length - 1;
  const weights = TABS.map((tab) => (tab.id === active ? 1.45 : 1));
  const weightSum = weights.reduce((sum, n) => sum + n, 0);
  const minTop = width / weightSum;
  const shift = Math.min(SHIFT, minTop * 0.42);
  let x = 0;

  return TABS.map((tab, index) => {
    const topW = index === last ? width - x : (width * weights[index]) / weightSum;
    const left = x;
    const right = left + topW;
    x = right;
    const bottomLeft = index === 0 ? 0 : left - shift;
    const bottomRight = index === last ? width : right - shift;
    const top = GLOW_PAD;
    const bottom = GLOW_PAD + BAR_H;
    const points = `${left},${top} ${right},${top} ${bottomRight},${bottom} ${bottomLeft},${bottom}`;
    const labelShift = index === 0 || index === last ? -shift / 4 : -shift / 2;
    return {
      id: tab.id,
      full: tab.full,
      short: tab.short,
      points,
      left,
      topW,
      labelShift,
    };
  });
}

export function LiveHubSlantTabs({
  active,
  onSelect,
  disabled,
}: {
  active: LiveFolderFilter;
  onSelect: (id: LiveFolderFilter) => void;
  disabled?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const slots = useMemo(() => buildSlots(width, active), [width, active]);
  const ordered = useMemo(() => {
    const idle = slots.filter((slot) => slot.id !== active);
    const on = slots.find((slot) => slot.id === active);
    return on ? [...idle, on] : slots;
  }, [slots, active]);

  return (
    <div
      ref={wrapRef}
      className={cn("live-hub-slant-tabs relative w-full min-w-0", disabled && "opacity-70")}
      role="tablist"
      aria-label="라이브 카테고리"
      style={{ height: BAR_H + GLOW_PAD * 2 }}
    >
      {width > 0 ? (
        <svg
          width={width}
          height={BAR_H + GLOW_PAD * 2}
          className="pointer-events-none absolute inset-0"
          aria-hidden
        >
          {slots
            .filter((slot) => slot.id === active)
            .map((slot) => (
              <polygon
                key={`${slot.id}-glow`}
                points={slot.points}
                fill="#1a6aff"
                fillOpacity={0.28}
                stroke="#1a6aff"
                strokeWidth={10}
                strokeOpacity={0.95}
                strokeLinejoin="round"
              />
            ))}
          {ordered.map((slot) => {
            const on = slot.id === active;
            return (
              <polygon
                key={slot.id}
                points={slot.points}
                fill={on ? "#000000" : "#0a0a0a"}
                stroke={on ? "#4da3ff" : "#8A8A8A"}
                strokeWidth={on ? 2.6 : 1.25}
                strokeLinejoin="miter"
              />
            );
          })}
        </svg>
      ) : null}
      {slots.map((slot) => {
        const on = slot.id === active;
        return (
          <button
            key={slot.id}
            type="button"
            role="tab"
            aria-selected={on}
            disabled={disabled}
            className="absolute top-2 flex items-center justify-center bg-transparent p-0 font-[800] text-[12px] tracking-[0.3px] text-white uppercase"
            style={{
              left: slot.left,
              width: slot.topW,
              height: BAR_H,
              transform: `translateX(${slot.labelShift}px)`,
              textShadow: on ? "0 0 8px #1a6aff" : undefined,
            }}
            onClick={() => onSelect(slot.id)}
          >
            {on ? slot.full : slot.short}
          </button>
        );
      })}
    </div>
  );
}
