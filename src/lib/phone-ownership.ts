import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";

export const PHONE_ONE_ACCOUNT_MSG =
  "이 휴대폰 번호는 이미 다른 계정에 등록되어 있습니다. 번호 하나당 계정 하나만 사용할 수 있습니다.";

export const PHONE_ALREADY_ON_ACCOUNT_MSG =
  "이 계정은 이미 휴대폰 인증이 완료된 상태입니다.";

/** 다른 계정이 이 번호를 쓰는지 확인 (DB unique + 앱 이중 검사) */
export async function findPhoneRegisteredByOtherUser(
  phoneE164: string,
  currentUserId: string,
  prisma: PrismaClient = db
) {
  return prisma.user.findFirst({
    where: {
      phone: phoneE164,
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
