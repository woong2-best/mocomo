import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { ChatRoomClient } from "@/components/chat/chat-room";
import { ConversationListAsync } from "@/components/messages/conversation-list-async";
import { ChatHeader } from "@/components/messages/chat-header";
import { getConversationMeta } from "@/lib/chat-display";
import { userPublicSelectMinimal } from "@/lib/user-public-select";

export default async function ChatRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/auth/signin?callbackUrl=/messages/${roomId}`);

  const room = await db.chatRoom.findUnique({
    where: { id: roomId },
    include: {
      members: { include: { user: { select: { ...userPublicSelectMinimal, name: true } } } },
      messages: {
        take: 50,
        orderBy: { createdAt: "asc" },
        include: { sender: { select: userPublicSelectMinimal } },
      },
    },
  });

  if (!room) notFound();

  const isMember = room.members.some((m) => m.userId === session.user.id);
  if (!isMember) notFound();

  const meta = getConversationMeta(room, session.user.id);
  const otherMember =
    room.type === "DM" ? room.members.find((m) => m.userId !== session.user.id)?.user : undefined;

  const initialMessages = room.messages.map((m) => ({
    id: m.id,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    sender: m.sender,
  }));

  return (
    <div className="flex flex-1 min-h-0 h-full">
      <ConversationListAsync
        currentUserId={session.user.id}
        activeRoomId={roomId}
        className="hidden md:flex"
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-background">
        <ChatHeader
          displayName={meta.displayName}
          displayImage={meta.displayImage}
          profileUsername={meta.profileUsername}
          supportTierSent={meta.supportTierSent}
          roomId={roomId}
          roomType={room.type}
          otherUserId={otherMember?.id}
        />
        <ChatRoomClient
          roomId={roomId}
          userId={session.user.id}
          username={session.user.username || "user"}
          initialMessages={initialMessages}
        />
      </div>
    </div>
  );
}
