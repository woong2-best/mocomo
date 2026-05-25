import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { LiveRoomEntry } from "@/components/live/live-room-entry";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function VoiceRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const { id } = await params;

  const channel = await db.voiceChannel.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      isLive: true,
      createdBy: true,
    },
  });
  if (!channel) notFound();
  if (!channel.isLive) {
    return (
      <div className="max-w-lg mx-auto p-8 text-center space-y-4">
        <p className="text-muted-foreground">이 방송은 종료되었습니다.</p>
        <Link href="/live">
          <Button className="rounded-xl">라이브 목록</Button>
        </Link>
      </div>
    );
  }

  const host = await db.user.findUnique({
    where: { id: channel.createdBy },
    select: { username: true },
  });

  const isHost = channel.createdBy === session.user.id;

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4 pb-24 lg:pb-6 bg-[#0a0a0c] min-h-screen">
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
        hostUsername={host?.username}
        isHost={isHost}
      />
    </div>
  );
}
