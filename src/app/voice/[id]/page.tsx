import { getCachedSession } from "@/lib/auth";
import { LiveRoomEntry } from "@/components/live/live-room-entry";
import { ExternalLiveRoom } from "@/components/live/external-live-room";
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
import { fetchYoutubeVideoMetadata } from "@/lib/live-external/youtube-metadata";
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
        title="방송을 찾을 수 없습니다"
        description="삭제되었거나 주소가 잘못되었을 수 있어요."
        primaryHref="/live"
        primaryLabel="라이브 홈"
        secondaryHref="/voice"
        secondaryLabel="음성 목록"
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
        title="방송이 종료되었습니다"
        description="다른 라이브 방송을 둘러보세요."
        primaryHref="/live"
        primaryLabel="라이브 홈"
      />
    );
  }

  if (!hostCanEnter && !viewerCanEnter) {
    return (
      <LiveRoomErrorState
        title="방송에 입장할 수 없습니다"
        description="비공개 방송이거나 아직 시작 전일 수 있어요."
        primaryHref="/live"
        primaryLabel="라이브 홈"
        secondaryHref="/voice/new"
        secondaryLabel="내 방송 만들기"
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
        title="스튜디오를 불러오지 못했습니다"
        description={
          <>
            잠시 후 다시 시도해 주세요. 문제가 계속되면{" "}
            <code className="rounded bg-muted px-1 text-xs">supabase-fix-all.sql</code> 마이그레이션을
            확인해 주세요.
          </>
        }
        primaryHref="/voice/new"
        primaryLabel="방송 다시 만들기"
        secondaryHref="/live"
        secondaryLabel="라이브 홈"
      />
    );
  }

  const { channel, host, tipTotalKrw, tipRanking, hostFollowing } = meta;
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
          title="외부 방송 정보를 찾을 수 없습니다"
          description="호스트가 방송 URL을 다시 연결해야 할 수 있어요."
          primaryHref="/live"
          primaryLabel="라이브 홈"
        />
      );
    }

    const youtubeMeta =
      resolved.provider === "YOUTUBE"
        ? await fetchYoutubeVideoMetadata(resolved.externalId)
        : null;

    return (
      <LiveRoomPageShell isHost={isHost}>
        {!isHost && <LiveVoiceViewerBackLink />}
        <ExternalLiveRoom
          channelId={id}
          title={channel.name}
          platformTitle={youtubeMeta?.title}
          platformDescription={youtubeMeta?.description}
          provider={resolved.provider}
          embedUrl={resolved.embedUrl}
          watchUrl={channel.externalWatchUrl || resolved.watchUrl}
          embedSupported={resolved.embedSupported}
          host={{
            id: host.id,
            username: host.username,
            image: host.image,
            displayName: host.username,
          }}
          currentUserId={session.user.id}
          isHost={isHost}
          paymentsEnabled={paymentsEnabled}
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
      />
    </LiveRoomPageShell>
  );
}
