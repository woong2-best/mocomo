import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { getCachedAuthUserMinimal, getCachedSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { getConversationMeta } from "@/lib/chat-display";
import { getRequestLocale } from "@/lib/i18n/server";
import { chatMemberUserSelect } from "@/lib/user-public-select";
import { chatMessageInclude, serializeChatMessages } from "@/lib/chat-message-serialize";
import {
  collectPaidAttachmentIds,
  getPurchasedMessageAttachmentIds,
} from "@/lib/message-paid-media";
import { ChatRoomShell } from "@/components/messages/chat-room-shell";
import { contactPermissions } from "@/lib/contact-audience";
import { MESSAGE_REQUEST_BLOCKED } from "@/lib/contact-audience-copy";
import { areUsersBlocked } from "@/lib/user-block";
import { CHAT_REPORT_LOCK_MESSAGE_EN, CHAT_REPORT_LOCK_MESSAGE_KO } from "@/lib/chat-report-copy";

export async function ChatRoomShellAsync({ roomId }: { roomId: string }) {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect(`/auth/signin?callbackUrl=/messages/${roomId}`);

  const room = await db.chatRoom.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      type: true,
      name: true,
      status: true,
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
  const meta = getConversationMeta(room, session.user.id, locale);
  const isMarket = room.type === "MARKET";
  const roomLocked = room.status === "READ_ONLY";
  const otherMember =
    room.type === "DM" || isMarket
      ? room.members.find((m) => m.userId !== session.user.id)?.user
      : undefined;

  const dmBlocked =
    otherMember != null &&
    room.type === "DM" &&
    (await areUsersBlocked(session.user.id, otherMember.id));

  const usedTradePromise =
    room.type === "DM" || isMarket
      ? import("@/lib/used-market-mobile").then((m) =>
          m.getMobileUsedTradeRoomContext(session.user.id, roomId)
        )
      : Promise.resolve(null);

  const [me, messages, usedTrade] = await Promise.all([
    getCachedAuthUserMinimal(),
    dmBlocked
      ? Promise.resolve([])
      : db.message.findMany({
          where: { roomId },
          take: 50,
          orderBy: { createdAt: "asc" },
          include: chatMessageInclude,
        }),
    usedTradePromise,
  ]);

  const perms = dmBlocked
    ? { canMessage: false, canCall: false }
    : roomLocked
      ? { canMessage: false, canCall: false }
      : isMarket
        ? { canMessage: true, canCall: true }
        : otherMember
          ? await contactPermissions(session.user.id, otherMember.id)
          : { canMessage: true, canCall: true };

  const paidIds = collectPaidAttachmentIds(messages);
  const purchasedIds = await getPurchasedMessageAttachmentIds(session.user.id, paidIds);
  const initialMessages = serializeChatMessages(messages, session.user.id, purchasedIds);
  const lockHint = CHAT_REPORT_LOCK_MESSAGE_EN;
  const readOnlyHint = roomLocked
    ? lockHint
    : dmBlocked
      ? t("lib.chat.dm.service.sae2d9a6408")
      : perms.canMessage
        ? undefined
        : MESSAGE_REQUEST_BLOCKED;

  return (
    <ChatRoomShell
      roomId={roomId}
      userId={session.user.id}
      username={session.user.username || "user"}
      userImage={me?.image ?? session.user.image ?? null}
      userSupportTier={me?.supportTierSent ?? "SEED"}
      initialMessages={initialMessages}
      header={{
        displayName: meta.displayName,
        displayImage: meta.displayImage,
        profileUsername: meta.profileUsername,
        supportTierSent: meta.supportTierSent,
        roomType: room.type,
        otherUserId: otherMember?.id,
        otherTimeZone: otherMember?.timeZone,
        memberCount: room.members.length,
        members: room.members.map((m) => ({
          id: m.user.id,
          username: m.user.username,
          name: m.user.name,
          image: m.user.image,
          timeZone: m.user.timeZone,
        })),
      }}
      groupMeta={null}
      readOnly={!perms.canMessage || roomLocked}
      readOnlyHint={readOnlyHint}
      canCall={roomLocked ? false : perms.canCall}
      productId={usedTrade?.listingId}
    />
  );
}
