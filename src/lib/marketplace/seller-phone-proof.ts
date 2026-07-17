import { db } from "@/lib/db";
import { sellerPhoneProofIdentifier } from "@/lib/auth-tokens";
import {
  assertPhoneExclusiveToAccount,
  PHONE_ONE_ACCOUNT_MSG,
} from "@/lib/phone-ownership";

/** 가입 시 phoneProof 소비 + User.phone 연결 */
export async function consumeSellerPhoneProof(
  phoneE164: string,
  phoneProof: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (phoneProof === "session-verified") {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { phone: true, phoneVerified: true },
    });
    if (user?.phoneVerified && user.phone === phoneE164) return { ok: true };
    return { ok: false, error: "휴대폰 인증이 필요합니다." };
  }

  const proofId = sellerPhoneProofIdentifier(phoneE164);
  const row = await db.verificationToken.findFirst({
    where: { identifier: proofId, token: phoneProof },
    orderBy: { expires: "desc" },
  });
  if (!row || row.expires < new Date()) {
    return { ok: false, error: "휴대폰 인증이 만료되었습니다. 다시 인증해 주세요." };
  }

  const exclusive = await assertPhoneExclusiveToAccount(phoneE164, userId);
  if (!exclusive.ok) return { ok: false, error: exclusive.error };

  try {
    await db.$transaction(async (tx) => {
      const conflict = await tx.user.findFirst({
        where: {
          phone: phoneE164,
          phoneVerified: { not: null },
          id: { not: userId },
        },
        select: { id: true },
      });
      if (conflict) throw new Error("PHONE_TAKEN");

      await tx.user.update({
        where: { id: userId },
        data: { phone: phoneE164, phoneVerified: new Date() },
      });
      await tx.verificationToken.deleteMany({ where: { identifier: proofId } });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "PHONE_TAKEN") {
      return { ok: false, error: PHONE_ONE_ACCOUNT_MSG };
    }
    const code =
      e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "P2002") return { ok: false, error: PHONE_ONE_ACCOUNT_MSG };
    throw e;
  }

  return { ok: true };
}
