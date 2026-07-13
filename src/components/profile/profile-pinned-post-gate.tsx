"use client";

import { useProfileTab } from "@/components/profile/profile-tab-context";

export function ProfilePinnedPostGate({ children }: { children: React.ReactNode }) {
  const { tab } = useProfileTab();
  if (tab !== "posts") return null;
  return <>{children}</>;
}
