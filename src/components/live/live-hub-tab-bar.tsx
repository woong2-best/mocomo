"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { MonitorPlay, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="flex shrink-0 items-center gap-1.5">
      <Link href={liveHref}>
        <Button className="h-9 rounded-xl gap-1.5 px-3 text-xs font-bold shadow-sm" size="sm">
          <Video className="h-3.5 w-3.5 shrink-0" />
          라이브
        </Button>
      </Link>
      <Link href={studioHref}>
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-xl gap-1.5 border-white/25 bg-black/40 px-3 text-xs font-bold text-white hover:bg-black/55 hover:text-white"
        >
          <MonitorPlay className="h-3.5 w-3.5 shrink-0" />
          스튜디오
        </Button>
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
      <div className="live-hub-toolbar">
        <div className="live-hub-tab-bar" role="tablist" aria-label="라이브 카테고리">
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
