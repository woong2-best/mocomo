import { createNotification } from "@/lib/notifications";

export async function sendUsedAuctionNotification(data: {
  userId: string;
  type: "bid" | "outbid" | "won" | "ended" | "buy_now";
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
