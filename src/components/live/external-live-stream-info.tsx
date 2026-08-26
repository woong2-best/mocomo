"use client";

import Link from "next/link";
import { LiveRoomFollowButton } from "@/components/live/live-room-follow-button";
import { LiveShareButton } from "@/components/live/live-share-button";
import { TipCreatorDialog } from "@/components/support/tip-creator-dialog";
import { ReportButton } from "@/components/report/report-button";
import { liveCategoryLabel } from "@/lib/live-categories";
import type { LiveStreamCategory, SupportTierLevel } from "@prisma/client";

type Props = {
  channelId: string;
  title: string;
  description?: string | null;
  hostUserId: string;
  hostUsername: string;
  hostDisplayName?: string;
  hostTier?: SupportTierLevel;
  hostTotalSupport?: number;
  isHost: boolean;
  category?: LiveStreamCategory;
  paymentsEnabled?: boolean;
  hostFollowing?: boolean;
};

/** Title + description + host row below external embed (v2 mockup). */
export function ExternalLiveStreamInfo({
  channelId,
  title,
  description,
  hostUserId,
  hostUsername,
  hostDisplayName,
  hostTier,
  hostTotalSupport,
  isHost,
  category,
  paymentsEnabled,
  hostFollowing,
}: Props) {
  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {category ? (
            <span className="mb-1.5 inline-block rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {liveCategoryLabel(category)}
            </span>
          ) : null}
          <h1 className="text-lg font-bold leading-snug tracking-tight sm:text-xl">{title}</h1>
          {description?.trim() ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {description.trim()}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
          <p className="text-sm">
            <Link href={`/u/${hostUsername}`} className="font-medium text-primary hover:underline">
              @{hostUsername}
            </Link>
            <span className="text-folk-terracotta"> · 호스트</span>
          </p>
          {!isHost ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <LiveRoomFollowButton
                hostUserId={hostUserId}
                hostUsername={hostUsername}
                initialFollowing={!!hostFollowing}
              />
              <LiveShareButton channelId={channelId} />
              {paymentsEnabled ? (
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
              ) : null}
              <ReportButton
                targetType="LIVE_CHANNEL"
                targetId={channelId}
                reportedUserId={hostUserId}
                label="신고"
                variant="ghost"
                size="sm"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
