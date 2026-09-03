"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getRequestIp } from "@/lib/request-ip";
import {
  clearBankVerificationPending,
  getBankVerificationStatusForUser,
  startBankVerificationForUser,
  verifyBankCodeForUser,
  type BankVerificationUser,
} from "@/lib/bank-verification";
import {
  getUsedMarketPhoneStatusForUser,
  sendUsedMarketPhoneOtpForUser,
  verifyUsedMarketPhoneOtpForUser,
} from "@/lib/used-market-phone-otp";
import { phonePendingIdentifier } from "@/lib/auth-tokens";
import { isKoreaUsedMarketCountry } from "@/lib/used-regions-global";

const bankUserSelect = {
  id: true,
  name: true,
  countryCode: true,
  bankVerifiedAt: true,
  settlementBankCode: true,
  settlementAccountLast4: true,
  stripeConnectAccountId: true,
  email: true,
  emailVerified: true,
} as const;

async function loadBankVerificationUser(): Promise<BankVerificationUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.user.findUnique({
    where: { id: session.user.id },
    select: bankUserSelect,
  });
}

const phoneUserSelect = {
  id: true,
  countryCode: true,
  phone: true,
  phoneVerified: true,
} as const;

async function loadPhoneVerificationUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.user.findUnique({
    where: { id: session.user.id },
    select: phoneUserSelect,
  });
}

async function requireBankVerificationUser() {
  const user = await loadBankVerificationUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

async function requirePhoneVerificationUser() {
  const user = await loadPhoneVerificationUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

function revalidateBankPaths() {
  revalidatePath("/settings/bank");
  revalidatePath("/settings");
  revalidatePath("/used");
  revalidatePath("/used/new");
  revalidatePath("/used/my");
  revalidatePath("/used/verify");
  revalidatePath("/market/seller/register");
  revalidatePath("/wallet");
  revalidatePath("/support");
}

export async function getBankVerificationStatus() {
  const session = await auth();
  if (!session?.user?.id) return { signedIn: false as const };
  const status = await getBankVerificationStatusForUser(session.user.id);
  if (!status) return { signedIn: false as const };
  return { signedIn: true as const, ...status };
}

export async function clearAccountBankPending() {
  const user = await requireBankVerificationUser();
  return clearBankVerificationPending(user.id);
}

/** 모든 로그인 사용자 — 국내 계좌 1원 인증 (Stripe Connect 미연동) */
export async function sendAccountBankVerification(bankCode: string, accountNum: string) {
  const user = await requireBankVerificationUser();
  const ip = await getRequestIp();
  return startBankVerificationForUser(user, bankCode, accountNum, { ip, linkStripeConnect: false });
}

export async function verifyAccountBankCode(
  bankCode: string,
  accountNum: string,
  code: string
) {
  const user = await requireBankVerificationUser();
  const ip = await getRequestIp();
  const result = await verifyBankCodeForUser(user, bankCode, accountNum, code, {
    ip,
    linkStripeConnect: false,
  });
  if ("success" in result && result.success) revalidateBankPaths();
  return result;
}

export async function clearUsedMarketBankPending() {
  return clearAccountBankPending();
}

/** 중고거래 — 본인 확인용 1원 인증 (결제·정산 미연동, C2C 자율 거래) */
export async function sendUsedMarketBankVerification(bankCode: string, accountNum: string) {
  const user = await requireBankVerificationUser();
  const ip = await getRequestIp();
  return startBankVerificationForUser(user, bankCode, accountNum, { ip, linkStripeConnect: false });
}

export async function verifyUsedMarketBankCode(
  bankCode: string,
  accountNum: string,
  code: string
) {
  const user = await requireBankVerificationUser();
  const ip = await getRequestIp();
  const result = await verifyBankCodeForUser(user, bankCode, accountNum, code, {
    ip,
    linkStripeConnect: false,
  });
  if ("success" in result && result.success) revalidateBankPaths();
  return result;
}

/** 해외 중고거래 — 휴대폰 SMS OTP (KR은 계좌 1원 인증) */
export async function sendUsedMarketPhoneOtp(rawPhone: string) {
  const user = await requirePhoneVerificationUser();
  if (isKoreaUsedMarketCountry(user.countryCode)) {
    return { error: "한국은 계좌 1원 인증을 이용해 주세요." };
  }
  return sendUsedMarketPhoneOtpForUser(user, rawPhone);
}

export async function verifyUsedMarketPhoneOtp(rawPhone: string, code: string) {
  const user = await requirePhoneVerificationUser();
  if (isKoreaUsedMarketCountry(user.countryCode)) {
    return { error: "한국은 계좌 1원 인증을 이용해 주세요." };
  }
  const result = await verifyUsedMarketPhoneOtpForUser(user, rawPhone, code);
  if ("success" in result && result.success) revalidateBankPaths();
  return result;
}

export async function getUsedMarketPhoneVerificationStatus() {
  const session = await auth();
  if (!session?.user?.id) return { signedIn: false as const };
  const status = await getUsedMarketPhoneStatusForUser(session.user.id);
  if (!status) return { signedIn: false as const };
  return { signedIn: true as const, ...status };
}

export async function clearUsedMarketPhonePending() {
  const user = await requirePhoneVerificationUser();
  await db.verificationToken.deleteMany({
    where: { identifier: phonePendingIdentifier(user.id) },
  });
  return { ok: true as const };
}

/** @deprecated use getUsedMarketPhoneVerificationStatus or getBankVerificationStatus */
export async function getPhoneVerificationStatus() {
  const session = await auth();
  if (!session?.user?.id) return { signedIn: false as const };
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { countryCode: true, phone: true, phoneVerified: true, bankVerifiedAt: true },
  });
  if (!user) return { signedIn: false as const };
  if (isKoreaUsedMarketCountry(user.countryCode)) {
    const bank = await getBankVerificationStatusForUser(session.user.id);
    if (!bank) return { signedIn: false as const };
    return {
      signedIn: true as const,
      countryCode: bank.countryCode,
      phone: null,
      phoneVerified: bank.bankVerified,
      displayPhone: bank.displayAccount,
    };
  }
  const phone = await getUsedMarketPhoneStatusForUser(session.user.id);
  if (!phone) return { signedIn: false as const };
  return {
    signedIn: true as const,
    countryCode: phone.countryCode,
    phone: phone.phone,
    phoneVerified: phone.phoneVerified,
    displayPhone: phone.displayPhone,
  };
}

/** 판매자 온보딩 — 한국 계좌 1원 인증 + Stripe Connect */
export async function sendSellerBankVerification(bankCode: string, accountNum: string) {
  return sendUsedMarketBankVerification(bankCode, accountNum);
}

export async function verifySellerBankCode(bankCode: string, accountNum: string, code: string) {
  return verifyUsedMarketBankCode(bankCode, accountNum, code);
}

/** @deprecated */
export async function sendSellerPhoneOtp(_rawPhone: string, _phoneCountryCode: string) {
  return sendUsedMarketPhoneOtp(_rawPhone);
}

/** @deprecated */
export async function verifySellerPhoneOtp(
  _rawPhone: string,
  _code: string,
  _phoneCountryCode: string
) {
  return verifyUsedMarketPhoneOtp(_rawPhone, _code);
}

/** @deprecated */
export async function sendSellerSignupPhoneOtp(_rawPhone: string, _phoneCountryCode: string) {
  return sendUsedMarketPhoneOtp(_rawPhone);
}

/** @deprecated */
export async function verifySellerSignupPhoneOtp(
  _rawPhone: string,
  _code: string,
  _phoneCountryCode: string
) {
  return verifyUsedMarketPhoneOtp(_rawPhone, _code);
}
