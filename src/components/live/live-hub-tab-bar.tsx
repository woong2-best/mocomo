"use client";

import { useSession } from "next-auth/react";
import { useLiveR18Gate } from "@/hooks/use-live-r18-gate";
import { LiveR18BlockedDialog } from "@/components/live/live-r18-blocked-dialog";
import type { LiveFolderFilter } from "@/components/live/live-folder-rail";
import { isR18LiveCategory } from "@/lib/live-categories";
import {
  isExternalLiveEnabled,
  isFirstPartyLiveEnabled,
  isLiveFeatureEnabled,
} from "@/lib/live-feature";
import { LiveHubNeonTabStrip } from "@/components/live/live-hub-neon-tab-strip";
import { LiveHubStudioButton } from "@/components/live/live-hub-studio-button";
import { LiveHubLiveButton } from "@/components/live/live-hub-live-button";

function useLiveHubActionHrefs() {
  const sessionState = useSession();
  const session = sessionState?.data;
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

  return { liveHref, studioHref, showActions: isLiveFeatureEnabled() };
}

export function LiveHubTabBar({
  active,
  onChange,
}: {
  active: LiveFolderFilter;
  onChange: (id: LiveFolderFilter) => void;
}) {
  const { blockedOpen, setBlockedOpen, guardCategoryNav, checking } = useLiveR18Gate();
  const { liveHref, studioHref, showActions } = useLiveHubActionHrefs();

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
        <div className="live-hub-toolbar-row">
          {showActions ? <LiveHubStudioButton href={studioHref} /> : null}
          <LiveHubNeonTabStrip active={active} onSelect={(id) => void select(id)} disabled={checking} />
          {showActions ? <LiveHubLiveButton href={liveHref} /> : null}
        </div>
      </div>
      <LiveR18BlockedDialog open={blockedOpen} onOpenChange={setBlockedOpen} />
    </>
  );
}
