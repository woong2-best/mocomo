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
    return { error: "잘못된 인증 요청입니다." };
  }

  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { id: true, adultVerifiedAt: true },
  });
  if (!user) return { error: "사용자를 찾을 수 없습니다." };

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
    return { error: "이미 사용된 인증입니다." };
  }

  let verification;
  try {
    verification = await fetchPortOneIdentityVerification(id);
  } catch {
    return { error: "본인인증 확인에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  if (verification.status !== "VERIFIED") {
    return { error: "본인인증이 완료되지 않았습니다." };
  }

  const birthRaw = verification.verifiedCustomer?.birthDate;
  if (!birthRaw) return { error: "생년월일 정보를 확인할 수 없습니다." };

  const birthDate = parsePortOneBirthDate(birthRaw);
  if (!birthDate) return { error: "생년월일 형식이 올바르지 않습니다." };

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
    return { error: "성인 인증 저장에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  void import("@/lib/creator-dm-marketing")
    .then(({ flushPendingWelcomeDmsForFollower }) => flushPendingWelcomeDmsForFollower(user.id))
    .catch(() => undefined);

  return { success: true as const, isAdult: true };
}
