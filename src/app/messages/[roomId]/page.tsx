import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChatRoomClient } from "@/components/chat/chat-room";
import { Phone, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function ChatRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const { roomId } = await params;

  const room = await db.chatRoom.findUnique({
    where: { id: roomId },
    include: {
      members: { include: { user: { select: { id: true, username: true, image: true } } } },
      messages: {
        take: 50,
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { id: true, username: true, image: true } } },
      },
    },
  });

  if (!room) notFound();

  const initialMessages = room.messages.map((m) => ({
    id: m.id,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    sender: m.sender,
  }));

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <aside className="hidden md:flex w-56 border-r border-border/50 flex-col shrink-0 p-2">
        <Link href="/messages" className="text-xs text-primary mb-2">← 목록</Link>
        <p className="text-sm font-medium px-2">{room.name || room.type}</p>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
          <p className="font-medium text-sm">{room.name || `채팅 ${room.type}`}</p>
          <div className="flex gap-1">
            <Link href="/phone">
              <Button variant="ghost" size="icon" title="음성통화">
                <Phone className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/voice">
              <Button variant="ghost" size="icon" title="영상통화">
                <Video className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
        <ChatRoomClient
          roomId={roomId}
          userId={session.user.id}
          username={session.user.username || "user"}
          initialMessages={initialMessages}
        />
      </div>

      <aside className="hidden lg:flex w-48 border-l border-border/50 flex-col p-3 shrink-0">
        <p className="text-xs text-muted-foreground mb-2">참여자</p>
        {room.members.map((m) => (
          <Link
            key={m.userId}
            href={`/u/${m.user.username}`}
            className="text-sm py-1 hover:text-primary truncate"
          >
            {m.user.username}
          </Link>
        ))}
      </aside>
    </div>
  );
}
