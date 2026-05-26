import { getCachedSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { ChatHeader } from "@/components/messages/chat-header";
import { getConversationMeta } from "@/lib/chat-display";
import { userPublicSelectMinimal } from "@/lib/user-public-select";

export async function ChatHeaderAsync({ roomId }: { roomId: string }) {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect(`/auth/signin?callbackUrl=/messages/${roomId}`);

  const room = await db.chatRoom.findUnique({
    where: { id: roomId },
    include: {
      members: { include: { user: { select: { ...userPublicSelectMinimal, name: true } } } },
      messages: { take: 1, orderBy: { createdAt: "desc" }, select: { content: true, createdAt: true } },
    },
  });

  if (!room) notFound();
  if (!room.members.some((m) => m.userId === session.user.id)) notFound();

  const meta = getConversationMeta(room, session.user.id);
  const otherMember =
    room.type === "DM" ? room.members.find((m) => m.userId !== session.user.id)?.user : undefined;

  return (
    <ChatHeader
      displayName={meta.displayName}
      displayImage={meta.displayImage}
      profileUsername={meta.profileUsername}
      supportTierSent={meta.supportTierSent}
      roomId={roomId}
      roomType={room.type}
      otherUserId={otherMember?.id}
    />
  );
}
