import { auth } from "@/lib/auth";
import { LiveRoomEntry } from "@/components/live/live-room-entry";
import { getLiveChannelRoomMeta } from "@/actions/live-stream";
import { isPaymentsConfigured } from "@/lib/payments";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

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
          <p className="text-sm text-muted-foreground">다시보기는 제공하지 않습니다.</p>
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
