import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChatRoomClient } from "@/components/chat/chat-room";
import { CallButton } from "@/components/call/call-button";

export default async function ChatRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/auth/signin?callbackUrl=/messages/${roomId}`);

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

  const otherMember =
    room.type === "DM" ? room.members.find((m) => m.userId !== session.user.id)?.user : undefined;

  const displayName =
    room.type === "DM" && otherMember
      ? otherMember.username
      : room.name || `채팅 ${room.type}`;

  const initialMessages = room.messages.map((m) => ({
    id: m.id,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    sender: m.sender,
  }));

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <aside className="hidden md:flex w-56 border-r border-border/50 flex-col shrink-0 p-2">
        <Link href="/messages" className="text-xs text-primary mb-2">
          ← 목록
        </Link>
        <p className="text-sm font-medium px-2">{displayName}</p>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/messages" className="md:hidden text-xs text-primary shrink-0">
              ← 목록
            </Link>
            <p className="font-medium text-sm truncate">{displayName}</p>
          </div>
          {room.type === "DM" && otherMember && (
            <CallButton calleeId={otherMember.id} chatRoomId={roomId} />
          )}
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
