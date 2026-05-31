"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { isUsedMarketEligible } from "@/lib/used-phone-auth";
import {
  parseBirthDateInput,
  USED_ADULT_MIN_AGE,
  usedAgeFromBirthDate,
} from "@/lib/used-youth-protection";

export async function getUsedAdultVerificationStatus() {
  const user = await requireAuth();
  return {
    phoneOk: isUsedMarketEligible(user),
    adultVerified: !!user.adultVerifiedAt,
    birthDate: user.birthDate,
  };
}

export async function verifyUsedAdultAge(data: {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  agreeTerms: boolean;
}) {
  const user = await requireAuth();

  if (!isUsedMarketEligible(user)) {
    return { error: "성인 인증 전에 휴대폰 번호 인증을 완료해 주세요." };
  }

  if (user.adultVerifiedAt) {
    return { success: true, alreadyVerified: true };
  }

  if (!data.agreeTerms) {
    return { error: "청소년 보호 안내에 동의해 주세요." };
  }

  const birth = parseBirthDateInput(data.birthYear, data.birthMonth, data.birthDay);
  if (!birth) {
    return { error: "올바른 생년월일을 입력해 주세요." };
  }

  const age = usedAgeFromBirthDate(birth);
  if (age < USED_ADULT_MIN_AGE) {
    return {
      error: `만 ${USED_ADULT_MIN_AGE}세 미만은 성인 인증이 불가합니다. (입력 기준 만 ${age}세)`,
    };
  }

  try {
    await db.user.update({
      where: { id: user.id },
      data: {
        birthDate: birth,
        adultVerifiedAt: new Date(),
      },
    });
  } catch (e) {
    console.error("[verifyUsedAdultAge]", e);
    return { error: "성인 인증 저장에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/used");
  revalidatePath("/used/new");
  revalidatePath("/used/my");

  return { success: true };
}
