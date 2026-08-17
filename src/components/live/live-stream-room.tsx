"use client";

import { memo } from "react";
import { useSession } from "next-auth/react";
import { LiveBroadcastStudio } from "@/components/live/live-broadcast-studio";
import { LiveViewerPlayer } from "@/components/live/live-viewer-player";
import { LiveChat } from "@/components/live/live-chat";
import { LiveChatProvider } from "@/components/live/live-chat-provider";
import { LiveStudioErrorBoundary } from "@/components/live/live-studio-error-boundary";
import { LiveDonationBar } from "@/components/live/live-donation-bar";
import { LiveHostSettings } from "@/components/live/live-host-settings";
import { TipCreatorDialog } from "@/components/support/tip-creator-dialog";
import { ReportButton } from "@/components/report/report-button";
import { liveCategoryLabel } from "@/lib/live-categories";
import { ensureArray, ensureStringArray } from "@/lib/ensure-array";
import type { LiveStreamCategory, SupportTierLevel } from "@prisma/client";
import { Eye, Users, Radio, Trophy } from "lucide-react";
import Link from "next/link";
import { formatUsd } from "@/lib/money";

function LiveStreamRoomInner({
  channelId,
  channelName,
  hostUserId,
  hostUsername,
  hostDisplayName,
  hostTier,
  hostTotalSupport,
  isHost,
  viewerCount,
  onViewerCount,
  onEndStream,
  category,
  donationGoalKrw,
  tipTotalKrw,
  tipRanking,
  slowModeSeconds,
  chatBannedWords,
  paymentsEnabled,
}: {
  channelId: string;
  channelName: string;
  hostUserId: string;
  hostUsername?: string;
  hostDisplayName?: string;
  hostTier?: SupportTierLevel;
  hostTotalSupport?: number;
  isHost: boolean;
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
  const { data: session } = useSession();

  return (
    <LiveChatProvider
      channelId={channelId}
      userId={session?.user?.id}
      onViewerCount={onViewerCount}
    >
    <div className="live-studio-panel space-y-4 p-3 sm:p-5">
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-4">
        <span className="live-badge text-xs px-3 py-1">
          <Radio className="h-3 w-3" />
          LIVE
        </span>
        {category && (
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted font-medium">
            {liveCategoryLabel(category)}
          </span>
        )}
        {isHost && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
            방송 중 (호스트)
          </span>
        )}
        <h1 className="text-lg sm:text-xl font-bold tracking-tight flex-1 min-w-0 truncate text-foreground">
          {channelName}
        </h1>
        <span className="text-sm text-muted-foreground flex items-center gap-1.5 tabular-nums">
          <Eye className="h-4 w-4 text-folk-terracotta" />
          <strong className="text-foreground">{viewerCount}</strong> 시청
        </span>
        {hostUsername && (
          <Link
            href={`/u/${hostUsername}`}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            <Users className="h-3.5 w-3.5" />@{hostUsername}
          </Link>
        )}
        {!isHost && hostUsername && paymentsEnabled && (
          <TipCreatorDialog
            creatorId={hostUserId}
            username={hostUsername}
            displayName={hostDisplayName ?? hostUsername}
            currentTier={hostTier}
            currentTotal={hostTotalSupport}
            paymentsEnabled={paymentsEnabled}
          />
        )}
        {isHost && (
          <LiveHostSettings
            channelId={channelId}
            slowModeSeconds={slowModeSeconds ?? 0}
            bannedWords={ensureStringArray(chatBannedWords)}
          />
        )}
        <ReportButton
          targetType="LIVE_CHANNEL"
          targetId={channelId}
          reportedUserId={hostUserId}
          label="방송 신고"
          variant="outline"
          size="sm"
        />
      </div>

      <LiveDonationBar goalKrw={donationGoalKrw ?? null} totalKrw={tipTotalKrw ?? 0} />

      {ensureArray(tipRanking).length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="flex items-center gap-1 text-muted-foreground font-medium">
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            이번 방송 후원 TOP
          </span>
          {ensureArray<{ username: string; amount: number }>(tipRanking).map((t, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full bg-muted">
              @{t.username} {formatUsd(t.amount)}
            </span>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_minmax(280px,360px)] gap-4 items-start">
        <LiveStudioErrorBoundary
          channelId={channelId}
          onEndStream={onEndStream}
          inline
          hostObsFallback={isHost}
        >
          <div className="min-w-0 rounded-2xl overflow-hidden ring-1 ring-border/50">
            {isHost ? (
              <LiveBroadcastStudio channelId={channelId} onEndStream={onEndStream} />
            ) : (
              <LiveViewerPlayer channelId={channelId} />
            )}
          </div>
        </LiveStudioErrorBoundary>
        <LiveStudioErrorBoundary channelId={channelId} inline>
          <LiveChat
            channelId={channelId}
            viewerCount={viewerCount}
            onViewerCount={onViewerCount}
            isHost={isHost}
            canModerate={isHost}
          />
        </LiveStudioErrorBoundary>
      </div>
    </div>
    </LiveChatProvider>
  );
}

export const LiveStreamRoom = memo(LiveStreamRoomInner);
