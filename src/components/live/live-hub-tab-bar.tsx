"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { MonitorPlay, Video } from "lucide-react";
import { useLiveR18Gate } from "@/hooks/use-live-r18-gate";
import { LiveR18BlockedDialog } from "@/components/live/live-r18-blocked-dialog";
import type { LiveFolderFilter } from "@/components/live/live-folder-rail";
import { isR18LiveCategory } from "@/lib/live-categories";
import {
  isExternalLiveEnabled,
  isFirstPartyLiveEnabled,
  isLiveFeatureEnabled,
} from "@/lib/live-feature";
import { cn } from "@/lib/utils";

const TABS: { id: LiveFolderFilter; label: string }[] = [
  { id: "ALL", label: "ALL" },
  { id: "FOLLOWING", label: "FOLLOW" },
  { id: "GAME", label: "GAME" },
  { id: "JUST_CHATTING", label: "CHAT" },
  { id: "IRL", label: "FESTIVAL" },
  { id: "MUSIC", label: "MUSIC" },
  { id: "LIVE", label: "R-18" },
];

function LiveHubQuickActions() {
  const sessionState = useSession();
  const session = sessionState?.data;

  if (!isLiveFeatureEnabled()) return null;

  const externalOn = isExternalLiveEnabled();
  const firstPartyOn = isFirstPartyLiveEnabled();
  const loggedIn = !!session?.user;

  const liveHref = !loggedIn
    ? "/auth/signin?callbackUrl=/live/external/new"
    : externalOn
      ? "/live/external/new"
      : firstPartyOn
        ? "/voice/new"
        : "/live/studio";

  const studioHref = loggedIn ? "/live/studio" : "/auth/signin?callbackUrl=/live/studio";

  return (
    <div className="live-hub-quick-actions flex shrink-0 items-center gap-2">
      <Link href={liveHref} className="live-hub-action-live">
        <Video className="h-3.5 w-3.5 shrink-0" aria-hidden />
        라이브
      </Link>
      <Link href={studioHref} className="live-hub-action-studio">
        <MonitorPlay className="h-3.5 w-3.5 shrink-0" aria-hidden />
        스튜디오
      </Link>
    </div>
  );
}

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
      <div className="live-hub-toolbar live-hub-toolbar-split">
        <div className="live-hub-tab-bar live-hub-tab-bar-left" role="tablist" aria-label="라이브 카테고리">
          {TABS.map((tab) => {
            const on = tab.id === active;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={on}
                className={cn("live-hub-tab", on && "active")}
                onClick={() => void select(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <LiveHubQuickActions />
      </div>
      <LiveR18BlockedDialog open={blockedOpen} onOpenChange={setBlockedOpen} />
    </>
  );
}
