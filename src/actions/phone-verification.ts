"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth, getCachedCurrentUser } from "@/lib/auth";
import {
  generateEmailCode,
  phoneCodeIdentifier,
  scopedPhoneCodeToken,
  phoneCodeMatchesToken,
} from "@/lib/auth-tokens";
import { isValidKrMobileInput, normalizeKrPhone, formatKrPhoneDisplay } from "@/lib/phone";
import { sendAuthSms } from "@/lib/sms";
import { checkPhoneSmsRateLimit } from "@/lib/auth-rate-limit";

const OTP_TTL_MS = 3 * 60 * 1000;

export async function getPhoneVerificationStatus() {
  const user = await getCachedCurrentUser();
  if (!user) return { signedIn: false as const };
  return {
    signedIn: true as const,
    countryCode: user.countryCode,
    phone: user.phone,
    phoneVerified: !!user.phoneVerified,
    displayPhone: user.phone ? formatKrPhoneDisplay(user.phone) : null,
  };
}

export async function sendUsedMarketPhoneOtp(rawPhone: string) {
  const user = await requireAuth();
  if (user.countryCode !== "KR") {
    return { error: "중고거래는 대한민국 회원만 이용할 수 있습니다." };
  }
  if (!isValidKrMobileInput(rawPhone)) {
    return { error: "올바른 휴대폰 번호를 입력해 주세요. (예: 010-1234-5678)" };
  }

  const phone = normalizeKrPhone(rawPhone);
  if (!phone) return { error: "휴대폰 번호 형식이 올바르지 않습니다." };

  const rate = await checkPhoneSmsRateLimit(user.id, phone);
  if (!rate.ok) return { error: rate.error };

  const taken = await db.user.findFirst({
    where: { phone, id: { not: user.id } },
    select: { id: true },
  });
  if (taken) return { error: "이미 다른 계정에 등록된 번호입니다." };

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
  const user = await requireAuth();
  if (user.countryCode !== "KR") {
    return { error: "중고거래는 대한민국 회원만 이용할 수 있습니다." };
  }

  const phone = normalizeKrPhone(rawPhone);
  if (!phone) return { error: "휴대폰 번호 형식이 올바르지 않습니다." };
  if (!/^\d{6}$/.test(code.trim())) return { error: "6자리 인증번호를 입력해 주세요." };

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

  const taken = await db.user.findFirst({
    where: { phone, id: { not: user.id } },
    select: { id: true },
  });
  if (taken) return { error: "이미 다른 계정에 등록된 번호입니다." };

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { phone, phoneVerified: new Date() },
    }),
    db.verificationToken.deleteMany({ where: { identifier } }),
  ]);

  revalidatePath("/used");
  revalidatePath("/used/new");
  revalidatePath("/used/my");

  return {
    success: true,
    displayPhone: formatKrPhoneDisplay(phone),
  };
}
