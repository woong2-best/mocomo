import { getCachedAuthUserMinimal, getCachedSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { getGroupRoomMeta } from "@/actions/group-chat";
import { getConversationMeta } from "@/lib/chat-display";
import { userPublicSelectMinimal } from "@/lib/user-public-select";
import { chatMessageInclude, serializeChatMessage } from "@/lib/chat-message-serialize";
import { ChatRoomShell } from "@/components/messages/chat-room-shell";

export async function ChatRoomShellAsync({ roomId }: { roomId: string }) {
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

  const isMember = room.members.some((m) => m.userId === session.user.id);
  if (
    !isMember &&
    (room.type === "COSPLAYER_GROUP" || room.type === "SOCIAL_GROUP")
  ) {
    redirect(`/messages/join?room=${roomId}`);
  }
  if (!isMember) notFound();

  const [me, messages, groupMeta] = await Promise.all([
    getCachedAuthUserMinimal(),
    db.message.findMany({
      where: { roomId },
      take: 50,
      orderBy: { createdAt: "asc" },
      include: chatMessageInclude,
    }),
    room.type === "COSPLAYER_GROUP" || room.type === "SOCIAL_GROUP"
      ? getGroupRoomMeta(roomId)
      : Promise.resolve(null),
  ]);

  const meta = getConversationMeta(room, session.user.id);
  const otherMember =
    room.type === "DM" ? room.members.find((m) => m.userId !== session.user.id)?.user : undefined;

  const initialMessages = messages.map(serializeChatMessage);

  return (
    <ChatRoomShell
      roomId={roomId}
      userId={session.user.id}
      username={session.user.username || "user"}
      userImage={me?.image ?? session.user.image ?? null}
      userSupportTier={me?.supportTierSent ?? "PEBBLE"}
      initialMessages={initialMessages}
      header={{
        displayName: meta.displayName,
        displayImage: meta.displayImage,
        profileUsername: meta.profileUsername,
        supportTierSent: meta.supportTierSent,
        roomType: room.type,
        otherUserId: otherMember?.id,
      }}
      groupMeta={
        groupMeta && "room" in groupMeta && groupMeta.room
          ? {
              roomType: groupMeta.room.type,
              isOwner: groupMeta.isOwner ?? false,
              announcementTitle: groupMeta.room.announcementTitle,
              announcementBody: groupMeta.room.announcementBody,
              voiceLive: groupMeta.room.voiceLive,
              voiceChannelId: groupMeta.room.voiceChannelId,
              polls: groupMeta.polls ?? [],
              joinCode: groupMeta.room.joinCode,
            }
          : null
      }
    />
  );
}
