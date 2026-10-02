import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import type { DiscoveryGender, DiscoveryLookingFor } from "@prisma/client";

export const DISCOVERY_GENDER_LABELS: Record<DiscoveryGender, string> = {
  MALE: t("lib.discovery.sv3wp"),
  FEMALE: t("lib.discovery.syq4l"),
  NONBINARY: t("lib.discovery.s87hz40"),
  OTHER: t("lib.webtoon.surv4"),
  UNSPECIFIED: t("lib.discovery.sspmob"),
};

/** 설정 UI에 노출하는 옵션 (BOTH는 레거시 DB 값용) */
export const DISCOVERY_LOOKING_UI_OPTIONS = ["FRIENDS", "COSPLAY"] as const satisfies readonly DiscoveryLookingFor[];

export const DISCOVERY_LOOKING_LABELS: Record<DiscoveryLookingFor, string> = {
  FRIENDS: t("lib.discovery.s101w0"),
  COSPLAY: t("anime.badgeCosplayer"),
  BOTH: t("lib.discovery.s101w0"),
};

export function normalizeLookingFor(value: DiscoveryLookingFor): DiscoveryLookingFor {
  return value === "BOTH" ? "FRIENDS" : value;
}

export const DISCOVERY_MIN_AGE = 18;
export const DISCOVERY_MAX_DISTANCE_KM = 300;

export const DISCOVERY_MATCHING_UI_OPTIONS = ["RECOMMENDED", "RANDOM"] as const;

export const DISCOVERY_MATCHING_LABELS: Record<
  (typeof DISCOVERY_MATCHING_UI_OPTIONS)[number],
  string
> = {
  RECOMMENDED: t("lib.discovery.s1eq2097"),
  RANDOM: t("lib.discovery.sj4kqw8"),
};

export const DISCOVERY_MATCHING_DESCRIPTIONS: Record<
  (typeof DISCOVERY_MATCHING_UI_OPTIONS)[number],
  string
> = {
  RECOMMENDED: t("lib.discovery.sft725a"),
  RANDOM: t("lib.discovery.smo4cjg"),
};
