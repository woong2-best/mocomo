"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  generateEmailCode,
  phoneCodeIdentifier,
  phonePendingIdentifier,
  scopedPhoneCodeToken,
  phoneCodeMatchesToken,
  sellerPhoneProofIdentifier,
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
import { isUsedMarketPhoneCountry } from "@/lib/used-phone-countries";
import { usedMarketUnsupportedCountryMsg } from "@/lib/used-phone-auth";
import { isSellerPhoneCountry } from "@/lib/marketplace/seller-phone-countries";
import { getRequestIp } from "@/lib/request-ip";
import { sellerRequiresPhoneVerification } from "@/lib/marketplace/seller-region-policy";

const OTP_TTL_MS = 3 * 60 * 1000;
const SELLER_PHONE_PROOF_TTL_MS = 15 * 60 * 1000;

type PhoneOtpGate =
  | { kind: "used-market" }
  | { kind: "seller"; phoneCountryCode: string };

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
    displayPhone: user.phone ? formatPhoneDisplay(user.phone) : null,
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

function resolvePhoneRegion(userCountry: string, gate: PhoneOtpGate): { ok: true; region: string } | { ok: false; error: string } {
  if (gate.kind === "used-market") {
    if (!isUsedMarketPhoneCountry(userCountry)) {
      return { ok: false, error: usedMarketUnsupportedCountryMsg("ko") };
    }
    return { ok: true, region: userCountry.toUpperCase() };
  }
  const region = gate.phoneCountryCode.toUpperCase();
  if (!isSellerPhoneCountry(region)) {
    return { ok: false, error: "판매자 휴대폰 인증은 중국·홍콩·한국·일본·미국 번호만 지원합니다." };
  }
  return { ok: true, region };
}

async function sendPhoneOtp(rawPhone: string, gate: PhoneOtpGate) {
  const user = await requirePhoneVerificationUser();
  const regionRes = resolvePhoneRegion(user.countryCode, gate);
  if (!regionRes.ok) return { error: regionRes.error };
  const region = regionRes.region;

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
        alreadyVerified: true,
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

  if (gate.kind === "seller") {
    await db.user.update({
      where: { id: user.id },
      data: { countryCode: region },
    });
  }

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

async function verifyPhoneOtp(rawPhone: string, code: string, gate: PhoneOtpGate) {
  const user = await requirePhoneVerificationUser();
  const regionRes = resolvePhoneRegion(user.countryCode, gate);
  if (!regionRes.ok) return { error: regionRes.error };
  const region = regionRes.region;

  const phone = normalizeMobilePhone(rawPhone, region);
  if (!phone) return { error: "휴대폰 번호 형식이 올바르지 않습니다." };
  if (!/^\d{6}$/.test(code.trim())) return { error: "6자리 인증번호를 입력해 주세요." };

  if (user.phoneVerified) {
    if (user.phone === phone) {
      return { success: true, displayPhone: formatPhoneDisplay(phone) };
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
        data: {
          phone,
          phoneVerified: new Date(),
          ...(gate.kind === "seller" ? { countryCode: region } : {}),
        },
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

  revalidatePath("/used");
  revalidatePath("/used/new");
  revalidatePath("/used/my");
  revalidatePath("/used/verify");
  revalidatePath("/market/seller/register");

  return {
    success: true,
    displayPhone: formatPhoneDisplay(phone),
  };
}

export async function sendUsedMarketPhoneOtp(rawPhone: string) {
  return sendPhoneOtp(rawPhone, { kind: "used-market" });
}

export async function verifyUsedMarketPhoneOtp(rawPhone: string, code: string) {
  return verifyPhoneOtp(rawPhone, code, { kind: "used-market" });
}

/** MoCoMo MARKET 판매자 온보딩용 휴대폰 OTP (로그인 후) — 한국만 필수 */
export async function sendSellerPhoneOtp(rawPhone: string, phoneCountryCode: string) {
  const session = await auth();
  if (session?.user?.id) {
    const u = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        countryCode: true,
        marketplaceSeller: { select: { sellingMarket: true } },
      },
    });
    const country = u?.marketplaceSeller?.sellingMarket || u?.countryCode || phoneCountryCode;
    if (!sellerRequiresPhoneVerification(country)) {
      return {
        error: "해외 판매자는 휴대폰 인증이 필요하지 않습니다. 다음 단계로 진행해 주세요.",
      };
    }
  }
  return sendPhoneOtp(rawPhone, { kind: "seller", phoneCountryCode: "KR" });
}

export async function verifySellerPhoneOtp(
  rawPhone: string,
  code: string,
  phoneCountryCode: string
) {
  return verifyPhoneOtp(rawPhone, code, { kind: "seller", phoneCountryCode });
}

/**
 * 판매자 가입 폼(비로그인) — 쿠팡 WING처럼 계정 입력 화면에서 OTP 요청
 */
export async function sendSellerSignupPhoneOtp(rawPhone: string, phoneCountryCode: string) {
  const session = await auth();
  if (session?.user?.id) {
    return sendSellerPhoneOtp(rawPhone, phoneCountryCode);
  }

  const region = phoneCountryCode.toUpperCase();
  // 글로벌 정책: 가입 폼 SMS는 한국(KR)만. 해외는 Twilio 없이 KYC로 진행.
  if (region !== "KR") {
    return {
      error:
        "해외 판매자는 휴대폰(SMS) 인증이 필요하지 않습니다. 판매 국가를 한국이 아닌 값으로 선택해 주세요.",
    };
  }
  if (!isSellerPhoneCountry(region)) {
    return { error: "판매자 휴대폰 인증은 중국·홍콩·한국·일본·미국 번호만 지원합니다." };
  }
  if (!isValidMobilePhoneInput(rawPhone, region)) {
    return {
      error: `올바른 휴대폰 번호를 입력해 주세요. (예: ${phonePlaceholderForCountry(region)})`,
    };
  }
  const phone = normalizeMobilePhone(rawPhone, region);
  if (!phone) return { error: "휴대폰 번호 형식이 올바르지 않습니다." };

  const taken = await db.user.findFirst({
    where: { phone, phoneVerified: { not: null } },
    select: { id: true },
  });
  if (taken) return { error: PHONE_ONE_ACCOUNT_MSG };

  const ip = await getRequestIp();
  const rate = await checkPhoneSmsRateLimit(`preauth:${ip}`, phone);
  if (!rate.ok) return { error: rate.error };

  const code = generateEmailCode();
  const expires = new Date(Date.now() + OTP_TTL_MS);
  const identifier = phoneCodeIdentifier(phone);

  await db.verificationToken.deleteMany({
    where: {
      identifier: {
        in: [identifier, sellerPhoneProofIdentifier(phone)],
      },
    },
  });
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
    phoneDisplay: formatPhoneDisplay(phone),
    sendsRemaining: rate.remaining,
  };
}

/** OTP 확인 후 가입에 쓸 단기 phoneProof 발급 */
export async function verifySellerSignupPhoneOtp(
  rawPhone: string,
  code: string,
  phoneCountryCode: string
) {
  const session = await auth();
  if (session?.user?.id) {
    const res = await verifySellerPhoneOtp(rawPhone, code, phoneCountryCode);
    if ("error" in res && res.error) return { error: res.error };
    return {
      success: true as const,
      phoneProof: "session-verified",
      phoneDisplay: "displayPhone" in res ? res.displayPhone : undefined,
      alreadyOnSession: true as const,
    };
  }

  const region = phoneCountryCode.toUpperCase();
  if (!isSellerPhoneCountry(region)) {
    return { error: "판매자 휴대폰 인증은 중국·홍콩·한국·일본·미국 번호만 지원합니다." };
  }
  const phone = normalizeMobilePhone(rawPhone, region);
  if (!phone) return { error: "휴대폰 번호 형식이 올바르지 않습니다." };
  if (!/^\d{6}$/.test(code.trim())) return { error: "6자리 인증번호를 입력해 주세요." };

  const taken = await db.user.findFirst({
    where: { phone, phoneVerified: { not: null } },
    select: { id: true },
  });
  if (taken) return { error: PHONE_ONE_ACCOUNT_MSG };

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

  const proof = randomBytes(24).toString("hex");
  const proofId = sellerPhoneProofIdentifier(phone);
  await db.verificationToken.deleteMany({
    where: { identifier: { in: [identifier, proofId] } },
  });
  await db.verificationToken.create({
    data: {
      identifier: proofId,
      token: proof,
      expires: new Date(Date.now() + SELLER_PHONE_PROOF_TTL_MS),
    },
  });

  return {
    success: true as const,
    phoneProof: proof,
    phoneDisplay: formatPhoneDisplay(phone),
    phoneE164: phone,
  };
}

