import { scheduleAptNotification, sendAptNotificationsMany } from "./notification-service";
import { APT_DEEP_LINKS } from "./apt-notification-types";

export function notifyMarketSold(input: {
  sellerId: string;
  itemLabel: string;
  priceGold: number;
  listingId: string;
  buyerName?: string | null;
}) {
  scheduleAptNotification({
    userId: input.sellerId,
    type: "MARKET_SOLD",
    title: "판매 완료",
    body: `${input.itemLabel} · +${input.priceGold.toLocaleString()}G${input.buyerName ? ` · ${input.buyerName}` : ""}`,
    payload: {
      href: APT_DEEP_LINKS.market,
      listingId: input.listingId,
      gold: input.priceGold,
    },
  });
}

export function notifyMarketPurchase(input: {
  buyerId: string;
  itemLabel: string;
  priceGold: number;
  listingId: string;
}) {
  scheduleAptNotification({
    userId: input.buyerId,
    type: "MARKET_PURCHASE",
    title: "구매 완료",
    body: `${input.itemLabel} · -${input.priceGold.toLocaleString()}G`,
    payload: {
      href: APT_DEEP_LINKS.inventory,
      listingId: input.listingId,
      gold: -input.priceGold,
    },
  });
}

export function notifyMarketCancelled(input: {
  sellerId: string;
  itemLabel: string;
  listingId: string;
  reason?: string;
}) {
  scheduleAptNotification({
    userId: input.sellerId,
    type: "MARKET_CANCELLED",
    title: "장터 등록 취소",
    body: `${input.itemLabel}${input.reason ? ` · ${input.reason}` : ""}`,
    payload: { href: APT_DEEP_LINKS.market, listingId: input.listingId },
  });
}

export function notifyShopPurchase(input: {
  userId: string;
  itemLabel: string;
  priceGold: number;
  itemId: string;
  correlationId?: string;
}) {
  scheduleAptNotification({
    userId: input.userId,
    type: "SHOP_PURCHASE",
    title: "Shop 구매",
    body: `${input.itemLabel} · -${input.priceGold.toLocaleString()}G`,
    payload: {
      href: APT_DEEP_LINKS.inventory,
      itemId: input.itemId,
      gold: -input.priceGold,
    },
    correlationId: input.correlationId,
  });
}

export function notifyLiveReward(input: {
  userId: string;
  gold: number;
  reason: string;
}) {
  scheduleAptNotification({
    userId: input.userId,
    type: "LIVE_REWARD",
    title: "라이브 보상",
    body: `${input.reason} · +${input.gold.toLocaleString()}G`,
    payload: { href: APT_DEEP_LINKS.live, gold: input.gold },
  });
}

export function notifyLiveDailyLimit(userId: string) {
  scheduleAptNotification({
    userId,
    type: "LIVE_DAILY_LIMIT",
    title: "라이브 일일 한도",
    body: "오늘 라이브 골드 한도에 도달했습니다.",
    payload: { href: APT_DEEP_LINKS.live },
  });
}

export function notifyFraudWarn(userId: string, reason: string) {
  scheduleAptNotification({
    userId,
    type: "FRAUD_WARN",
    title: "계정 경고",
    body: reason,
    payload: { href: "/notifications" },
  });
}

export function notifyFraudWatch(userId: string) {
  scheduleAptNotification({
    userId,
    type: "FRAUD_WATCH",
    title: "Watch 상태",
    body: "비정상 거래 패턴이 감지되어 모니터링 중입니다.",
    payload: { href: "/notifications" },
  });
}

export function notifyFraudFreeze(userId: string, reason: string) {
  scheduleAptNotification({
    userId,
    type: "FRAUD_FREEZE",
    title: "계정 동결",
    body: reason,
    payload: { href: "/notifications" },
  });
}

export function notifyFraudUnfreeze(userId: string) {
  scheduleAptNotification({
    userId,
    type: "FRAUD_UNFREEZE",
    title: "동결 해제",
    body: "계정 제한이 해제되었습니다.",
    payload: { href: APT_DEEP_LINKS.market },
  });
}

export function notifyFleaStarted(input: {
  userIds: string[];
  title: string;
  eventId: string;
}) {
  const rows = input.userIds.map((userId) => ({
    userId,
    type: "FLEA_STARTED" as const,
    title: "벼룩시장 시작",
    body: `「${input.title}」이 시작됐습니다.`,
    payload: { href: APT_DEEP_LINKS.flea, eventId: input.eventId },
  }));
  void sendAptNotificationsMany(rows);
}

export function notifyAdminNotice(input: {
  userIds: string[];
  title: string;
  body: string;
  href?: string;
  correlationId?: string;
}) {
  for (const userId of input.userIds) {
    scheduleAptNotification({
      userId,
      type: "ADMIN_NOTICE",
      title: input.title,
      body: input.body,
      payload: { href: input.href ?? APT_DEEP_LINKS.notifications },
      correlationId: input.correlationId,
    });
  }
}

export function notifyIapPurchase(input: {
  userId: string;
  productTitle: string;
  gemsGranted: number;
  goldGranted: number;
  correlationId?: string;
}) {
  const parts: string[] = [];
  if (input.gemsGranted > 0) parts.push(`${input.gemsGranted} Gems 지급`);
  if (input.goldGranted > 0) parts.push(`${input.goldGranted} Gold 지급`);
  scheduleAptNotification({
    userId: input.userId,
    type: "IAP_PURCHASE",
    title: "결제가 완료되었습니다",
    body: parts.join(" · ") || input.productTitle,
    payload: { href: APT_DEEP_LINKS.shop },
    correlationId: input.correlationId,
  });
}

export function notifyIapRefund(input: {
  userId: string;
  productId: string;
  gemsRevoked: number;
  correlationId?: string;
}) {
  scheduleAptNotification({
    userId: input.userId,
    type: "IAP_REFUND",
    title: "결제 환불",
    body: `${input.productId} 구매가 환불 처리되었습니다.`,
    payload: { href: APT_DEEP_LINKS.notifications },
    correlationId: input.correlationId,
  });
}

export async function notifyIapRefundAdmin(input: {
  orderId: string;
  userId: string;
  reason: string;
  correlationId: string;
}) {
  const { db } = await import("@/lib/db");
  const admins = await db.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
    take: 10,
  });
  if (!admins.length) return;
  await notifyAdminNotice({
    userIds: admins.map((a) => a.id),
    title: "IAP Refund",
    body: `${input.orderId} · ${input.reason}`,
    href: "/admin/economy/logs",
    correlationId: input.correlationId,
  });
}

export async function notifyIapAckErrorAdmin(input: {
  orderId: string;
  error: string;
  correlationId: string;
}) {
  const { db } = await import("@/lib/db");
  const admins = await db.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
    take: 10,
  });
  if (!admins.length) return;
  await notifyAdminNotice({
    userIds: admins.map((a) => a.id),
    title: "IAP Ack Error",
    body: `${input.orderId}: ${input.error}`,
    href: "/admin/economy/health",
    correlationId: input.correlationId,
  });
}
