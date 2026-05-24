import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { joinVoiceChannel } from "@/actions/voice";
import { LiveStreamRoom } from "@/components/live/live-stream-room";
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
    include: {
      members: { include: { user: { select: { username: true } } } },
      _count: { select: { members: true } },
    },
  });
  if (!channel) notFound();

  await joinVoiceChannel(id);

  const host = await db.user.findUnique({
    where: { id: channel.createdBy },
    select: { username: true },
  });

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <Link href="/live">
        <Button variant="ghost" size="sm" className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          라이브 목록
        </Button>
      </Link>
      <LiveStreamRoom
        channelId={id}
        channelName={channel.name}
        isLive={channel.isLive}
        memberCount={channel._count.members}
        hostUsername={host?.username}
      />
    </div>
  );
}
