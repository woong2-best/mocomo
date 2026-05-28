import { auth } from "@/lib/auth";
import { LiveRoomEntry } from "@/components/live/live-room-entry";
import { getLiveChannelRoomMeta } from "@/actions/live-stream";
import { isPaymentsConfigured } from "@/lib/payments";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Play } from "lucide-react";

export default async function VoiceRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const { id } = await params;

  const meta = await getLiveChannelRoomMeta(id);
  if (!meta) notFound();

  const { channel, host, tipTotalKrw, tipRanking } = meta;
  const isHost = channel.createdBy === session.user.id;
  const paymentsEnabled = isPaymentsConfigured();

  if (!channel.isLive) {
    return (
      <div className="live-page-shell max-w-3xl mx-auto p-6 space-y-6">
        <Link href="/live">
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            라이브 목록
          </Button>
        </Link>
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold">방송이 종료되었습니다</p>
          {channel.vodUrl ? (
            <div className="rounded-2xl overflow-hidden border aspect-video bg-black">
              <video src={channel.vodUrl} controls className="w-full h-full" playsInline />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">다시보기가 아직 등록되지 않았습니다.</p>
          )}
          {isHost && !channel.vodUrl && (
            <p className="text-xs text-muted-foreground">
              스튜디오 종료 후 방송 설정에서 다시보기 URL을 등록할 수 있습니다.
            </p>
          )}
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={`/u/${host.username}`}>
              <Play className="h-4 w-4 mr-1" />
              @{host.username} 프로필
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="live-page-shell max-w-7xl mx-auto space-y-4 pb-24 lg:pb-6">
      <Link href="/live">
        <Button variant="ghost" size="sm" className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          라이브 목록
        </Button>
      </Link>
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
        tipRanking={tipRanking}
        slowModeSeconds={channel.slowModeSeconds}
        chatBannedWords={channel.chatBannedWords}
        paymentsEnabled={paymentsEnabled}
        broadcastMode={channel.broadcastMode}
      />
    </div>
  );
}
