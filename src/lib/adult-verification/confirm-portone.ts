import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { db } from "@/lib/db";
import type { AdultVerificationScope } from "@prisma/client";
import { ipFingerprint } from "@/lib/bank-account-fingerprint";
import { fetchPortOneIdentityVerification } from "@/lib/portone/identity-verification-client";
import { ADULT_VERIFICATION_UNDERAGE_MSG } from "./constants";
import {
  ageFromBirthDate,
  isAdultVerified,
  parsePortOneBirthDate,
} from "./is-verified";

export async function confirmPortOneAdultVerification(input: {
  userId: string;
  identityVerificationId: string;
  scope?: AdultVerificationScope;
  ip?: string;
}) {
  const id = input.identityVerificationId.trim();
  if (!id || id.length > 128) {
    return { error: t("lib.adult-verification.s6cgjmi") };
  }

  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { id: true, adultVerifiedAt: true },
  });
  if (!user) return { error: t("lib.live-support.svypth4") };

  if (isAdultVerified(user)) {
    void import("@/lib/creator-dm-marketing")
      .then(({ flushPendingWelcomeDmsForFollower }) => flushPendingWelcomeDmsForFollower(user.id))
      .catch(() => undefined);
    return { success: true as const, alreadyVerified: true as const, isAdult: true };
  }

  const reused = await db.adultVerificationLog.findUnique({
    where: { portoneVerificationId: id },
    select: { userId: true },
  });
  if (reused && reused.userId !== user.id) {
    return { error: t("lib.adult-verification.s1teqskv") };
  }

  let verification;
  try {
    verification = await fetchPortOneIdentityVerification(id);
  } catch {
    return { error: t("lib.adult-verification.s14sev3z") };
  }

  if (verification.status !== "VERIFIED") {
    return { error: t("lib.adult-verification.sogh7pm") };
  }

  const birthRaw = verification.verifiedCustomer?.birthDate;
  if (!birthRaw) return { error: t("lib.adult-verification.svy4xk4") };

  const birthDate = parsePortOneBirthDate(birthRaw);
  if (!birthDate) return { error: t("lib.adult-verification.s5y9f9c") };

  const age = ageFromBirthDate(birthDate);
  if (age < 19) {
    return { error: ADULT_VERIFICATION_UNDERAGE_MSG };
  }

  const now = new Date();
  const scope = input.scope ?? "GLOBAL";
  const ipHash = input.ip ? ipFingerprint(input.ip) : null;

  try {
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { adultVerifiedAt: now, birthDate },
      });
      await tx.adultVerificationLog.upsert({
        where: { portoneVerificationId: id },
        create: {
          userId: user.id,
          portoneVerificationId: id,
          verifiedAt: now,
          birthDate,
          scope,
          ipHash,
        },
        update: {},
      });
    });
  } catch (e) {
    console.error("[confirmPortOneAdultVerification]", e);
    return { error: t("lib.adult-verification.s1uex9go") };
  }

  void import("@/lib/creator-dm-marketing")
    .then(({ flushPendingWelcomeDmsForFollower }) => flushPendingWelcomeDmsForFollower(user.id))
    .catch(() => undefined);

  return { success: true as const, isAdult: true };
}
