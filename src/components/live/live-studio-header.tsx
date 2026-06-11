"use client";

import Link from "next/link";
import { Eye, Radio, Trophy, Users } from "lucide-react";
import { LiveDonationBar } from "@/components/live/live-donation-bar";
import { LiveHostSettings } from "@/components/live/live-host-settings";
import { TipCreatorDialog } from "@/components/support/tip-creator-dialog";
import { ReportButton } from "@/components/report/report-button";
import { LiveShareButton } from "@/components/live/live-share-button";
import { LiveRoomFollowButton } from "@/components/live/live-room-follow-button";
import { liveCategoryLabel } from "@/lib/live-categories";
import { ensureArray, ensureStringArray } from "@/lib/ensure-array";
import type { LiveStreamCategory, SupportTierLevel } from "@prisma/client";

export function LiveStudioHeader({
  channelId,
  channelName,
  hostUserId,
  hostUsername,
  hostDisplayName,
  hostTier,
  hostTotalSupport,
  isHost,
  viewerCount,
  category,
  donationGoalKrw,
  tipTotalKrw,
  tipRanking,
  slowModeSeconds,
  chatBannedWords,
  paymentsEnabled,
  hostFollowing,
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
  category?: LiveStreamCategory;
  donationGoalKrw?: number | null;
  tipTotalKrw?: number;
  tipRanking?: { username: string; amount: number }[];
  slowModeSeconds?: number;
  chatBannedWords?: string[];
  paymentsEnabled?: boolean;
  hostFollowing?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="live-badge text-xs px-2.5 py-0.5 flex items-center gap-1 shrink-0">
          <Radio className="h-3 w-3" />
          LIVE
        </span>
        {category && (
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted font-medium shrink-0">
            {liveCategoryLabel(category)}
          </span>
        )}
        {isHost && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
            방송 중
          </span>
        )}
        <h1 className="text-base sm:text-lg font-bold tracking-tight flex-1 min-w-0 truncate">
          {channelName}
        </h1>
        <span className="text-sm text-muted-foreground flex items-center gap-1 tabular-nums shrink-0">
          <Eye className="h-4 w-4 text-folk-terracotta" />
          <strong className="text-foreground">{viewerCount}</strong>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {hostUsername && (
          <Link
            href={`/u/${hostUsername}`}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            <Users className="h-3.5 w-3.5" />@{hostUsername}
          </Link>
        )}
        {!isHost && hostUsername && hostUserId && (
          <LiveRoomFollowButton
            hostUserId={hostUserId}
            hostUsername={hostUsername}
            initialFollowing={!!hostFollowing}
          />
        )}
        <LiveShareButton channelId={channelId} channelName={channelName} />
        {!isHost && hostUsername && paymentsEnabled && (
          <TipCreatorDialog
            creatorId={hostUserId}
            username={hostUsername}
            displayName={hostDisplayName ?? hostUsername}
            currentTier={hostTier}
            currentTotal={hostTotalSupport}
            paymentsEnabled={!!paymentsEnabled}
            channelId={channelId}
            returnPath={`/voice/${channelId}`}
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
            <span key={`${t.username}-${i}`} className="px-2 py-0.5 rounded-full bg-muted">
              @{t.username} {t.amount.toLocaleString()}원
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
