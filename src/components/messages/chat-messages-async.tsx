import { getCachedAuthUserMinimal, getCachedSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { ChatRoomClient } from "@/components/chat/chat-room";
import { GroupRoomPanel } from "@/components/chat/group-room-panel";
import { getGroupRoomMeta } from "@/actions/group-chat";
import { userPublicSelectMinimal } from "@/lib/user-public-select";

export async function ChatMessagesAsync({ roomId }: { roomId: string }) {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect(`/auth/signin?callbackUrl=/messages/${roomId}`);

  const room = await db.chatRoom.findUnique({
    where: { id: roomId },
    select: { type: true },
  });
  if (!room) notFound();

  const [member, me, messages] = await Promise.all([
    db.chatMember.findUnique({
      where: { roomId_userId: { roomId, userId: session.user.id } },
    }),
    getCachedAuthUserMinimal(),
    db.message.findMany({
      where: { roomId },
      take: 50,
      orderBy: { createdAt: "asc" },
      include: { sender: { select: userPublicSelectMinimal } },
    }),
  ]);
  if (!member) notFound();

  const isGroupRoom = room.type === "COSPLAYER_GROUP" || room.type === "SOCIAL_GROUP";
  const groupMeta = isGroupRoom ? await getGroupRoomMeta(roomId) : null;

  const initialMessages = messages.map((m) => ({
    id: m.id,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    sender: m.sender,
  }));

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {groupMeta && "room" in groupMeta && groupMeta.room ? (
        <GroupRoomPanel
          roomId={roomId}
          roomType={groupMeta.room.type}
          isOwner={groupMeta.isOwner ?? false}
          announcementTitle={groupMeta.room.announcementTitle}
          announcementBody={groupMeta.room.announcementBody}
          voiceLive={groupMeta.room.voiceLive}
          voiceChannelId={groupMeta.room.voiceChannelId}
          polls={groupMeta.polls ?? []}
          joinCode={groupMeta.room.joinCode}
        />
      ) : null}
      <ChatRoomClient
        roomId={roomId}
        userId={session.user.id}
        username={session.user.username || "user"}
        userImage={me?.image ?? session.user.image ?? null}
        userSupportTier={me?.supportTierSent ?? "PEBBLE"}
        initialMessages={initialMessages}
      />
    </div>
  );
}
