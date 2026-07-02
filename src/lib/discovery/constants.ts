import type { DiscoveryGender, DiscoveryLookingFor } from "@prisma/client";

export const DISCOVERY_GENDER_LABELS: Record<DiscoveryGender, string> = {
  MALE: "남성",
  FEMALE: "여성",
  NONBINARY: "논바이너리",
  OTHER: "기타",
  UNSPECIFIED: "비공개",
};

/** 설정 UI에 노출하는 옵션 (BOTH는 레거시 DB 값용) */
export const DISCOVERY_LOOKING_UI_OPTIONS = ["FRIENDS", "COSPLAY"] as const satisfies readonly DiscoveryLookingFor[];

export const DISCOVERY_LOOKING_LABELS: Record<DiscoveryLookingFor, string> = {
  FRIENDS: "친구",
  COSPLAY: "코스어",
  BOTH: "친구",
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
  RECOMMENDED: "취향 추천",
  RANDOM: "완전 랜덤",
};

export const DISCOVERY_MATCHING_DESCRIPTIONS: Record<
  (typeof DISCOVERY_MATCHING_UI_OPTIONS)[number],
  string
> = {
  RECOMMENDED: "애니·태그·거리·활동 기반으로 맞춤 추천",
  RANDOM: "필터 없이 참여 중인 사람을 무작위로",
};
