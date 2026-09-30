"use client";

import type { LiveFolderFilter } from "@/components/live/live-folder-rail";
import { cn } from "@/lib/utils";

const TABS: {
  id: LiveFolderFilter;
  full: string;
  short: string;
  neon: string;
}[] = [
  { id: "ALL", full: "ALL", short: "ALL", neon: "live-neon-tab--chrome" },
  { id: "FOLLOWING", full: "FOLLOW", short: "FOL", neon: "live-neon-tab--orange" },
  { id: "GAME", full: "GAME", short: "GAME", neon: "live-neon-tab--blue" },
  { id: "JUST_CHATTING", full: "CHAT", short: "CHAT", neon: "live-neon-tab--green" },
  { id: "IRL", full: "FESTIVAL", short: "FES", neon: "live-neon-tab--purple" },
  { id: "MUSIC", full: "MUSIC", short: "MUS", neon: "live-neon-tab--mint" },
  { id: "LIVE", full: "R-18", short: "R-18", neon: "live-neon-tab--rose" },
];

export function LiveHubSlantTabs({
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
      className={cn("live-hub-neon-tabs w-full min-w-0", disabled && "opacity-70 pointer-events-none")}
      role="tablist"
      aria-label="라이브 카테고리"
    >
      {TABS.map((tab) => {
        const on = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={on}
            disabled={disabled}
            className={cn("live-neon-tab", tab.neon, on && "live-neon-tab--active")}
            onClick={() => onSelect(tab.id)}
          >
            {on ? tab.full : tab.short}
          </button>
        );
      })}
    </div>
  );
}
