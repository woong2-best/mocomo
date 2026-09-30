"use client";

import type { LiveFolderFilter } from "@/components/live/live-folder-rail";
import { cn } from "@/lib/utils";

/** Design reference width — strip scales to fit the content column (no horizontal scroll). */
export const LIVE_NEON_TABS_DESIGN_WIDTH = 1680;
const VIEWBOX_WIDTH = 2576;
const VIEWBOX_X0 = 32;

const TABS: {
  id: LiveFolderFilter;
  label: string;
  x: number;
  w: number;
}[] = [
  { id: "ALL", label: "ALL", x: 480, w: 230 },
  { id: "FOLLOWING", label: "FOLLOW", x: 714, w: 236 },
  { id: "GAME", label: "GAME", x: 954, w: 243 },
  { id: "JUST_CHATTING", label: "CHAT", x: 1201, w: 238 },
  { id: "IRL", label: "FESTIVAL", x: 1443, w: 243 },
  { id: "MUSIC", label: "MUSIC", x: 1690, w: 236 },
  { id: "LIVE", label: "R-18", x: 1930, w: 230 },
];

function tabStyle(x: number, w: number) {
  const leftPct = ((x - VIEWBOX_X0) / VIEWBOX_WIDTH) * 100;
  const widthPct = (w / VIEWBOX_WIDTH) * 100;
  return { left: `${leftPct}%`, width: `${widthPct}%` };
}

export function LiveHubNeonTabStrip({
  active,
  onSelect,
  disabled,
}: {
  active: LiveFolderFilter;
  onSelect: (id: LiveFolderFilter) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "live-hub-neon-tabs-scroll min-w-0 w-full",
        disabled && "pointer-events-none opacity-70"
      )}
    >
      <div className="live-hub-neon-tabs-strip w-full" role="tablist" aria-label="라이브 카테고리">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/live/live-hub-neon-tabs.svg?v=2"
          alt=""
          className="live-hub-neon-tabs-art pointer-events-none select-none"
          width={LIVE_NEON_TABS_DESIGN_WIDTH}
          height={234}
          draggable={false}
        />
        {TABS.map((tab) => {
          const on = tab.id === active;
          const pos = tabStyle(tab.x, tab.w);
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={tab.label}
              disabled={disabled}
              className={cn("live-hub-neon-tab-hit", on && "live-hub-neon-tab-hit--active")}
              style={pos}
              onClick={() => onSelect(tab.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
