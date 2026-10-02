export const CONNECTION_TABS = [
  { id: "verified", label: "Verified followers" },
  { id: "known", label: "Followers you know" },
  { id: "followers", label: "Followers" },
  { id: "following", label: "Following" },
  { id: "subscribers", label: "Subscribers" },
  { id: "subscriptions", label: "Subscribed" },
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
    title: "Nothing here yet",
    description: "View your verified followers.",
  },
  known: {
    title: "Nothing here yet",
    description: "Followers you know appear here.",
  },
  followers: {
    title: "No followers yet",
    description: "Followers will appear here.",
  },
  following: {
    title: "Not following anyone yet",
    description: "People you follow appear here.",
  },
  subscribers: {
    title: "No subscribers yet",
    description: "Your subscriber list appears here.",
  },
  subscriptions: {
    title: "No subscriptions yet",
    description: "Everyone you subscribe to appears here.",
  },
};

export const VERIFIED_TIER_FLOOR = ["BRASS", "SILVER", "GOLD", "CRYSTAL", "EMERALD", "SAPPHIRE", "RUBY", "DIAMOND", "MYTHRIL", "ORICHALCUM", "LUNA", "TERRA", "JUPITER", "ASTRAL", "COSMIC"] as const;
