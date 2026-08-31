"use server";

import { requireAuth } from "@/lib/auth";
import { isAdultVerified } from "@/lib/adult-verification/is-verified";

export async function getAdultVerificationStatus() {
  const user = await requireAuth();
  return {
    isAdult: isAdultVerified(user),
    adultVerifiedAt: user.adultVerifiedAt?.toISOString() ?? null,
  };
}
