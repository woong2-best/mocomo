"use client";

import { Eye, Radio, Settings2 } from "lucide-react";
import { LiveMobilePortraitHost } from "@/components/live/mobile/live-mobile-portrait-host";
import { useLiveMobilePortrait } from "@/hooks/use-live-mobile-portrait";
import { LiveChat } from "@/components/live/live-chat";
import { LiveBrowserStudio } from "@/components/live/live-browser-studio";
import { LiveHostSettings } from "@/components/live/live-host-settings";
import { useLiveCollabState } from "@/hooks/use-live-collab-state";
import { liveCategoryLabel } from "@/lib/live-categories";
import { ensureStringArray } from "@/lib/ensure-array";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { LiveStreamCategory, SupportTierLevel } from "@prisma/client";

/** 호스트 스튜디오 — 브라우저 송출 + 채팅 + 설정 */
export function LiveHostStudioShell({
  channelId,
  channelName,
  viewerCount,
  onViewerCount,
  onEndStream,
  category,
  slowModeSeconds,
  chatBannedWords,
  collabPassword,
}: {
  channelId: string;
  channelName: string;
  hostUserId: string;
  hostUsername?: string;
  hostDisplayName?: string;
  hostTier?: SupportTierLevel;
  hostTotalSupport?: number;
  viewerCount: number;
  onViewerCount?: (n: number) => void;
  onEndStream: () => void;
  category?: LiveStreamCategory;
  donationGoalKrw?: number | null;
  tipTotalKrw?: number;
  tipRanking?: { username: string; amount: number }[];
  slowModeSeconds?: number;
  chatBannedWords?: string[];
  paymentsEnabled?: boolean;
  collabPassword?: string | null;
}) {
  const mobilePortrait = useLiveMobilePortrait();
  const collab = useLiveCollabState(channelId);
  const coHostLabel =
    collab.coHost?.name ?? collab.coHost?.username ?? undefined;

  if (mobilePortrait) {
    return (
      <LiveMobilePortraitHost
        channelId={channelId}
        channelName={channelName}
        viewerCount={viewerCount}
        onViewerCount={onViewerCount}
        onEndStream={onEndStream}
        category={category}
        slowModeSeconds={slowModeSeconds}
        chatBannedWords={chatBannedWords}
        collabPassword={collabPassword}
      />
    );
  }

  return (
    <div className="flex flex-col w-full">
      <header className="flex flex-wrap items-center gap-2 sm:gap-3 py-2 border-b border-border/60 shrink-0 sticky top-0 z-20 bg-background/95 backdrop-blur-sm">
        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground flex items-center gap-1">
          <Radio className="h-3 w-3" />
          스튜디오
        </span>
        {category && (
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted font-medium">
            {liveCategoryLabel(category)}
          </span>
        )}
        <h1 className="text-base sm:text-lg font-bold truncate flex-1 min-w-0">{channelName}</h1>
        <span className="text-sm text-muted-foreground flex items-center gap-1 tabular-nums">
          <Eye className="h-4 w-4" />
          {viewerCount}
        </span>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-xl gap-1">
              <Settings2 className="h-4 w-4" />
              설정
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>방송 설정</DialogTitle>
            </DialogHeader>
            <div className="pt-2 space-y-4">
              <LiveHostSettings
                channelId={channelId}
                slowModeSeconds={slowModeSeconds ?? 0}
                bannedWords={ensureStringArray(chatBannedWords)}
                initialCollabSplit={collab.splitEnabled}
                collabCoHostName={coHostLabel ?? null}
                embedded
              />
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="destructive" size="sm" className="rounded-xl gap-1" onClick={onEndStream}>
          <Radio className="h-4 w-4" />
          방송 종료
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 lg:gap-6 mt-3 items-start">
        <div className="min-w-0 w-full">
          <LiveBrowserStudio
            channelId={channelId}
            channelName={channelName}
            onEndStream={onEndStream}
            collabPassword={collabPassword}
            splitCollab={
              collab.splitActive && collab.coHostUserId
                ? { coHostUserId: collab.coHostUserId, coHostLabel }
                : undefined
            }
          />
        </div>
        <div className="min-h-[360px] lg:sticky lg:top-[3.25rem] lg:max-h-[calc(100vh-5rem)] border border-border/60 rounded-xl overflow-hidden bg-card/30">
          <LiveChat
            channelId={channelId}
            viewerCount={viewerCount}
            onViewerCount={onViewerCount}
            isHost
            canModerate
          />
        </div>
      </div>
    </div>
  );
}
