import { getCachedAuthUserMinimal, getCachedSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { ChatRoomClient } from "@/components/chat/chat-room";
import { chatMessageInclude, serializeChatMessages } from "@/lib/chat-message-serialize";
import {
  collectPaidAttachmentIds,
  getPurchasedMessageAttachmentIds,
} from "@/lib/message-paid-media";

export async function ChatMessagesAsync({ roomId }: { roomId: string }) {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect(`/auth/signin?callbackUrl=/messages/${roomId}`);

  const room = await db.chatRoom.findUnique({
    where: { id: roomId },
    select: { type: true },
  });
  if (!room) notFound();
  if (room.type === "COSPLAYER_GROUP" || room.type === "SOCIAL_GROUP") {
    redirect("/messages");
  }

  const [member, me, messages] = await Promise.all([
    db.chatMember.findUnique({
      where: { roomId_userId: { roomId, userId: session.user.id } },
    }),
    getCachedAuthUserMinimal(),
    db.message.findMany({
      where: { roomId },
      take: 50,
      orderBy: { createdAt: "asc" },
      include: chatMessageInclude,
    }),
  ]);
  if (!member) notFound();

  const paidIds = collectPaidAttachmentIds(messages);
  const purchasedIds = await getPurchasedMessageAttachmentIds(session.user.id, paidIds);
  const initialMessages = serializeChatMessages(messages, session.user.id, purchasedIds);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ChatRoomClient
        roomId={roomId}
        userId={session.user.id}
        username={session.user.username || "user"}
        userImage={me?.image ?? session.user.image ?? null}
        userSupportTier={me?.supportTierSent ?? "SEED"}
        initialMessages={initialMessages}
      />
    </div>
  );
}
