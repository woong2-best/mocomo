import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export type UsedAuctionNoticeType =
  | "bid"
  | "outbid"
  | "won"
  | "ended"
  | "buy_now"
  | "payment_reminder"
  | "payment_failed"
  | "transfer"
  | "price_offer"
  | "price_accept"
  | "price_reject"
  | "deal_done"
  | "reminder"
  | "extended"
  | "lost";

export async function sendUsedAuctionNotification(data: {
  userId: string;
  type: UsedAuctionNoticeType;
  title: string;
  body?: string;
  link: string;
  actorId?: string;
}) {
  await createNotification({
    userId: data.userId,
    actorId: data.actorId,
    type: `used_auction_${data.type}`,
    title: data.title,
    body: data.body,
    link: data.link,
  });
}

/** 판매자 + 아직 유효한 입찰자 */
export async function notifyAuctionWatchers(input: {
  listingId: string;
  sellerId: string;
  type: UsedAuctionNoticeType;
  title: string;
  body: string;
}) {
  const bids = await db.usedAuctionBid.findMany({
    where: {
      listingId: input.listingId,
      bidStatus: { in: ["ACTIVE", "WINNER"] },
    },
    select: { bidderId: true },
    distinct: ["bidderId"],
  });
  const userIds = new Set<string>([input.sellerId]);
  for (const bid of bids) userIds.add(bid.bidderId);
  const link = `/market/${input.listingId}`;
  await Promise.all(
    [...userIds].map((userId) =>
      sendUsedAuctionNotification({
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link,
      })
    )
  );
}

/** 낙찰자·판매자를 뺀 입찰자에게 유찰 */
export async function notifyAuctionLosers(input: {
  listingId: string;
  sellerId: string;
  winnerId: string | null;
  title: string;
  body: string;
}) {
  const bids = await db.usedAuctionBid.findMany({
    where: { listingId: input.listingId },
    select: { bidderId: true },
    distinct: ["bidderId"],
  });
  const skip = new Set([input.sellerId, input.winnerId].filter((id): id is string => Boolean(id)));
  const link = `/market/${input.listingId}`;
  await Promise.all(
    bids
      .filter((bid) => !skip.has(bid.bidderId))
      .map((bid) =>
        sendUsedAuctionNotification({
          userId: bid.bidderId,
          type: "lost",
          title: input.title,
          body: input.body,
          link,
        })
      )
  );
}
