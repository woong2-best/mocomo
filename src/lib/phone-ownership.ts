import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";

export const PHONE_ONE_ACCOUNT_MSG =
  "This phone number is already registered to another account. One number per account.";

export const PHONE_ALREADY_ON_ACCOUNT_MSG =
  "This account already completed phone verification. One number per account.";

export const PHONE_PENDING_OTHER_MSG =
  "Verification is in progress for another number. Finish with the current number or wait for the code to expire to change it.";

/** 다른 계정이 이 번호를 인증해 쓰는지 확인 */
export async function findPhoneRegisteredByOtherUser(
  phoneE164: string,
  currentUserId: string,
  prisma: PrismaClient = db
) {
  return prisma.user.findFirst({
    where: {
      phone: phoneE164,
      phoneVerified: { not: null },
      id: { not: currentUserId },
    },
    select: { id: true, username: true, phoneVerified: true },
  });
}

export async function assertPhoneExclusiveToAccount(
  phoneE164: string,
  currentUserId: string,
  prisma: PrismaClient = db
): Promise<{ ok: true } | { ok: false; error: string }> {
  const other = await findPhoneRegisteredByOtherUser(phoneE164, currentUserId, prisma);
  if (other) {
    return { ok: false, error: PHONE_ONE_ACCOUNT_MSG };
  }
  return { ok: true };
}
