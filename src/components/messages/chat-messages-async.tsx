import { getCachedSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { ChatRoomClient } from "@/components/chat/chat-room";
import { userPublicSelectMinimal } from "@/lib/user-public-select";

export async function ChatMessagesAsync({ roomId }: { roomId: string }) {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect(`/auth/signin?callbackUrl=/messages/${roomId}`);

  const member = await db.chatMember.findUnique({
    where: { roomId_userId: { roomId, userId: session.user.id } },
  });
  if (!member) notFound();

  const messages = await db.message.findMany({
    where: { roomId },
    take: 50,
    orderBy: { createdAt: "asc" },
    include: { sender: { select: userPublicSelectMinimal } },
  });

  const initialMessages = messages.map((m) => ({
    id: m.id,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    sender: m.sender,
  }));

  return (
    <ChatRoomClient
      roomId={roomId}
      userId={session.user.id}
      username={session.user.username || "user"}
      initialMessages={initialMessages}
    />
  );
}
