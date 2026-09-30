"use client";

import type { LiveFolderFilter } from "@/components/live/live-folder-rail";
import { cn } from "@/lib/utils";

const TABS: {
  id: LiveFolderFilter;
  label: string;
  neon: string;
}[] = [
  { id: "ALL", label: "ALL", neon: "live-neon-tab--chrome" },
  { id: "FOLLOWING", label: "FOLLOW", neon: "live-neon-tab--orange" },
  { id: "GAME", label: "GAME", neon: "live-neon-tab--blue" },
  { id: "JUST_CHATTING", label: "JUST CHAT", neon: "live-neon-tab--green" },
  { id: "IRL", label: "FESTIVAL", neon: "live-neon-tab--purple" },
  { id: "MUSIC", label: "MUSIC", neon: "live-neon-tab--mint" },
  { id: "LIVE", label: "R-18", neon: "live-neon-tab--red" },
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
      className={cn(
        "live-hub-neon-tabs w-full min-w-0",
        disabled && "opacity-70 pointer-events-none"
      )}
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
            aria-label={tab.label}
            disabled={disabled}
            className={cn("live-neon-tab", tab.neon, on && "live-neon-tab--active")}
            onClick={() => onSelect(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
