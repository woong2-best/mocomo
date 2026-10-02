import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { getCachedSession } from "@/lib/auth";
import { LiveRoomEntry } from "@/components/live/live-room-entry";
import { ExternalLiveRoomClient } from "@/components/live/external-live-room-client";
import { getCachedLiveRoomMeta } from "@/lib/cached-live-meta";
import { isPaymentsConfigured } from "@/lib/payments";
import { ensureArray, ensureStringArray } from "@/lib/ensure-array";
import {
  canViewerEnterLiveRoom,
  isHostBroadcastRoom,
  isPubliclyLive,
} from "@/lib/live-channel-active";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { LiveVoiceViewerBackLink } from "@/components/live/mobile/live-voice-viewer-back-link";
import { LiveRoomPageShell } from "@/components/live/live-room-page-shell";
import { LiveRoomErrorState } from "@/components/live/live-room-error-state";
import { resolveExternalEmbed } from "@/lib/live-external/parse";
import { fetchExternalPlatformMetadata } from "@/lib/live-external/platform-metadata";
import { syncExternalChannelPlatformMeta } from "@/lib/live-external/sync-platform-meta";
import { isFirstPartyLiveEnabled } from "@/lib/live-feature";
import { LiveFeatureDisabledNotice } from "@/components/live/live-feature-disabled";

export const dynamic = "force-dynamic";

export default async function VoiceRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin");
  const { id } = await params;

  const liveFlags = await db.voiceChannel.findUnique({
    where: { id },
    select: {
      isLive: true,
      liveStatus: true,
      createdBy: true,
      mediaSourceType: true,
      broadcastMode: true,
    },
  });

  if (!liveFlags) {
    return (
      <LiveRoomErrorState
        title={t("app.voice.sm9oy0p")}
        description={t("app.voice.s9z2a9y")}
        primaryHref="/live"
        primaryLabel={t("avatar.sx1ht4s")}
        secondaryHref="/voice"
        secondaryLabel={t("app.voice.smarh4f")}
      />
    );
  }

  const isHost = liveFlags.createdBy === session.user.id;
  const liveStatus = liveFlags.liveStatus ?? "SCHEDULED";
  const onAir = isPubliclyLive({
    isLive: liveFlags.isLive,
    liveStatus,
  });
  const hostCanEnter = isHost && isHostBroadcastRoom({ liveStatus });
  const viewerCanEnter = !isHost && canViewerEnterLiveRoom({
    isLive: liveFlags.isLive,
    liveStatus,
  });

  if (liveStatus === "ENDED") {
    return (
      <LiveRoomErrorState
        title={t("app.voice.s9huk9i")}
        description={t("app.voice.sr2cb9a")}
        primaryHref="/live"
        primaryLabel={t("avatar.sx1ht4s")}
      />
    );
  }

  if (!hostCanEnter && !viewerCanEnter) {
    return (
      <LiveRoomErrorState
        title={t("app.voice.s1aufdyz")}
        description={t("app.voice.sb4je3h")}
        primaryHref="/live"
        primaryLabel={t("avatar.sx1ht4s")}
        secondaryHref="/voice/new"
        secondaryLabel={t("app.voice.sf3w458")}
      />
    );
  }

  let meta: Awaited<ReturnType<typeof getCachedLiveRoomMeta>> = null;
  try {
    meta = await getCachedLiveRoomMeta(id, session.user.id);
  } catch (e) {
    console.error("[voice/[id]] meta load failed", e);
  }
  if (!meta) {
    return (
      <LiveRoomErrorState
        title={t("app.voice.s124x9lc")}
        description={
          <>
            잠시 후 다시 시도해 주세요. 문제가 계속되면{" "}
            <code className="rounded bg-muted px-1 text-xs">supabase-fix-all.sql</code> 마이그레이션을
            확인해 주세요.
          </>
        }
        primaryHref="/voice/new"
        primaryLabel={t("app.voice.s1e9q4qg")}
        secondaryHref="/live"
        secondaryLabel={t("avatar.sx1ht4s")}
      />
    );
  }

  const { channel, host, tipTotalKrw, tipRanking, hostFollowing, hostPinnedMessage } = meta;
  const paymentsEnabled = isPaymentsConfigured();

  const isExternal =
    channel.mediaSourceType === "EXTERNAL" || channel.broadcastMode === "EXTERNAL";

  if (isExternal) {
    const resolved = resolveExternalEmbed({
      externalProvider: channel.externalProvider,
      externalId: channel.externalId,
    });
    if (!resolved) {
      return (
        <LiveRoomErrorState
          title={t("app.voice.s14yvkje")}
          description={t("app.voice.url")}
          primaryHref="/live"
          primaryLabel={t("avatar.sx1ht4s")}
        />
      );
    }

    const platformMeta = await fetchExternalPlatformMetadata(
      resolved.provider,
      resolved.externalId
    );
    void syncExternalChannelPlatformMeta({
      channelId: id,
      provider: resolved.provider,
      externalId: resolved.externalId,
      currentName: channel.name,
      currentDescription: null,
    });

    return (
      <LiveRoomPageShell isHost={isHost}>
        {!isHost && <LiveVoiceViewerBackLink />}
        <ExternalLiveRoomClient
          channelId={id}
          title={platformMeta.title?.trim() || channel.name}
          platformTitle={platformMeta.title}
          platformDescription={platformMeta.description}
          provider={resolved.provider}
          externalId={resolved.externalId}
          embedUrl={resolved.embedUrl}
          watchUrl={channel.externalWatchUrl || resolved.watchUrl}
          embedSupported={resolved.embedSupported}
          category={channel.category}
          pinnedMessage={hostPinnedMessage}
          donationGoalKrw={channel.donationGoalKrw}
          tipTotalKrw={tipTotalKrw}
          tipRanking={ensureArray<{ username: string; amount: number }>(tipRanking)}
          host={{
            id: host.id,
            username: host.username,
            image: host.image,
            displayName: host.username,
            tier: host.supportTierSent,
            totalSupport: host.totalSupportReceived,
          }}
          currentUserId={session.user.id}
          isHost={isHost}
          paymentsEnabled={paymentsEnabled}
          hostFollowing={hostFollowing}
          viewerSupportTier={host.supportTierReceived}
          viewerSupportTotal={host.totalSupportReceived}
        />
      </LiveRoomPageShell>
    );
  }

  if (!isFirstPartyLiveEnabled()) {
    return <LiveFeatureDisabledNotice />;
  }

  return (
    <LiveRoomPageShell isHost={isHost}>
      {!isHost && (
        <LiveVoiceViewerBackLink />
      )}
      <LiveRoomEntry
        channelId={id}
        channelName={channel.name}
        hostUserId={channel.createdBy}
        hostUsername={host.username}
        hostDisplayName={host.username}
        hostImage={host.image}
        hostTier={host.supportTierSent}
        hostTotalSupport={host.totalSupportReceived}
        isHost={isHost}
        category={channel.category}
        donationGoalKrw={channel.donationGoalKrw}
        tipTotalKrw={tipTotalKrw}
        tipRanking={ensureArray<{ username: string; amount: number }>(tipRanking)}
        slowModeSeconds={channel.slowModeSeconds}
        chatBannedWords={ensureStringArray(channel.chatBannedWords)}
        donationAlertsOnStream={channel.donationAlertsOnStream === true}
        paymentsEnabled={paymentsEnabled}
        broadcastMode={channel.broadcastMode ?? "BROWSER"}
        liveVisibility={channel.liveVisibility ?? "PUBLIC"}
        minViewerTier={channel.minViewerTier}
        hostFollowing={hostFollowing}
        isLiveOnAir={onAir}
        isNsfw={channel.isNsfw === true}
      />
    </LiveRoomPageShell>
  );
}
