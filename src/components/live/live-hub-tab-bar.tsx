"use client";

import { useLiveR18Gate } from "@/hooks/use-live-r18-gate";
import { LiveR18BlockedDialog } from "@/components/live/live-r18-blocked-dialog";
import type { LiveFolderFilter } from "@/components/live/live-folder-rail";
import { isR18LiveCategory } from "@/lib/live-categories";
import { LiveHubNeonTabStrip } from "@/components/live/live-hub-neon-tab-strip";

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
      <div className="live-hub-chrome">
        <div className="live-hub-neon-frame">
          <LiveHubNeonTabStrip active={active} onSelect={(id) => void select(id)} disabled={checking} />
        </div>
      </div>
      <LiveR18BlockedDialog open={blockedOpen} onOpenChange={setBlockedOpen} />
    </>
  );
}
