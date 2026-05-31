import { db } from "@/lib/db";

export async function sendUsedAuctionNotification(data: {
  userId: string;
  type: "bid" | "outbid" | "won" | "ended" | "buy_now";
  title: string;
  body?: string;
  link: string;
}) {
  try {
    await db.notification.create({
      data: {
        userId: data.userId,
        type: `used_auction_${data.type}`,
        title: data.title,
        body: data.body,
        link: data.link,
      },
    });
  } catch {
    /* 알림 테이블 미적용 시 무시 */
  }
}
