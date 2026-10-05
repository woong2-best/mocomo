"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useLocale } from "@/components/providers/locale-provider";
import { useEffect, useState } from "react";
import { ExternalLivePlayer } from "@/components/live/external-live-player";
import { ExternalLiveStreamInfo } from "@/components/live/external-live-stream-info";
import { LiveChat } from "@/components/live/live-chat";
import { LiveChatProvider, useLiveChatOptional } from "@/components/live/live-chat-provider";
import { LiveSupportProvider } from "@/components/live/live-support-provider";
import { LiveDonationBar } from "@/components/live/live-donation-bar";
import { LiveHostDirectorPanel } from "@/components/live/live-host-director-panel";
import { LiveStudioErrorBoundary } from "@/components/live/live-studio-error-boundary";
import { ensureArray } from "@/lib/ensure-array";
import { cn } from "@/lib/utils";
import type { LiveExternalProvider } from "@/lib/live-external/types";
import type { LiveStreamCategory, SupportTierLevel } from "@prisma/client";
import { formatUsd } from "@/lib/money";
import { Trophy } from "lucide-react";
import { subscribeLiveEnded } from "@/hooks/use-live-socket";
import { PlatformChatProvider } from "@/components/live/platform-chat-provider";
import { LiveSupportTipPoll } from "@/components/live/live-support-chat-bridge";

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
  const { t } = useLocale();
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
  const { t } = useLocale();
  const [viewerCount, setViewerCount] = useState(0);
  const [hostPin, setHostPin] = useState(pinnedMessage ?? "");
  const [hostTab, setHostTab] = useState<"director" | "chat">("director");
  const displayTitle = platformTitle?.trim() || title;
  const displayDescription = platformDescription?.trim() || null;
  const ranking = ensureArray<{ username: string; amount: number }>(tipRanking);
  const chatPin = isHost ? hostPin : pinnedMessage;

  const player = (
    <ExternalLivePlayer
      provider={provider}
      embedUrl={embedUrl}
      watchUrl={watchUrl}
      title={displayTitle}
      embedSupported={embedSupported}
      isHost={isHost}
      hostImage={host.image}
      hostUsername={host.username}
      externalId={externalId}
      onPlatformEnded={onPlatformEnded}
    />
  );

  const chat = (
    <LiveSupportProvider
      channelId={channelId}
      isHost={isHost}
      feedChat
      onAlert={() => {
        /* External embed: alerts shown in chat + OBS chat URL */
      }}
    >
      <LiveSupportTipPoll channelId={channelId} />
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
        pinnedMessage={chatPin}
        externalProvider={provider}
        externalId={externalId}
        variant="external"
        hideDonationControls={isHost}
        className={isHost ? "h-full min-h-0" : undefined}
      />
    </LiveSupportProvider>
  );

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
          <div className="live-studio-twitch mx-auto flex w-full flex-col space-y-3 px-1 sm:px-0 lg:h-[calc(100dvh-5.5rem)]">
            <div className="flex shrink-0 gap-1 rounded-lg border border-border/60 bg-muted/40 p-1 lg:hidden">
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 text-xs font-semibold",
                  hostTab === "director"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
                onClick={() => setHostTab("director")}
              >
                {t("live.director.tabDirector")}
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 text-xs font-semibold",
                  hostTab === "chat"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
                onClick={() => setHostTab("chat")}
              >
                {t("live.director.tabChat")}
              </button>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.95fr)_minmax(300px,0.9fr)]">
              <div className="min-w-0">
                {player}
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
              </div>
              <aside
                className={cn(
                  "min-h-[360px] lg:min-h-0 lg:h-full",
                  hostTab === "director" ? "block" : "hidden lg:block"
                )}
              >
                <LiveStudioErrorBoundary channelId={channelId} inline>
                  <LiveHostDirectorPanel
                    channelId={channelId}
                    viewerCount={viewerCount}
                    donationGoalKrw={donationGoalKrw}
                    tipTotalKrw={tipTotalKrw}
                    onPinnedChange={setHostPin}
                  />
                </LiveStudioErrorBoundary>
              </aside>
              <aside
                className={cn(
                  "h-[min(70vh,560px)] lg:h-full",
                  hostTab === "chat" ? "block" : "hidden lg:block"
                )}
              >
                <LiveStudioErrorBoundary channelId={channelId} inline>
                  {chat}
                </LiveStudioErrorBoundary>
              </aside>
            </div>
          </div>
        ) : (
          <div className="live-studio-twitch mx-auto w-full max-w-[1400px] space-y-3 px-1 sm:px-0">
            <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[1fr_340px] xl:gap-4">
              <div className="min-w-0">
                {player}
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
                      {t("live.top")}
                    </span>
                    {ranking.map((row, i) => (
                      <span key={`${row.username}-${i}`} className="rounded-full bg-muted px-2 py-0.5">
                        @{row.username} {formatUsd(row.amount)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="min-h-[min(70vh,560px)] xl:sticky xl:top-16">{chat}</div>
            </div>
          </div>
        )}
      </PlatformChatProvider>
    </LiveChatProvider>
  );
}
