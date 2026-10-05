"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useLocale } from "@/components/providers/locale-provider";
import { useEffect, useState } from "react";
import { Eye, Radio } from "lucide-react";
import { LiveMobilePortraitHost } from "@/components/live/mobile/live-mobile-portrait-host";
import { LiveChat } from "@/components/live/live-chat";
import { LiveBrowserStudio } from "@/components/live/live-browser-studio";
import { LiveHostDirectorPanel } from "@/components/live/live-host-director-panel";
import { LiveStudioErrorBoundary } from "@/components/live/live-studio-error-boundary";
import { LiveClientMount } from "@/components/live/live-client-mount";
import { useLiveCollabState } from "@/hooks/use-live-collab-state";
import { liveCategoryLabel } from "@/lib/live-categories";
import { Button } from "@/components/ui/button";
import type { LiveBroadcastMode, LiveStreamCategory, SupportTierLevel } from "@prisma/client";
import { isVoiceBroadcastMode } from "@/lib/live-voice-broadcast";
import { VoiceLiveHostStudio } from "@/components/voice-live/voice-live-studio";
import { LiveMobilePortraitVoiceHost } from "@/components/live/mobile/live-mobile-portrait-voice-host";
import { LiveDonationAlertOverlay, type LiveTipAlert } from "@/components/live/live-donation-alert-overlay";
import { cn } from "@/lib/utils";

/** Phone portrait only — do not flip at the 1024px studio breakpoint (that remounts the publisher). */
function usePhonePortrait() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 640px) and (orientation: portrait)");
    const update = () => setActive(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return active;
}

/** 호스트 스튜디오 — 브라우저 송출 + 채팅 + 설정 */
export function LiveHostStudioShell({
  channelId,
  channelName,
  hostUserId,
  hostUsername,
  hostDisplayName,
  viewerCount,
  onViewerCount,
  onEndStream,
  category,
  donationGoalKrw,
  tipTotalKrw,
  slowModeSeconds,
  chatBannedWords,
  collabPassword,
  recentTips = [],
  donationAlertsOnStream = false,
  broadcastMode,
  hostImage,
  isNsfw = false,
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
  recentTips?: LiveTipAlert[];
  donationAlertsOnStream?: boolean;
  broadcastMode?: LiveBroadcastMode;
  hostImage?: string | null;
  isNsfw?: boolean;
}) {
  const { t } = useLocale();
  const phonePortrait = usePhonePortrait();
  const collab = useLiveCollabState(channelId);
  const coHostLabel =
    collab.coHost?.name ?? collab.coHost?.username ?? undefined;

  if (isVoiceBroadcastMode(broadcastMode)) {
    if (phonePortrait) {
      return (
        <LiveMobilePortraitVoiceHost
          channelId={channelId}
          channelName={channelName}
          hostImage={hostImage}
          hostDisplayName={hostDisplayName}
          viewerCount={viewerCount}
          onViewerCount={onViewerCount}
          onEndStream={onEndStream}
          recentTips={recentTips}
          donationAlertsOnStream={donationAlertsOnStream}
        />
      );
    }
    return (
      <LiveHostThreeColumn
        channelId={channelId}
        channelName={channelName}
        hostUserId={hostUserId}
        hostUsername={hostUsername}
        hostDisplayName={hostDisplayName}
        viewerCount={viewerCount}
        onViewerCount={onViewerCount}
        onEndStream={onEndStream}
        category={category}
        donationGoalKrw={donationGoalKrw}
        tipTotalKrw={tipTotalKrw}
        slowModeSeconds={slowModeSeconds}
        chatBannedWords={chatBannedWords}
        donationAlertsOnStream={donationAlertsOnStream}
        isNsfw={isNsfw}
        liveBadge={t("live.s1m3i5fo")}
        liveBadgeClass="bg-violet-600/15 text-violet-700 dark:text-violet-300"
        video={
          <VoiceLiveHostStudio
            channelId={channelId}
            channelName={channelName}
            hostImage={hostImage}
            hostDisplayName={hostDisplayName}
          />
        }
      />
    );
  }

  if (phonePortrait) {
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
        recentTips={recentTips}
        donationAlertsOnStream={donationAlertsOnStream}
        isNsfw={isNsfw}
      />
    );
  }

  return (
    <LiveHostThreeColumn
      channelId={channelId}
      channelName={channelName}
      hostUserId={hostUserId}
      hostUsername={hostUsername}
      hostDisplayName={hostDisplayName}
      viewerCount={viewerCount}
      onViewerCount={onViewerCount}
      onEndStream={onEndStream}
      category={category}
      donationGoalKrw={donationGoalKrw}
      tipTotalKrw={tipTotalKrw}
      slowModeSeconds={slowModeSeconds}
      chatBannedWords={chatBannedWords}
      donationAlertsOnStream={donationAlertsOnStream}
      isNsfw={isNsfw}
      liveBadge={t("nav.liveStudio")}
      video={
        <div className="relative min-w-0 w-full">
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
          {donationAlertsOnStream ? <LiveDonationAlertOverlay tips={recentTips} /> : null}
        </div>
      }
    />
  );
}

function LiveHostThreeColumn({
  channelId,
  channelName,
  hostUserId,
  hostUsername,
  hostDisplayName,
  viewerCount,
  onViewerCount,
  onEndStream,
  category,
  donationGoalKrw,
  tipTotalKrw,
  slowModeSeconds,
  chatBannedWords,
  donationAlertsOnStream,
  isNsfw,
  liveBadge,
  liveBadgeClass,
  video,
}: {
  channelId: string;
  channelName: string;
  hostUserId: string;
  hostUsername?: string;
  hostDisplayName?: string;
  viewerCount: number;
  onViewerCount?: (n: number) => void;
  onEndStream: () => void;
  category?: LiveStreamCategory;
  donationGoalKrw?: number | null;
  tipTotalKrw?: number;
  slowModeSeconds?: number;
  chatBannedWords?: string[];
  donationAlertsOnStream?: boolean;
  isNsfw?: boolean;
  liveBadge: string;
  liveBadgeClass?: string;
  video: React.ReactNode;
}) {
  const { t } = useLocale();
  const [pinnedMessage, setPinnedMessage] = useState<string>("");
  const [tab, setTab] = useState<"director" | "chat">("director");

  return (
    <div className="flex w-full flex-col lg:h-[calc(100dvh-4.75rem)]">
      <header className="sticky top-0 z-20 flex shrink-0 flex-wrap items-center gap-2 border-b border-border/60 bg-background/95 py-2 backdrop-blur-sm sm:gap-3">
        <span
          className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
            liveBadgeClass ?? "bg-muted text-muted-foreground"
          }`}
        >
          <Radio className="h-3 w-3" />
          {liveBadge}
        </span>
        {category ? (
          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">
            {liveCategoryLabel(category)}
          </span>
        ) : null}
        <h1 className="min-w-0 flex-1 truncate text-base font-bold sm:text-lg">{channelName}</h1>
        <span className="flex items-center gap-1 text-sm tabular-nums text-muted-foreground">
          <Eye className="h-4 w-4" />
          {viewerCount}
        </span>
        <Button variant="destructive" size="sm" className="gap-1 rounded-xl" onClick={onEndStream}>
          <Radio className="h-4 w-4" />
          {t("live.s1dubywf")}
        </Button>
      </header>

      <div className="mt-2 flex shrink-0 gap-1 rounded-lg border border-border/60 bg-muted/40 p-1 lg:hidden">
        <button
          type="button"
          className={cn(
            "flex-1 rounded-md px-2 py-1.5 text-xs font-semibold",
            tab === "director" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
          )}
          onClick={() => setTab("director")}
        >
          {t("live.director.tabDirector")}
        </button>
        <button
          type="button"
          className={cn(
            "flex-1 rounded-md px-2 py-1.5 text-xs font-semibold",
            tab === "chat" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
          )}
          onClick={() => setTab("chat")}
        >
          {t("live.director.tabChat")}
        </button>
      </div>

      <div className="mt-3 grid min-h-0 flex-1 grid-cols-1 items-stretch gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.95fr)_minmax(300px,0.9fr)]">
        <section className="min-w-0">{video}</section>
        <aside
          className={cn(
            "min-h-[360px] lg:min-h-0 lg:h-full",
            tab === "director" ? "block" : "hidden lg:block"
          )}
        >
          <LiveStudioErrorBoundary channelId={channelId} inline>
            <LiveClientMount>
            <LiveHostDirectorPanel
              channelId={channelId}
              viewerCount={viewerCount}
              donationGoalKrw={donationGoalKrw}
              tipTotalKrw={tipTotalKrw}
              slowModeSeconds={slowModeSeconds}
              chatBannedWords={chatBannedWords}
              donationAlertsOnStream={donationAlertsOnStream}
              isNsfw={isNsfw}
              onPinnedChange={setPinnedMessage}
            />
            </LiveClientMount>
          </LiveStudioErrorBoundary>
        </aside>
        <aside
          className={cn(
            "h-[min(70vh,560px)] lg:h-full",
            tab === "chat" ? "block" : "hidden lg:block"
          )}
        >
          <LiveStudioErrorBoundary channelId={channelId} inline>
            <LiveClientMount>
            <LiveChat
              channelId={channelId}
              viewerCount={viewerCount}
              onViewerCount={onViewerCount}
              isHost
              canModerate
              hostUserId={hostUserId}
              hostUsername={hostUsername}
              hostDisplayName={hostDisplayName}
              pinnedMessage={pinnedMessage}
              hideDonationControls
              className="h-full min-h-0"
            />
            </LiveClientMount>
          </LiveStudioErrorBoundary>
        </aside>
      </div>
    </div>
  );
}
