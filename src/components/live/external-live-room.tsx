"use client";

import { useEffect, useState } from "react";
import { ExternalLivePlayer } from "@/components/live/external-live-player";
import { ExternalLiveStreamInfo } from "@/components/live/external-live-stream-info";
import { LiveChat } from "@/components/live/live-chat";
import { LiveChatProvider, useLiveChatOptional } from "@/components/live/live-chat-provider";
import { LiveSupportProvider } from "@/components/live/live-support-provider";
import { LiveDonationBar } from "@/components/live/live-donation-bar";
import { ensureArray } from "@/lib/ensure-array";
import type { LiveExternalProvider } from "@/lib/live-external/types";
import type { LiveStreamCategory, SupportTierLevel } from "@prisma/client";
import { formatUsd } from "@/lib/money";
import { Trophy } from "lucide-react";
import { subscribeLiveEnded } from "@/hooks/use-live-socket";
import { ExternalLiveHostDashboard } from "@/components/live/external-live-host-dashboard";
import { PlatformChatProvider } from "@/components/live/platform-chat-provider";

type Props = {
  channelId: string;
  title: string;
  platformTitle?: string | null;
  platformDescription?: string | null;
  provider: LiveExternalProvider;
  externalId: string;
  embedUrl: string | null;
  watchUrl: string;
  embedSupported: boolean;
  category?: LiveStreamCategory;
  pinnedMessage?: string | null;
  donationGoalKrw?: number | null;
  tipTotalKrw?: number;
  tipRanking?: { username: string; amount: number }[];
  host: {
    id: string;
    username: string;
    image: string | null;
    displayName?: string | null;
    tier?: SupportTierLevel;
    totalSupport?: number;
  };
  currentUserId: string;
  isHost: boolean;
  paymentsEnabled: boolean;
  hostFollowing?: boolean;
  viewerSupportTier?: SupportTierLevel | null;
  viewerSupportTotal?: number;
  onPlatformEnded?: () => void;
};

function ExternalLiveEndWatcher({
  channelId,
  onEnded,
}: {
  channelId: string;
  onEnded?: () => void;
}) {
  const chat = useLiveChatOptional();

  useEffect(() => {
    if (!onEnded) return;
    return subscribeLiveEnded(chat?.socket ?? null, channelId, onEnded);
  }, [chat?.socket, channelId, onEnded]);

  return null;
}

/**
 * External live viewer v2 — Twitch-style grid: embed + metadata | chat sidebar.
 * YouTube · Twitch · Chzzk share the same layout.
 */
export function ExternalLiveRoom({
  channelId,
  title,
  platformTitle,
  platformDescription,
  provider,
  externalId,
  embedUrl,
  watchUrl,
  embedSupported,
  category,
  pinnedMessage,
  donationGoalKrw,
  tipTotalKrw,
  tipRanking,
  host,
  currentUserId,
  isHost,
  paymentsEnabled,
  hostFollowing,
  viewerSupportTier,
  viewerSupportTotal,
  onPlatformEnded,
}: Props) {
  const [viewerCount, setViewerCount] = useState(0);
  const displayTitle = platformTitle?.trim() || title;
  const displayDescription = platformDescription?.trim() || null;
  const ranking = ensureArray<{ username: string; amount: number }>(tipRanking);

  return (
    <LiveChatProvider
      channelId={channelId}
      userId={currentUserId}
      onViewerCount={setViewerCount}
      chatOverlayInitial={false}
    >
      <PlatformChatProvider
        channelId={channelId}
        provider={provider}
        externalId={externalId}
      >
        <ExternalLiveEndWatcher channelId={channelId} onEnded={onPlatformEnded} />
        {isHost ? (
          <ExternalLiveHostDashboard channelId={channelId} provider={provider} />
        ) : null}
        <div className="live-studio-twitch mx-auto w-full max-w-[1400px] space-y-3 px-1 sm:px-0">
        <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[1fr_340px] xl:gap-4">
          <div className="min-w-0">
          <ExternalLivePlayer
            provider={provider}
            embedUrl={embedUrl}
            watchUrl={watchUrl}
            title={displayTitle}
            embedSupported={embedSupported}
            isHost={isHost}
            hostImage={host.image}
            hostUsername={host.username}
            onPlatformEnded={onPlatformEnded}
          />
          <ExternalLiveStreamInfo
            channelId={channelId}
            title={displayTitle}
            description={displayDescription}
            hostUserId={host.id}
            hostUsername={host.username}
            hostDisplayName={host.displayName ?? host.username}
            hostTier={host.tier}
            hostTotalSupport={host.totalSupport}
            isHost={isHost}
            category={category}
            paymentsEnabled={paymentsEnabled}
            hostFollowing={hostFollowing}
          />
          {(donationGoalKrw != null && donationGoalKrw > 0) || (tipTotalKrw ?? 0) > 0 ? (
            <div className="mt-3">
              <LiveDonationBar goalKrw={donationGoalKrw ?? null} totalKrw={tipTotalKrw ?? 0} />
            </div>
          ) : null}
          {ranking.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="flex items-center gap-1 font-medium text-muted-foreground">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                이번 방송 후원 TOP
              </span>
              {ranking.map((t, i) => (
                <span key={`${t.username}-${i}`} className="rounded-full bg-muted px-2 py-0.5">
                  @{t.username} {formatUsd(t.amount)}
                </span>
              ))}
            </div>
          ) : null}
        </div>

          <div className="min-h-[min(70vh,560px)] xl:sticky xl:top-16">
            <LiveSupportProvider
              channelId={channelId}
              isHost={isHost}
              onAlert={() => {
                /* External iframe: no on-video donation overlay */
              }}
            >
              <LiveChat
                channelId={channelId}
                viewerCount={viewerCount}
                isHost={isHost}
                canModerate={isHost}
                hostUserId={host.id}
                hostUsername={host.username}
                hostDisplayName={host.displayName ?? host.username}
                paymentsEnabled={paymentsEnabled}
                viewerSupportTier={viewerSupportTier ?? undefined}
                viewerSupportTotal={viewerSupportTotal}
                pinnedMessage={pinnedMessage}
                externalProvider={provider}
                externalId={externalId}
                variant="external"
              />
            </LiveSupportProvider>
          </div>
        </div>
      </div>
      </PlatformChatProvider>
    </LiveChatProvider>
  );
}
