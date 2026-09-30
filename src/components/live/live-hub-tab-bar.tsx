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
import { LiveHubSlantTabs } from "@/components/live/live-hub-slant-tabs";
import { LiveHubNeonDivider } from "@/components/live/live-hub-neon-divider";
import { LiveHubCrtMini } from "@/components/live/live-hub-crt-mini";

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
        Live
      </Link>
      <Link href={studioHref} className="live-hub-action-studio">
        <MonitorPlay className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Studio
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
      <div className="live-hub-chrome">
        <div className="live-hub-toolbar live-hub-toolbar-split">
          <div className="live-hub-tab-bar live-hub-tab-bar-left live-hub-tab-bar-inset">
            <LiveHubSlantTabs active={active} onSelect={(id) => void select(id)} disabled={checking} />
          </div>
          <LiveHubQuickActions />
        </div>
        <div className="live-hub-rail-block">
          <div className="live-hub-rail-crt-slot">
            <LiveHubCrtMini />
          </div>
          <LiveHubNeonDivider />
        </div>
      </div>
      <LiveR18BlockedDialog open={blockedOpen} onOpenChange={setBlockedOpen} />
    </>
  );
}
