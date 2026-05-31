import { getCachedSession } from "@/lib/auth";
import { LiveRoomEntry } from "@/components/live/live-room-entry";
import { getCachedLiveRoomMeta } from "@/lib/cached-live-meta";
import { isPaymentsConfigured } from "@/lib/payments";
import { ensureArray, ensureStringArray } from "@/lib/ensure-array";
import { isHostBroadcastRoom, isPubliclyLive } from "@/lib/live-channel-active";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VoiceRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin");
  const { id } = await params;

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
          라이브 DB가 아직 준비되지 않았을 수 있습니다. Supabase SQL Editor에서{" "}
          <code className="text-xs bg-muted px-1 rounded">supabase-fix-all.sql</code>의 R·U 섹션을 실행한 뒤
          다시 시도해 주세요.
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/voice/new">방송 다시 시작</Link>
          </Button>
          <Button asChild className="rounded-xl">
            <Link href="/live">라이브 홈</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { channel, host, tipTotalKrw, tipRanking, hostFollowing } = meta;
  const isHost = channel.createdBy === session.user.id;
  const paymentsEnabled = isPaymentsConfigured();

  const onAir = isPubliclyLive({
    isLive: channel.isLive,
    liveStatus: channel.liveStatus ?? (channel.isLive ? "LIVE" : "ENDED"),
  });
  const hostStudio =
    isHost &&
    isHostBroadcastRoom({
      liveStatus: channel.liveStatus ?? (channel.isLive ? "LIVE" : "ENDED"),
    });

  if (channel.liveStatus === "ENDED" || (!hostStudio && !onAir)) {
    return (
      <div className="live-page-shell max-w-3xl mx-auto p-6 space-y-6">
        <Link href="/live">
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            라이브 목록
          </Button>
        </Link>
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold">
            {channel.liveStatus === "ENDED" ? "방송이 종료되었습니다" : "방송 준비 중입니다"}
          </p>
          <p className="text-sm text-muted-foreground">
            {channel.liveStatus === "ENDED"
              ? "다시보기는 제공하지 않습니다."
              : "스트리머가 방송을 시작하면 이 페이지에서 시청할 수 있습니다."}
          </p>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={`/u/${host.username}`}>@{host.username} 프로필</Link>
          </Button>
          <Button asChild className="rounded-xl">
            <Link href="/live">다른 라이브 보기</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        isHost
          ? "live-page-shell max-w-[1600px] mx-auto px-2 sm:px-4 pb-4"
          : "live-page-shell max-w-[1600px] mx-auto space-y-3 pb-24 lg:pb-4 px-2 sm:px-4"
      }
    >
      {!isHost && (
        <Link href="/live">
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            라이브 목록
          </Button>
        </Link>
      )}
      <LiveRoomEntry
        channelId={id}
        channelName={channel.name}
        hostUserId={channel.createdBy}
        hostUsername={host.username}
        hostDisplayName={host.username}
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
      />
    </div>
  );
}
