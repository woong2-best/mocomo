import { getProfileHeader } from "@/actions/profile-page";
import { ProfileTabs } from "@/components/profile/profile-tabs";

/** Tabs live in the main feed column (not over the right aside) — Twitter layout. */
export async function ProfileTabsAsync({ username }: { username: string }) {
  const header = await getProfileHeader(username);
  if (!header) return null;
  return <ProfileTabs showLikesTab={header.isSelf} isSelf={header.isSelf} />;
}
