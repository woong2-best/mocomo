export const CONNECTION_TABS = [
  { id: "verified", label: "인증 팔로워" },
  { id: "known", label: "아는 팔로워" },
  { id: "followers", label: "팔로워" },
  { id: "following", label: "팔로잉" },
  { id: "subscribers", label: "구독자" },
  { id: "subscriptions", label: "구독 중" },
] as const;

export type ConnectionTab = (typeof CONNECTION_TABS)[number]["id"];

export function parseConnectionTab(value: string | undefined): ConnectionTab {
  const found = CONNECTION_TABS.find((t) => t.id === value);
  return found?.id ?? "followers";
}

export const CONNECTION_EMPTY: Record<
  ConnectionTab,
  { title: string; description: string }
> = {
  verified: {
    title: "아직 아무것도 없습니다",
    description: "인증 팔로워 목록을 확인하세요.",
  },
  known: {
    title: "아직 아무것도 없습니다",
    description: "내가 아는 팔로워가 여기에 표시됩니다.",
  },
  followers: {
    title: "아직 팔로워가 없습니다",
    description: "팔로워가 생기면 여기에 표시됩니다.",
  },
  following: {
    title: "아직 팔로잉이 없습니다",
    description: "팔로우한 사람이 여기에 표시됩니다.",
  },
  subscribers: {
    title: "아직 구독자가 없습니다",
    description: "구독자 목록은 여기에서 확인할 수 있습니다.",
  },
  subscriptions: {
    title: "아직 구독이 없습니다",
    description: "구독 중인 모든 사람의 목록은 여기에서 확인할 수 있습니다.",
  },
};

export const VERIFIED_TIER_FLOOR = ["SILVER", "GOLD", "CRYSTAL", "EMERALD", "SAPPHIRE", "RUBY", "DIAMOND", "MYTHRIL", "ORICHALCUM", "LUNA", "TERRA", "JUPITER", "ASTRAL", "COSMIC"] as const;
