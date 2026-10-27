import { db } from "@/lib/db";
import { notifyChatMessage } from "@/lib/notifications";
import { listingImages } from "@/lib/used-market";
import { isAuctionLive } from "@/lib/used-auction";
import { ensureAuctionDirectTrade } from "@/lib/direct-trade/service";
import { safeLogWarn } from "@/lib/safe-log";
import { normalizeChatAttachmentUrl } from "@/lib/chat-attachments";
import {
  encodeUsedListingMessage,
  usedListingAttachmentName,
} from "@/lib/chat-used-listing-share";
import {
  chatMessageInclude,
  serializeChatMessageForRelay,
} from "@/lib/chat-message-serialize";
import { relayChatMessageToSocket } from "@/lib/chat-socket-relay";
import { reactivateChatMember, reactivateChatMembers } from "@/lib/chat-exit";

/** 판매 완료된 상품 대화에는 새 메시지를 넣지 않는다. 예약 중은 그대로 보낸다. */
export async function usedListingChatSendBlock(roomId: string) {
  const link = await db.usedListingChat.findUnique({
    where: { roomId },
    select: { listing: { select: { status: true } } },
  });
  if (link?.listing.status === "SOLD") return "LISTING_SOLD" as const;
  return null;
}

/** 상품 상세에서만 여는 마켓 메시지. 일반 DM 방을 재사용하지 않는다. */
export async function openMarketListingChat(actorId: string, listingId: string) {
  const listing = await db.usedListing.findUnique({ where: { id: listingId } });
  if (!listing) return { error: "Listing not found." as const };
  if (listing.status === "SOLD") return { error: "This item has already been sold." as const };
  if (listing.saleType === "AUCTION" && isAuctionLive(listing)) {
    const leaderId = listing.currentBidderId;
    const allowed = actorId === listing.sellerId || (leaderId != null && actorId === leaderId);
    if (!allowed) {
      return { error: "During an auction, please bid instead of sending messages." as const };
    }
  }

  const winnerId = listing.winningBidderId ?? listing.currentBidderId;
  let buyerId: string;
  if (listing.saleType === "AUCTION") {
    if (!winnerId) return { error: "No winning bidder." as const };
    if (listing.sellerId !== actorId && winnerId !== actorId) {
      return { error: "Only the seller and winning bidder can open trade messages." as const };
    }
    buyerId = winnerId;
  } else {
    if (listing.sellerId === actorId) return { error: "You can't message your own listing." as const };
    buyerId = actorId;
  }

  const existing = await db.usedListingChat.findUnique({
    where: { listingId_buyerId: { listingId, buyerId } },
    select: { roomId: true },
  });
  if (existing) {
    await reactivateChatMember(existing.roomId, actorId);
    await db.chatRoom.update({
      where: { id: existing.roomId },
      data: { updatedAt: new Date() },
    });
    await ensureAuctionDirectTrade({
      listingId,
      roomId: existing.roomId,
      buyerId,
      sellerId: listing.sellerId,
    });
    return { roomId: existing.roomId };
  }

  const intro = encodeUsedListingMessage(listing.id);
  const photoUrl = normalizeChatAttachmentUrl(listingImages(listing.images)[0] ?? "");

  try {
    const room = await db.$transaction(async (tx) => {
      const created = await tx.chatRoom.create({
        data: {
          type: "MARKET",
          name: listing.title.slice(0, 80),
          isPublic: false,
          createdById: actorId,
          members: {
            create: [
              { userId: listing.sellerId, role: "owner" },
              { userId: buyerId, role: "member" },
            ],
          },
        },
      });
      await tx.usedListingChat.create({
        data: { listingId, roomId: created.id, buyerId },
      });
      await tx.message.create({
        data: {
          roomId: created.id,
          senderId: actorId,
          content: intro,
          attachments: photoUrl
            ? {
                create: [
                  {
                    url: photoUrl,
                    type: "IMAGE",
                    name: usedListingAttachmentName(listing.id),
                  },
                ],
              }
            : undefined,
        },
      });
      return created;
    });
    await ensureAuctionDirectTrade({
      listingId,
      roomId: room.id,
      buyerId,
      sellerId: listing.sellerId,
    });
    void notifyChatMessage({
      roomId: room.id,
      senderId: actorId,
      content: listing.title,
      roomType: "MARKET",
    });
    const createdMessage = await db.message.findFirst({
      where: { roomId: room.id },
      orderBy: { createdAt: "desc" },
      include: chatMessageInclude,
    });
    if (createdMessage) {
      void relayChatMessageToSocket(room.id, serializeChatMessageForRelay(createdMessage));
    }
    return { roomId: room.id };
  } catch (error) {
    const again = await db.usedListingChat.findUnique({
      where: { listingId_buyerId: { listingId, buyerId } },
      select: { roomId: true },
    });
    if (again) {
      await ensureAuctionDirectTrade({
        listingId,
        roomId: again.roomId,
        buyerId,
        sellerId: listing.sellerId,
      });
      return { roomId: again.roomId };
    }
    safeLogWarn("market-trade-chat", {
      listingId,
      error: error instanceof Error ? error.message : "open_failed",
    });
    return { error: "Couldn't open trade messages." as const };
  }
}

/** After a bid becomes the high bid, open seller↔bidder messages with the final-bidder line. */
export async function announceAuctionLeader(input: {
  listingId: string;
  sellerId: string;
  bidderId: string;
}): Promise<string | null> {
  if (input.sellerId === input.bidderId) return null;
  const bidder = await db.user.findUnique({
    where: { id: input.bidderId },
    select: { name: true, username: true },
  });
  const name = bidder?.name?.trim() || bidder?.username || "회원";
  const content = `최종 입찰자 ${name} 님입니다`;

  const existing = await db.usedListingChat.findUnique({
    where: { listingId_buyerId: { listingId: input.listingId, buyerId: input.bidderId } },
    select: { roomId: true },
  });

  let roomId = existing?.roomId ?? null;
  if (!roomId) {
    const room = await db.chatRoom.create({
      data: {
        type: "MARKET",
        isPublic: false,
        createdById: input.bidderId,
        members: {
          create: [
            { userId: input.sellerId, role: "owner" },
            { userId: input.bidderId, role: "member" },
          ],
        },
      },
      select: { id: true },
    });
    roomId = room.id;
    await db.usedListingChat.create({
      data: { listingId: input.listingId, roomId, buyerId: input.bidderId },
    });
  }

  const already = await db.message.findFirst({
    where: { roomId, content, isSystemMessage: true },
    select: { id: true },
  });
  if (!already) {
    const message = await db.message.create({
      data: {
        roomId,
        senderId: input.bidderId,
        content,
        isSystemMessage: true,
      },
      include: chatMessageInclude,
    });
    await db.chatRoom.update({ where: { id: roomId }, data: { updatedAt: new Date() } });
    await reactivateChatMembers(roomId);
    void notifyChatMessage({
      roomId,
      senderId: input.bidderId,
      content,
      roomType: "MARKET",
    });
    void relayChatMessageToSocket(roomId, serializeChatMessageForRelay(message));
  }

  return roomId;
}
