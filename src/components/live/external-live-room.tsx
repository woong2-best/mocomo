"use client";

import { useState } from "react";
import { ExternalLivePlayer } from "@/components/live/external-live-player";
import { LiveChat } from "@/components/live/live-chat";
import { LiveChatProvider } from "@/components/live/live-chat-provider";
import { LiveSupportProvider } from "@/components/live/live-support-provider";
import { TipCreatorDialog } from "@/components/support/tip-creator-dialog";
import type { LiveExternalProvider } from "@/lib/live-external/types";
import type { SupportTierLevel } from "@prisma/client";

type Props = {
  channelId: string;
  title: string;
  /** YouTube stream title from the platform (preferred over MoCoMo room title) */
  platformTitle?: string | null;
  /** YouTube stream description from the platform */
  platformDescription?: string | null;
  provider: LiveExternalProvider;
  embedUrl: string | null;
  watchUrl: string;
  embedSupported: boolean;
  host: {
    id: string;
    username: string;
    image: string | null;
    displayName?: string | null;
  };
  currentUserId: string;
  isHost: boolean;
  paymentsEnabled: boolean;
  viewerSupportTier?: SupportTierLevel | null;
  viewerSupportTotal?: number;
};

/**
 * Layout: video (no overlays) | chat + tip panel beside.
 * Never mounts chat/donation on top of the iframe.
 */
export function ExternalLiveRoom({
  channelId,
  title,
  platformTitle,
  platformDescription,
  provider,
  embedUrl,
  watchUrl,
  embedSupported,
  host,
  currentUserId,
  isHost,
  paymentsEnabled,
  viewerSupportTier,
  viewerSupportTotal,
}: Props) {
  const [viewerCount, setViewerCount] = useState(0);
  const displayTitle = platformTitle?.trim() || title;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-3 md:flex-row md:items-start">
      <div className="min-w-0 flex-1">
        <h1 className="mb-2 text-lg font-semibold leading-snug">{displayTitle}</h1>
        <ExternalLivePlayer
          provider={provider}
          embedUrl={embedUrl}
          watchUrl={watchUrl}
          title={displayTitle}
          embedSupported={embedSupported}
          isHost={isHost}
        />
        {platformDescription?.trim() ? (
          <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
            {platformDescription.trim()}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-muted-foreground">
          @{host.username}
          {isHost ? " · 호스트" : ""}
          {viewerCount > 0 ? ` · ${viewerCount}명` : ""}
        </p>
      </div>

      <aside className="flex w-full flex-col gap-3 md:w-[360px] md:shrink-0">
        {paymentsEnabled && !isHost ? (
          <TipCreatorDialog
            creatorId={host.id}
            username={host.username}
            displayName={host.displayName ?? host.username}
            paymentsEnabled={paymentsEnabled}
            channelId={channelId}
            returnPath={`/voice/${channelId}`}
            currentTier={viewerSupportTier}
            currentTotal={viewerSupportTotal}
            triggerClassName="w-full"
          />
        ) : null}
        <div className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-xl border bg-card">
          <LiveChatProvider
            channelId={channelId}
            userId={currentUserId}
            onViewerCount={setViewerCount}
            chatOverlayInitial={false}
          >
            {/* LiveChat → LiveSupportSidebar needs this provider (first-party rooms wrap it higher up). */}
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
              />
            </LiveSupportProvider>
          </LiveChatProvider>
        </div>
      </aside>
    </div>
  );
}
