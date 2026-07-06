import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";

export const PHONE_ONE_ACCOUNT_MSG =
  "이 휴대폰 번호는 이미 다른 계정에 등록되어 있습니다. 번호 하나당 계정 하나만 사용할 수 있습니다.";

export const PHONE_ALREADY_ON_ACCOUNT_MSG =
  "이 계정은 이미 휴대폰 인증이 완료된 상태입니다. 계정당 번호는 하나만 등록할 수 있습니다.";

export const PHONE_PENDING_OTHER_MSG =
  "다른 번호로 인증을 진행 중입니다. 기존 번호로 완료하거나, 인증번호 만료 후 번호를 변경해 주세요.";

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
