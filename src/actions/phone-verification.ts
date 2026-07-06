"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  generateEmailCode,
  phoneCodeIdentifier,
  phonePendingIdentifier,
  scopedPhoneCodeToken,
  phoneCodeMatchesToken,
} from "@/lib/auth-tokens";
import { isValidKrMobileInput, normalizeKrPhone, formatKrPhoneDisplay } from "@/lib/phone";
import {
  assertPhoneExclusiveToAccount,
  PHONE_ALREADY_ON_ACCOUNT_MSG,
  PHONE_ONE_ACCOUNT_MSG,
  PHONE_PENDING_OTHER_MSG,
} from "@/lib/phone-ownership";
import { sendAuthSms } from "@/lib/sms";
import { checkPhoneSmsRateLimit } from "@/lib/auth-rate-limit";

const OTP_TTL_MS = 3 * 60 * 1000;

type PhoneVerificationUser = {
  id: string;
  countryCode: string;
  phone: string | null;
  phoneVerified: Date | null;
};

async function loadPhoneVerificationUser(): Promise<PhoneVerificationUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, countryCode: true, phone: true, phoneVerified: true },
  });
}

async function requirePhoneVerificationUser() {
  const user = await loadPhoneVerificationUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

async function readPendingPhone(userId: string): Promise<string | null> {
  const row = await db.verificationToken.findFirst({
    where: { identifier: phonePendingIdentifier(userId) },
    orderBy: { expires: "desc" },
  });
  if (!row || row.expires < new Date()) return null;
  return row.token;
}

async function setPendingPhone(userId: string, phoneE164: string) {
  const identifier = phonePendingIdentifier(userId);
  await db.verificationToken.deleteMany({ where: { identifier } });
  await db.verificationToken.create({
    data: {
      identifier,
      token: phoneE164,
      expires: new Date(Date.now() + OTP_TTL_MS),
    },
  });
}

async function clearPendingPhone(userId: string) {
  await db.verificationToken.deleteMany({ where: { identifier: phonePendingIdentifier(userId) } });
}

export async function getPhoneVerificationStatus() {
  const user = await loadPhoneVerificationUser();
  if (!user) return { signedIn: false as const };
  return {
    signedIn: true as const,
    countryCode: user.countryCode,
    phone: user.phone,
    phoneVerified: !!user.phoneVerified,
    displayPhone: user.phone ? formatKrPhoneDisplay(user.phone) : null,
  };
}

export async function clearUsedMarketPhonePending() {
  const user = await requirePhoneVerificationUser();
  if (user.phoneVerified) {
    return { error: PHONE_ALREADY_ON_ACCOUNT_MSG };
  }
  await clearPendingPhone(user.id);
  return { ok: true as const };
}

export async function sendUsedMarketPhoneOtp(rawPhone: string) {
  const user = await requirePhoneVerificationUser();
  if (user.countryCode !== "KR") {
    return { error: "중고거래는 대한민국 회원만 이용할 수 있습니다." };
  }
  if (!isValidKrMobileInput(rawPhone)) {
    return { error: "올바른 휴대폰 번호를 입력해 주세요. (예: 010-1234-5678)" };
  }

  const phone = normalizeKrPhone(rawPhone);
  if (!phone) return { error: "휴대폰 번호 형식이 올바르지 않습니다." };

  if (user.phoneVerified) {
    if (user.phone === phone) {
      return {
        message: `이미 인증된 번호입니다. (${formatKrPhoneDisplay(phone)})`,
        phoneDisplay: formatKrPhoneDisplay(phone),
        alreadyVerified: true,
      };
    }
    return {
      error: `${PHONE_ALREADY_ON_ACCOUNT_MSG} (${formatKrPhoneDisplay(user.phone!)})`,
    };
  }

  const pending = await readPendingPhone(user.id);
  if (pending && pending !== phone) {
    return { error: `${PHONE_PENDING_OTHER_MSG} (${formatKrPhoneDisplay(pending)})` };
  }

  const exclusive = await assertPhoneExclusiveToAccount(phone, user.id);
  if (!exclusive.ok) return { error: exclusive.error };

  const rate = await checkPhoneSmsRateLimit(user.id, phone);
  if (!rate.ok) return { error: rate.error };

  const code = generateEmailCode();
  const expires = new Date(Date.now() + OTP_TTL_MS);
  const identifier = phoneCodeIdentifier(phone);

  await db.verificationToken.deleteMany({ where: { identifier } });
  await db.verificationToken.create({
    data: {
      identifier,
      token: scopedPhoneCodeToken(phone, code),
      expires,
    },
  });
  await setPendingPhone(user.id, phone);

  const sent = await sendAuthSms(phone, code);
  if (!sent.ok) return { error: sent.error };

  return {
    message: sent.dev
      ? `개발 모드: 인증번호 ${code} (실서비스는 문자로 전송됩니다)`
      : "인증번호를 문자로 보냈습니다.",
    devCode: sent.dev ? code : undefined,
    phoneDisplay: formatKrPhoneDisplay(phone),
    sendsRemaining: rate.remaining,
  };
}

export async function verifyUsedMarketPhoneOtp(rawPhone: string, code: string) {
  const user = await requirePhoneVerificationUser();
  if (user.countryCode !== "KR") {
    return { error: "중고거래는 대한민국 회원만 이용할 수 있습니다." };
  }

  const phone = normalizeKrPhone(rawPhone);
  if (!phone) return { error: "휴대폰 번호 형식이 올바르지 않습니다." };
  if (!/^\d{6}$/.test(code.trim())) return { error: "6자리 인증번호를 입력해 주세요." };

  if (user.phoneVerified) {
    if (user.phone === phone) {
      return { success: true, displayPhone: formatKrPhoneDisplay(phone) };
    }
    return { error: PHONE_ALREADY_ON_ACCOUNT_MSG };
  }

  const pending = await readPendingPhone(user.id);
  if (pending && pending !== phone) {
    return { error: PHONE_PENDING_OTHER_MSG };
  }

  const exclusive = await assertPhoneExclusiveToAccount(phone, user.id);
  if (!exclusive.ok) return { error: exclusive.error };

  const identifier = phoneCodeIdentifier(phone);
  const row = await db.verificationToken.findFirst({
    where: { identifier },
    orderBy: { expires: "desc" },
  });
  if (!row || row.expires < new Date()) {
    return { error: "인증번호가 만료되었습니다. 다시 요청해 주세요." };
  }
  if (!phoneCodeMatchesToken(row.token, phone, code)) {
    return { error: "인증번호가 일치하지 않습니다." };
  }

  try {
    await db.$transaction(async (tx) => {
      const conflict = await tx.user.findFirst({
        where: {
          phone,
          phoneVerified: { not: null },
          id: { not: user.id },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new Error("PHONE_TAKEN");
      }

      const alreadyVerified = await tx.user.findUnique({
        where: { id: user.id },
        select: { phoneVerified: true },
      });
      if (alreadyVerified?.phoneVerified) {
        throw new Error("ACCOUNT_ALREADY_VERIFIED");
      }

      await tx.user.update({
        where: { id: user.id },
        data: { phone, phoneVerified: new Date() },
      });
      await tx.verificationToken.deleteMany({
        where: {
          OR: [{ identifier }, { identifier: phonePendingIdentifier(user.id) }],
        },
      });
    });
  } catch (e) {
    const code =
      e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "P2002" || (e instanceof Error && e.message === "PHONE_TAKEN")) {
      return { error: PHONE_ONE_ACCOUNT_MSG };
    }
    if (e instanceof Error && e.message === "ACCOUNT_ALREADY_VERIFIED") {
      return { error: PHONE_ALREADY_ON_ACCOUNT_MSG };
    }
    throw e;
  }

  revalidatePath("/used");
  revalidatePath("/used/new");
  revalidatePath("/used/my");
  revalidatePath("/used/verify");

  return {
    success: true,
    displayPhone: formatKrPhoneDisplay(phone),
  };
}
