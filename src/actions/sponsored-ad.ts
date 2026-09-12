"use server";

import { requireAuth } from "@/lib/auth";
import {
  purchaseSponsoredAd,
  SPONSORED_AD_TARGET_EVENT,
  type SponsoredAdTargetType,
} from "@/lib/sponsored-ad";

export async function purchaseEventSponsoredAd(eventId: string, days: number) {
  const user = await requireAuth();
  return purchaseSponsoredAd({
    userId: user.id,
    targetType: SPONSORED_AD_TARGET_EVENT,
    targetId: eventId,
    days,
  });
}

export async function purchaseSponsoredAdAction(input: {
  targetType: SponsoredAdTargetType;
  targetId: string;
  days: number;
}) {
  const user = await requireAuth();
  return purchaseSponsoredAd({
    userId: user.id,
    targetType: input.targetType,
    targetId: input.targetId,
    days: input.days,
  });
}
