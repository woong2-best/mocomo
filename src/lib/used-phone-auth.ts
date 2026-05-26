import type { User } from "@prisma/client";

export function isUsedMarketEligible(user: Pick<User, "countryCode" | "phoneVerified">): boolean {
  return user.countryCode === "KR" && !!user.phoneVerified;
}

export const USED_PHONE_REQUIRED_MSG =
  "중고거래 이용을 위해 휴대폰 번호 인증이 필요합니다. (대한민국 번호만 가능)";

export const USED_KR_ONLY_MSG = "중고거래는 대한민국 회원만 이용할 수 있습니다.";
