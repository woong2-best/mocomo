import type { ContentVisibility } from "@prisma/client";
import { db } from "@/lib/db";
import {
  isVisibilityPublic,
  meetsVisibilityRequirement,
  type ActiveSubscription,
} from "@/lib/creator-subscription";
import type { PostMediaAccessRow } from "@/lib/post-paid-media";

export type ContentLockReason = "none" | "subscription" | "purchase";

export type EnrichedMediaAccess = PostMediaAccessRow & {
  locked: boolean;
  lockReason: ContentLockReason;
  instantPurchasePriceKrw: number;
  visibility: ContentVisibility;
};

export function resolveInstantPurchasePrice(
  mediaPriceKrw: number | null | undefined,
  postInstantPriceKrw: number | null | undefined
): number {
  const media = mediaPriceKrw ?? 0;
  const post = postInstantPriceKrw ?? 0;
  if (media > 0) return media;
  return post;
}

export function isMediaContentLocked(input: {
  viewerId: string | null | undefined;
  authorId: string;
  visibility: ContentVisibility;
  instantPurchasePriceKrw: number;
  mediaPriceKrw?: number | null;
  purchased: boolean;
  subscription: ActiveSubscription | null | undefined;
}): { locked: boolean; lockReason: ContentLockReason; priceKrw: number } {
  const priceKrw = resolveInstantPurchasePrice(input.mediaPriceKrw, input.instantPurchasePriceKrw);

  if (input.viewerId && input.viewerId === input.authorId) {
    return { locked: false, lockReason: "none", priceKrw: priceKrw };
  }

  if (input.purchased) {
    return { locked: false, lockReason: "none", priceKrw: priceKrw };
  }

  if (priceKrw > 0 && !meetsVisibilityRequirement(input.visibility, input.subscription)) {
    return { locked: true, lockReason: "purchase", priceKrw: priceKrw };
  }

  if (!isVisibilityPublic(input.visibility) && !meetsVisibilityRequirement(input.visibility, input.subscription)) {
    if (priceKrw > 0) {
      return { locked: true, lockReason: "purchase", priceKrw: priceKrw };
    }
    return { locked: true, lockReason: "subscription", priceKrw: 0 };
  }

  if (priceKrw > 0) {
    return { locked: true, lockReason: "purchase", priceKrw: priceKrw };
  }

  return { locked: false, lockReason: "none", priceKrw: 0 };
}

export async function getSubscriptionsForViewer(
  viewerId: string | null | undefined,
  creatorIds: string[]
): Promise<Map<string, ActiveSubscription>> {
  const map = new Map<string, ActiveSubscription>();
  if (!viewerId || creatorIds.length === 0) return map;

  const rows = await db.subscription.findMany({
    where: { subscriberId: viewerId, creatorId: { in: creatorIds }, status: "active" },
    select: { creatorId: true, subscribedSince: true, currentPeriodEnd: true, status: true },
  });

  for (const row of rows) {
    map.set(row.creatorId, row);
  }
  return map;
}

export function attachPostContentAccess<
  T extends {
    authorId: string;
    visibility?: ContentVisibility;
    instantPurchasePriceKrw?: number;
    media?: PostMediaAccessRow[];
  }
>(
  post: T,
  viewerId: string | null | undefined,
  purchasedIds: Set<string>,
  subscription: ActiveSubscription | null | undefined
): T & { media?: EnrichedMediaAccess[] } {
  const visibility = post.visibility ?? "PUBLIC";
  const postInstant = post.instantPurchasePriceKrw ?? 0;

  if (!post.media?.length) return post as T & { media?: EnrichedMediaAccess[] };

  return {
    ...post,
    media: post.media.map((m) => {
      const { locked, lockReason, priceKrw } = isMediaContentLocked({
        viewerId,
        authorId: post.authorId,
        visibility,
        instantPurchasePriceKrw: postInstant,
        mediaPriceKrw: m.priceKrw,
        purchased: purchasedIds.has(m.id),
        subscription,
      });
      return {
        ...m,
        locked,
        lockReason,
        instantPurchasePriceKrw: priceKrw,
        visibility,
      };
    }),
  };
}
