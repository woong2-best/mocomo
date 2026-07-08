import { redirect, notFound } from "next/navigation";
import { getCachedSession, getCachedAuthUserMinimal } from "@/lib/auth";
import { db } from "@/lib/db";
import { chatMessageInclude, serializeChatMessage } from "@/lib/chat-message-serialize";
import { markCommunityChannelRead } from "@/actions/community-server";
import { TextChannelShell } from "@/components/community-server/channels/text-channel-shell";

export async function TextChannelView({
  roomId,
  channelId,
  channelName,
  communityId,
  communitySlug,
  isPublic = true,
  readOnly = false,
}: {
  roomId: string;
  channelId: string;
  channelName: string;
  communityId: string;
  communitySlug: string;
  isPublic?: boolean;
  readOnly?: boolean;
}) {
  const session = await getCachedSession();
  const isGuest = !session?.user?.id;

  if (isGuest && !isPublic) {
    redirect(`/auth/signin?callbackUrl=/c/${communitySlug}`);
  }

  if (!isGuest && !readOnly) {
    void db.chatMember
      .upsert({
        where: { roomId_userId: { roomId, userId: session!.user!.id } },
        create: { roomId, userId: session!.user!.id, role: "member" },
        update: {},
      })
      .catch(() => undefined);
  }

  const [room, me, messages] = await Promise.all([
    db.chatRoom.findUnique({
      where: { id: roomId },
      select: { type: true, name: true },
    }),
    isGuest ? Promise.resolve(null) : getCachedAuthUserMinimal(),
    db.message.findMany({
      where: { roomId },
      take: 40,
      orderBy: { createdAt: "desc" },
      include: chatMessageInclude,
    }),
  ]);
  if (!room) notFound();

  const ordered = [...messages].reverse();
  const initialMessages = ordered.map(serializeChatMessage);
  const lastMsg = ordered[ordered.length - 1];
  if (lastMsg && !readOnly && !isGuest) void markCommunityChannelRead(channelId, lastMsg.id);

  const guestMode = isGuest;
  const effectiveReadOnly = readOnly || guestMode;

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 px-4 py-3 border-b border-border/50">
        <h1 className="font-semibold"># {channelName}</h1>
        {effectiveReadOnly && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {guestMode
              ? "게스트 읽기 전용 · 로그인 후 참여하면 채팅 가능"
              : "읽기 전용 · 참여 후 채팅 가능"}
          </p>
        )}
      </header>
      <div className="flex-1 min-h-0 flex flex-col">
        <TextChannelShell
          communityId={communityId}
          serverReadOnly={effectiveReadOnly}
          guestMode={guestMode}
          roomId={roomId}
          userId={session?.user?.id ?? "guest"}
          username={session?.user?.username || "게스트"}
          userImage={me?.image ?? session?.user?.image ?? null}
          userSupportTier={me?.supportTierSent ?? "PEBBLE"}
          initialMessages={initialMessages}
          header={{
            displayName: channelName,
            displayImage: null,
            roomType: room.type,
          }}
        />
      </div>
    </div>
  );
}
