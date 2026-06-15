import type { DiscoveryGender, DiscoveryLookingFor } from "@prisma/client";

export const DISCOVERY_GENDER_LABELS: Record<DiscoveryGender, string> = {
  MALE: "남성",
  FEMALE: "여성",
  NONBINARY: "논바이너리",
  OTHER: "기타",
  UNSPECIFIED: "비공개",
};

export const DISCOVERY_LOOKING_LABELS: Record<DiscoveryLookingFor, string> = {
  FRIENDS: "친구",
  COSPLAY: "코스어·코스프레",
  BOTH: "친구 + 코스어",
};

export const DISCOVERY_MIN_AGE = 18;
