"use client";

import { Eye, Radio, Settings2 } from "lucide-react";
import { LiveMobilePortraitHost } from "@/components/live/mobile/live-mobile-portrait-host";
import { useLiveMobilePortrait } from "@/hooks/use-live-mobile-portrait";
import { LiveChat } from "@/components/live/live-chat";
import { LiveBrowserStudio } from "@/components/live/live-browser-studio";
import { LiveHostSettings } from "@/components/live/live-host-settings";
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
}) {
  const mobilePortrait = useLiveMobilePortrait();

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
      />
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      <header className="flex flex-wrap items-center gap-2 sm:gap-3 py-2 border-b border-border/60 shrink-0">
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

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-0 lg:gap-3 min-h-0 mt-2">
        <div className="min-w-0 lg:min-h-0">
          <LiveBrowserStudio
            channelId={channelId}
            channelName={channelName}
            onEndStream={onEndStream}
          />
        </div>
        <div className="min-h-[320px] lg:min-h-0 lg:max-h-[calc(100vh-10rem)] border-t lg:border-t-0 lg:border-l border-border/60 pt-3 lg:pt-0 lg:pl-3">
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
