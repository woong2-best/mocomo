"use client";

import { useLiveR18Gate } from "@/hooks/use-live-r18-gate";
import { LiveR18BlockedDialog } from "@/components/live/live-r18-blocked-dialog";
import type { LiveFolderFilter } from "@/components/live/live-folder-rail";
import { isR18LiveCategory } from "@/lib/live-categories";
import { cn } from "@/lib/utils";

const TABS: {
  id: LiveFolderFilter;
  full: string;
  short: string;
  edge: "left" | "middle" | "right";
}[] = [
  { id: "ALL", full: "ALL", short: "ALL", edge: "left" },
  { id: "FOLLOWING", full: "FOLLOW", short: "FOL", edge: "middle" },
  { id: "GAME", full: "GAME", short: "GAME", edge: "middle" },
  { id: "JUST_CHATTING", full: "CHAT", short: "CHAT", edge: "middle" },
  { id: "IRL", full: "FESTIVAL", short: "FES", edge: "middle" },
  { id: "MUSIC", full: "MUSIC", short: "MUS", edge: "middle" },
  { id: "LIVE", full: "R-18", short: "R-18", edge: "right" },
];

export function LiveHubTabBar({
  active,
  onChange,
}: {
  active: LiveFolderFilter;
  onChange: (id: LiveFolderFilter) => void;
}) {
  const { blockedOpen, setBlockedOpen, guardCategoryNav, checking } = useLiveR18Gate();

  async function select(id: LiveFolderFilter) {
    if (checking) return;
    if (isR18LiveCategory(id)) {
      const ok = await guardCategoryNav(id);
      if (!ok) return;
    }
    onChange(id);
  }

  return (
    <>
      <div className="live-hub-tab-bar" role="tablist" aria-label="라이브 카테고리">
        {TABS.map((tab) => {
          const on = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={on}
              className={cn("live-hub-tab", tab.edge, on && "active")}
              onClick={() => void select(tab.id)}
            >
              <span>{on ? tab.full : tab.short}</span>
            </button>
          );
        })}
      </div>
      <LiveR18BlockedDialog open={blockedOpen} onOpenChange={setBlockedOpen} />
    </>
  );
}
