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

async function requireBankVerificationUser() {
  const user = await loadBankVerificationUser();
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

/** @deprecated SMS OTP — Apick 1원 인증으로 대체됨 */
export async function sendUsedMarketPhoneOtp(_rawPhone: string) {
  return {
    error: "휴대폰 SMS 인증은 종료되었습니다. 계좌 1원 인증을 이용해 주세요.",
  };
}

/** @deprecated SMS OTP — Apick 1원 인증으로 대체됨 */
export async function verifyUsedMarketPhoneOtp(_rawPhone: string, _code: string) {
  return {
    error: "휴대폰 SMS 인증은 종료되었습니다. 계좌 1원 인증을 이용해 주세요.",
  };
}

/** @deprecated */
export async function getPhoneVerificationStatus() {
  const status = await getBankVerificationStatus();
  if (!status.signedIn) return { signedIn: false as const };
  return {
    signedIn: true as const,
    countryCode: status.countryCode,
    phone: null,
    phoneVerified: status.bankVerified,
    displayPhone: status.displayAccount,
  };
}

/** @deprecated */
export async function clearUsedMarketPhonePending() {
  return clearAccountBankPending();
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
