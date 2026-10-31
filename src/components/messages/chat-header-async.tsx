import { getCachedSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { ChatHeader } from "@/components/messages/chat-header";
import { getConversationMeta } from "@/lib/chat-display";
import { getRequestLocale } from "@/lib/i18n/server";
import { chatMemberUserSelect } from "@/lib/user-public-select";
import { withHydratedChatMemberImages } from "@/lib/chat-inbox-images";

export async function ChatHeaderAsync({ roomId }: { roomId: string }) {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect(`/auth/signin?callbackUrl=/messages/${roomId}`);

  const room = await db.chatRoom.findUnique({
    where: { id: roomId },
    include: {
      members: { include: { user: { select: chatMemberUserSelect } } },
      messages: { take: 1, orderBy: { createdAt: "desc" }, select: { content: true, createdAt: true } },
    },
  });

  if (!room) notFound();
  if (room.type === "COSPLAYER_GROUP" || room.type === "SOCIAL_GROUP") {
    redirect("/messages");
  }
  const isMember = room.members.some((m) => m.userId === session.user.id);
  if (!isMember) notFound();

  const locale = await getRequestLocale();
  const [roomWithImages] = await withHydratedChatMemberImages([room]);
  const meta = getConversationMeta(roomWithImages, session.user.id, locale);
  const otherMember =
    roomWithImages.type === "DM"
      ? roomWithImages.members.find((m) => m.userId !== session.user.id)?.user
      : undefined;

  return (
    <ChatHeader
      displayName={meta.displayName}
      displayImage={meta.displayImage}
      profileUsername={meta.profileUsername}
      supportTierSent={meta.supportTierSent}
      roomId={roomId}
      roomType={room.type}
      otherUserId={otherMember?.id}
      otherTimeZone={otherMember?.timeZone}
      viewerUserId={session.user.id}
      memberCount={room.members.length}
      members={roomWithImages.members.map((m) => ({
        id: m.user.id,
        username: m.user.username,
        name: m.user.name,
        image: m.user.image,
        timeZone: m.user.timeZone,
      }))}
    />
  );
}
