import { getCachedSession } from "@/lib/auth";
import { LiveRoomEntry } from "@/components/live/live-room-entry";
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
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LiveVoiceViewerBackLink } from "@/components/live/mobile/live-voice-viewer-back-link";

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
    select: { isLive: true, liveStatus: true, createdBy: true },
  });

  if (!liveFlags) {
    return (
      <div className="live-page-shell max-w-lg mx-auto p-6 space-y-4 text-center">
        <p className="text-lg font-semibold">방송을 찾을 수 없습니다</p>
        <Button asChild className="rounded-xl">
          <Link href="/live">라이브 홈</Link>
        </Button>
      </div>
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
      <div className="live-page-shell max-w-3xl mx-auto p-6 space-y-6 text-center">
        <p className="text-lg font-semibold">방송이 종료되었습니다</p>
        <Button asChild className="rounded-xl">
          <Link href="/live">라이브 홈</Link>
        </Button>
      </div>
    );
  }

  if (!hostCanEnter && !viewerCanEnter) {
    return (
      <div className="live-page-shell max-w-3xl mx-auto p-6 space-y-6 text-center">
        <p className="text-lg font-semibold">방송에 입장할 수 없습니다</p>
        <Button asChild className="rounded-xl">
          <Link href="/live">라이브 홈</Link>
        </Button>
      </div>
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
      <div className="live-page-shell max-w-lg mx-auto p-6 space-y-4 text-center">
        <p className="text-lg font-semibold">스튜디오를 불러오지 못했습니다</p>
        <p className="text-sm text-muted-foreground">
          Supabase SQL Editor에서 <code className="text-xs bg-muted px-1 rounded">supabase-fix-all.sql</code> 실행 후
          다시 시도해 주세요.
        </p>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/voice/new">방송 다시 만들기</Link>
        </Button>
      </div>
    );
  }

  const { channel, host, tipTotalKrw, tipRanking, hostFollowing } = meta;
  const paymentsEnabled = isPaymentsConfigured();

  return (
    <div
      className={
        isHost
          ? "live-page-shell max-w-[1600px] mx-auto px-2 sm:px-4 pb-4"
          : "live-page-shell max-w-[1600px] mx-auto space-y-3 pb-24 lg:pb-4 px-2 sm:px-4"
      }
    >
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
        paymentsEnabled={paymentsEnabled}
        broadcastMode={channel.broadcastMode ?? "BROWSER"}
        liveVisibility={channel.liveVisibility ?? "PUBLIC"}
        minViewerTier={channel.minViewerTier}
        hostFollowing={hostFollowing}
        isLiveOnAir={onAir}
      />
    </div>
  );
}
