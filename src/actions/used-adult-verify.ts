"use server";

import { requireAuth } from "@/lib/auth";
import { isUsedMarketEligible } from "@/lib/used-phone-auth";
import { isAdultVerified } from "@/lib/adult-verification/is-verified";

export async function getUsedAdultVerificationStatus() {
  const user = await requireAuth();
  return {
    phoneOk: isUsedMarketEligible(user),
    adultVerified: isAdultVerified(user),
    birthDate: user.birthDate,
  };
}

/** @deprecated PortOne 본인인증(`requestPortOneIdentityVerification`)으로 대체됨 */
export async function verifyUsedAdultAge(_data: {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  agreeTerms: boolean;
}) {
  return {
    error: "수동 생년월일 입력은 종료되었습니다. 휴대폰 본인인증을 이용해 주세요.",
  };
}
