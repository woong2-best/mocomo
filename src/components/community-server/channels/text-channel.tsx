import { redirect, notFound } from "next/navigation";
import { getCachedSession, getCachedAuthUserMinimal } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChatRoomShell } from "@/components/messages/chat-room-shell";
import { chatMessageInclude, serializeChatMessage } from "@/lib/chat-message-serialize";
import { markCommunityChannelRead } from "@/actions/community-server";

export async function TextChannelView({
  roomId,
  channelId,
  channelName,
  communityId,
  isMember,
}: {
  roomId: string;
  channelId: string;
  channelName: string;
  communityId: string;
  isMember?: boolean;
}) {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect(`/auth/signin`);

  // layout/ctx에서 이미 멤버십을 확인했으면 중복 DB 조회 생략
  if (!isMember) {
    const member = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: session.user.id } },
      select: { id: true },
    });
    if (!member) notFound();
  }

  // chatMember upsert는 UI를 막지 않음
  void db.chatMember
    .upsert({
      where: { roomId_userId: { roomId, userId: session.user.id } },
      create: { roomId, userId: session.user.id, role: "member" },
      update: {},
    })
    .catch(() => undefined);

  const [room, me, messages] = await Promise.all([
    db.chatRoom.findUnique({
      where: { id: roomId },
      select: { type: true, name: true },
    }),
    getCachedAuthUserMinimal(),
    db.message.findMany({
      where: { roomId },
      take: 40,
      orderBy: { createdAt: "desc" },
      include: chatMessageInclude,
    }),
  ]);
  if (!room) notFound();

  // desc로 가져온 뒤 시간순 정렬
  const ordered = [...messages].reverse();
  const initialMessages = ordered.map(serializeChatMessage);
  const lastMsg = ordered[ordered.length - 1];
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
