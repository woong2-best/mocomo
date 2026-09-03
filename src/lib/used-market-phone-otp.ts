import { db } from "@/lib/db";
import {
  generateEmailCode,
  phoneCodeIdentifier,
  phonePendingIdentifier,
  scopedPhoneCodeToken,
  phoneCodeMatchesToken,
} from "@/lib/auth-tokens";
import {
  formatPhoneDisplay,
  isValidMobilePhoneInput,
  normalizeMobilePhone,
  phonePlaceholderForCountry,
} from "@/lib/phone-international";
import {
  assertPhoneExclusiveToAccount,
  PHONE_ALREADY_ON_ACCOUNT_MSG,
  PHONE_ONE_ACCOUNT_MSG,
  PHONE_PENDING_OTHER_MSG,
} from "@/lib/phone-ownership";
import { sendAuthSms } from "@/lib/sms";
import { checkPhoneSmsRateLimit } from "@/lib/auth-rate-limit";
import { isUsedMarketEligible, usedMarketBlockedRegionMsg } from "@/lib/used-bank-auth";
import { isUsedMarketPhoneCountry } from "@/lib/used-phone-countries";

const OTP_TTL_MS = 3 * 60 * 1000;

type UserSlice = {
  id: string;
  countryCode: string;
  phone: string | null;
  phoneVerified: Date | null;
};

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

export async function getUsedMarketPhoneStatusForUser(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { countryCode: true, phone: true, phoneVerified: true },
  });
  if (!user) return null;
  return {
    countryCode: user.countryCode,
    phone: user.phone,
    phoneVerified: !!user.phoneVerified,
    displayPhone: user.phone ? formatPhoneDisplay(user.phone) : null,
    eligible: isUsedMarketPhoneCountry(user.countryCode) && isUsedMarketEligible(user),
  };
}

export async function sendUsedMarketPhoneOtpForUser(user: UserSlice, rawPhone: string) {
  if (!isUsedMarketPhoneCountry(user.countryCode)) {
    return { error: usedMarketBlockedRegionMsg("ko") };
  }
  const region = user.countryCode.toUpperCase();

  if (!isValidMobilePhoneInput(rawPhone, region)) {
    return {
      error: `올바른 휴대폰 번호를 입력해 주세요. (예: ${phonePlaceholderForCountry(region)})`,
    };
  }

  const phone = normalizeMobilePhone(rawPhone, region);
  if (!phone) return { error: "휴대폰 번호 형식이 올바르지 않습니다." };

  if (user.phoneVerified) {
    if (user.phone === phone) {
      return {
        message: `이미 인증된 번호입니다. (${formatPhoneDisplay(phone)})`,
        phoneDisplay: formatPhoneDisplay(phone),
        alreadyVerified: true as const,
      };
    }
    return {
      error: `${PHONE_ALREADY_ON_ACCOUNT_MSG} (${formatPhoneDisplay(user.phone!)})`,
    };
  }

  const pending = await readPendingPhone(user.id);
  if (pending && pending !== phone) {
    return { error: `${PHONE_PENDING_OTHER_MSG} (${formatPhoneDisplay(pending)})` };
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
    phoneDisplay: formatPhoneDisplay(phone),
    sendsRemaining: rate.remaining,
  };
}

export async function verifyUsedMarketPhoneOtpForUser(
  user: UserSlice,
  rawPhone: string,
  code: string
) {
  if (!isUsedMarketPhoneCountry(user.countryCode)) {
    return { error: usedMarketBlockedRegionMsg("ko") };
  }
  const region = user.countryCode.toUpperCase();
  const phone = normalizeMobilePhone(rawPhone, region);
  if (!phone) return { error: "휴대폰 번호 형식이 올바르지 않습니다." };
  if (!/^\d{6}$/.test(code.trim())) return { error: "6자리 인증번호를 입력해 주세요." };

  if (user.phoneVerified) {
    if (user.phone === phone) {
      return { success: true as const, displayPhone: formatPhoneDisplay(phone) };
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
      if (conflict) throw new Error("PHONE_TAKEN");

      const alreadyVerified = await tx.user.findUnique({
        where: { id: user.id },
        select: { phoneVerified: true },
      });
      if (alreadyVerified?.phoneVerified) throw new Error("ACCOUNT_ALREADY_VERIFIED");

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
    const errCode =
      e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (errCode === "P2002" || (e instanceof Error && e.message === "PHONE_TAKEN")) {
      return { error: PHONE_ONE_ACCOUNT_MSG };
    }
    if (e instanceof Error && e.message === "ACCOUNT_ALREADY_VERIFIED") {
      return { error: PHONE_ALREADY_ON_ACCOUNT_MSG };
    }
    throw e;
  }

  return {
    success: true as const,
    displayPhone: formatPhoneDisplay(phone),
  };
}
