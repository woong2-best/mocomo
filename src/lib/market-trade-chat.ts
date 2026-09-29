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

/** 상품 상세에서만 여는 마켓 메시지. 일반 DM 방을 재사용하지 않는다. */
export async function openMarketListingChat(actorId: string, listingId: string) {
  const listing = await db.usedListing.findUnique({ where: { id: listingId } });
  if (!listing) return { error: "게시글을 찾을 수 없습니다." as const };
  if (listing.status === "SOLD") return { error: "이미 거래 완료된 상품입니다." as const };
  if (isAuctionLive(listing)) {
    return { error: "경매 진행 중에는 메시지 대신 입찰을 이용해 주세요." as const };
  }

  const winnerId = listing.winningBidderId ?? listing.currentBidderId;
  let buyerId: string;
  if (listing.saleType === "AUCTION") {
    if (!winnerId) return { error: "낙찰자가 없습니다." as const };
    if (listing.sellerId !== actorId && winnerId !== actorId) {
      return { error: "판매자와 낙찰자만 거래 메시지를 열 수 있습니다." as const };
    }
    buyerId = winnerId;
  } else {
    if (listing.sellerId === actorId) return { error: "본인 글에는 메시지를 보낼 수 없습니다." as const };
    buyerId = actorId;
  }

  const existing = await db.usedListingChat.findUnique({
    where: { listingId_buyerId: { listingId, buyerId } },
    select: { roomId: true },
  });
  if (existing) {
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
    return { error: "거래 메시지를 열 수 없습니다." as const };
  }
}
