import { redirect, notFound } from "next/navigation";
import { getCachedSession, getCachedAuthUserMinimal } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChatRoomShell } from "@/components/messages/chat-room-shell";
import { chatMessageInclude, serializeChatMessage } from "@/lib/chat-message-serialize";
import { userPublicSelectMinimal } from "@/lib/user-public-select";
import { markCommunityChannelRead } from "@/actions/community-server";

export async function TextChannelView({
  roomId,
  channelId,
  channelName,
  communityId,
}: {
  roomId: string;
  channelId: string;
  channelName: string;
  communityId: string;
}) {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect(`/auth/signin`);

  const member = await db.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId: session.user.id } },
  });
  if (!member) notFound();

  await db.chatMember.upsert({
    where: { roomId_userId: { roomId, userId: session.user.id } },
    create: { roomId, userId: session.user.id, role: "member" },
    update: {},
  });

  const [room, me, messages] = await Promise.all([
    db.chatRoom.findUnique({
      where: { id: roomId },
      select: { type: true, name: true },
    }),
    getCachedAuthUserMinimal(),
    db.message.findMany({
      where: { roomId },
      take: 50,
      orderBy: { createdAt: "asc" },
      include: chatMessageInclude,
    }),
  ]);
  if (!room) notFound();

  const initialMessages = messages.map(serializeChatMessage);
  const lastMsg = messages[messages.length - 1];
  if (lastMsg) void markCommunityChannelRead(channelId, lastMsg.id);

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 px-4 py-3 border-b border-border/50">
        <h1 className="font-semibold"># {channelName}</h1>
      </header>
      <div className="flex-1 min-h-0 flex flex-col">
        <ChatRoomShell
          roomId={roomId}
          userId={session.user.id}
          username={session.user.username || "user"}
          userImage={me?.image ?? session.user.image ?? null}
          userSupportTier={me?.supportTierSent ?? "PEBBLE"}
          initialMessages={initialMessages}
          header={{
            displayName: channelName,
            displayImage: null,
            roomType: room.type,
          }}
          groupMeta={null}
        />
      </div>
    </div>
  );
}
