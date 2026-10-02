import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

export const ADULT_MIN_AGE = 19;

export const ADULT_VERIFICATION_REQUIRED_MSG =
  t("lib.adult-verification.s3x2bhp");

export const ADULT_VERIFICATION_UNDERAGE_MSG =
  `만 ${ADULT_MIN_AGE}세 미만은 유료 거래를 이용할 수 없습니다.`;
