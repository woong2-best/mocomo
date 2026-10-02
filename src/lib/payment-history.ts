import type { PaymentIntentType } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveEarningCategory } from "@/lib/wallet-earning-categories";

export type PaymentHistoryItem = {
  id: string;
  type: PaymentIntentType;
  typeLabel: string;
  amount: number;
  paidAt: Date;
  /** 구매한 크리에이터 @username */
  creatorUsername: string | null;
  creatorDisplayName: string | null;
  /** 쿠팡·은행명 자리 — 무엇을 샀는지 */
  contentTitle: string;
  /** 전자지급 자리 — 부가 설명 */
  contentSubtitle: string | null;
  href: string | null;
  category: ReturnType<typeof resolveEarningCategory>;
};

const TYPE_LABELS: Record<PaymentIntentType, string> = {
  TIP: "Tip",
  PRODUCT: "Digital product",
  PREMIUM: "Premium",
  EMOTICON: "Emoticons",
  LISTING_FEE: "Registration fee",
  VENDOR_ONBOARDING_FEE: "Seller onboarding fee",
  PHYSICAL_GOODS: "Goods",
  EVENT_REGISTRATION: "Event",
  CREATOR_EPISODE: "Paid episode",
  POST_MEDIA: "Paid media",
  MESSAGE_MEDIA: "DM fan art",
  CREATOR_SUBSCRIPTION: "Membership subscription",
  STUDIO_ASSET: "Studio asset",
  MARKETPLACE: "Marketplace",
  USED_AUCTION_BID_HOLD: "Auction bid hold",
  FLOWER: "Flower",
  MOCO_TOPUP: "MOCO top-up ({v0})",
  GEM_TOPUP: "MOCO top-up ({v0})",
  CALL_BOOKING: "Currency reservation",
};

function metaStr(meta: Record<string, unknown>, key: string): string | null {
  const v = meta[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function getPaymentHistoryForUser(userId: string, take = 80): Promise<PaymentHistoryItem[]> {
  const intents = await db.paymentIntent.findMany({
    where: { userId, status: "PAID" },
    orderBy: { paidAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      amount: true,
      paidAt: true,
      metadata: true,
    },
  });

  if (intents.length === 0) return [];

  const metaList = intents.map((i) => (i.metadata ?? {}) as Record<string, unknown>);

  const mediaIds = [...new Set(metaList.map((m) => metaStr(m, "mediaId")).filter(Boolean))] as string[];
  const postIds = [...new Set(metaList.map((m) => metaStr(m, "postId")).filter(Boolean))] as string[];
  const receiverIds = [...new Set(metaList.map((m) => metaStr(m, "receiverId")).filter(Boolean))] as string[];
  const episodeIds = [...new Set(metaList.map((m) => metaStr(m, "episodeId")).filter(Boolean))] as string[];
  const productIds = [...new Set(metaList.map((m) => metaStr(m, "productId")).filter(Boolean))] as string[];
  const marketplaceOrderIds = [
    ...new Set(metaList.map((m) => metaStr(m, "marketplaceOrderId")).filter(Boolean)),
  ] as string[];
  const usernames = [
    ...new Set(metaList.map((m) => metaStr(m, "username")).filter(Boolean)),
  ] as string[];

  const [mediaRows, posts, receivers, episodes, products, orders, usersByName] = await Promise.all([
    mediaIds.length
      ? db.postMedia.findMany({
          where: { id: { in: mediaIds } },
          select: {
            id: true,
            type: true,
            postId: true,
            post: {
              select: {
                id: true,
                content: true,
                author: { select: { username: true, name: true } },
              },
            },
          },
        })
      : [],
    postIds.length
      ? db.post.findMany({
          where: { id: { in: postIds } },
          select: {
            id: true,
            content: true,
            author: { select: { username: true, name: true } },
          },
        })
      : [],
    receiverIds.length
      ? db.user.findMany({
          where: { id: { in: receiverIds } },
          select: { id: true, username: true, name: true },
        })
      : [],
    episodeIds.length
      ? db.creatorEpisode.findMany({
          where: { id: { in: episodeIds } },
          select: {
            id: true,
            title: true,
            author: { select: { username: true, name: true } },
          },
        })
      : [],
    productIds.length
      ? db.digitalProduct.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            title: true,
            seller: { select: { username: true, name: true } },
          },
        })
      : [],
    marketplaceOrderIds.length
      ? db.marketplaceOrder.findMany({
          where: { id: { in: marketplaceOrderIds } },
          select: {
            id: true,
            seller: { select: { username: true, name: true } },
            items: { take: 1, select: { titleSnapshot: true } },
          },
        })
      : [],
    usernames.length
      ? db.user.findMany({
          where: { username: { in: usernames } },
          select: { username: true, name: true },
        })
      : [],
  ]);

  const mediaById = new Map(mediaRows.map((m) => [m.id, m]));
  const postById = new Map(posts.map((p) => [p.id, p]));
  const receiverById = new Map(receivers.map((u) => [u.id, u]));
  const episodeById = new Map(episodes.map((e) => [e.id, e]));
  const productById = new Map(products.map((p) => [p.id, p]));
  const orderById = new Map(orders.map((o) => [o.id, o]));
  const userByUsername = new Map(usersByName.map((u) => [u.username, u]));

  function snippet(text: string | null | undefined, max = 36) {
    if (!text) return "Post";
    const t = text.replace(/\s+/g, " ").trim();
    return t.length <= max ? t : `${t.slice(0, max)}…`;
  }

  return intents.map((intent) => {
    const meta = (intent.metadata ?? {}) as Record<string, unknown>;
    const orderName = metaStr(meta, "orderName");
    const paidAt = intent.paidAt ?? new Date();
    let creatorUsername: string | null = metaStr(meta, "username");
    let creatorDisplayName: string | null = null;
    let contentTitle = orderName ?? TYPE_LABELS[intent.type] ?? intent.type;
    let contentSubtitle: string | null = "E-money";
    let href: string | null = null;
    let referenceType: string | null = null;

    if (intent.type === "TIP") {
      referenceType = "tip";
      const receiverId = metaStr(meta, "receiverId");
      const receiver = receiverId ? receiverById.get(receiverId) : null;
      if (receiver) {
        creatorUsername = receiver.username;
        creatorDisplayName = receiver.name;
      }
      contentTitle = creatorDisplayName ?? (creatorUsername ? `@${creatorUsername}` : "Creator");
      contentSubtitle = metaStr(meta, "message") ?? "Tip";
      href = creatorUsername ? `/u/${creatorUsername}` : "/support";
    }

    if (intent.type === "MESSAGE_MEDIA") {
      referenceType = "message_media";
      contentTitle = orderName ?? "DM fan art";
      contentSubtitle = creatorUsername ? `@${creatorUsername}` : "Fan art purchase";
      href = creatorUsername ? `/u/${creatorUsername}` : "/messages";
    }

    if (intent.type === "POST_MEDIA") {
      referenceType = "post_media";
      const mediaId = metaStr(meta, "mediaId");
      const media = mediaId ? mediaById.get(mediaId) : null;
      const postId = metaStr(meta, "postId") ?? media?.postId ?? media?.post?.id;
      const post = postId ? postById.get(postId) ?? media?.post : media?.post;
      if (post) {
        creatorUsername = post.author.username;
        creatorDisplayName = post.author.name;
        contentTitle =
          media?.type === "VIDEO"
            ? `${snippet(post.content)} · 영상`
            : `${snippet(post.content)} · 미디어`;
        href = `/post/${post.id}`;
      } else if (creatorUsername) {
        contentTitle = orderName ?? "Paid media";
        href = `/u/${creatorUsername}`;
      }
      contentSubtitle = creatorUsername ? `@${creatorUsername}` : "Paid media";
    }

    if (intent.type === "CREATOR_EPISODE") {
      referenceType = "creator_episode";
      const episodeId = metaStr(meta, "episodeId");
      const ep = episodeId ? episodeById.get(episodeId) : null;
      if (ep) {
        creatorUsername = ep.author.username;
        creatorDisplayName = ep.author.name;
        contentTitle = ep.title;
        href = `/works/e/${ep.id}`;
      }
      contentSubtitle = creatorUsername ? `@${creatorUsername}` : "Episode purchase";
    }

    if (intent.type === "CREATOR_SUBSCRIPTION") {
      referenceType = "creator_subscription";
      const u = creatorUsername ? userByUsername.get(creatorUsername) : null;
      if (u) creatorDisplayName = u.name;
      contentTitle = creatorDisplayName ?? (creatorUsername ? `@${creatorUsername}` : "Membership");
      contentSubtitle = "Monthly subscription";
      href = creatorUsername ? `/u/${creatorUsername}` : null;
    }

    if (intent.type === "PRODUCT") {
      referenceType = "digital_product";
      const productId = metaStr(meta, "productId");
      const product = productId ? productById.get(productId) : null;
      if (product) {
        creatorUsername = product.seller.username;
        creatorDisplayName = product.seller.name;
        contentTitle = product.title;
      }
      contentSubtitle = creatorUsername ? `@${creatorUsername}` : "Digital product";
      href = "/support";
    }

    if (intent.type === "MARKETPLACE") {
      referenceType = "marketplace";
      const orderId = metaStr(meta, "marketplaceOrderId");
      const order = orderId ? orderById.get(orderId) : null;
      if (order) {
        creatorUsername = order.seller.username;
        creatorDisplayName = order.seller.name;
        contentTitle = order.items[0]?.titleSnapshot ?? "Marketplace order";
        href = `/market/orders/${orderId}`;
      }
      contentSubtitle = creatorUsername ? `@${creatorUsername}` : "Marketplace";
    }

    if (intent.type === "MOCO_TOPUP") {
      contentTitle = "MOCO top-up ({v0})";
      contentSubtitle = "Balance top-up";
      href = "/wallet";
    }

    const category = resolveEarningCategory(referenceType, "SELLER_EARNING");

    return {
      id: intent.id,
      type: intent.type,
      typeLabel: TYPE_LABELS[intent.type] ?? intent.type,
      amount: intent.amount,
      paidAt,
      creatorUsername,
      creatorDisplayName,
      contentTitle,
      contentSubtitle,
      href,
      category,
    };
  });
}
