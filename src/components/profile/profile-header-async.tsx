import { notFound } from "next/navigation";
import { isPaymentsConfigured } from "@/lib/payments";
import { getProfileHeader, getProfilePinnedPost } from "@/actions/profile-page";
import { getViewerSupportForCreator } from "@/actions/support";
import { ProfileHeader } from "@/components/profile/profile-header";
import { parseProfileTab, type ProfileTab } from "@/lib/profile-queries";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { ProfilePostCard } from "@/components/profile/profile-post-card";

export async function ProfileHeaderAsync({
  username,
  tabParam,
}: {
  username: string;
  tabParam?: string;
}) {
  const header = await getProfileHeader(username);
  if (!header) notFound();

  const tab = parseProfileTab(tabParam);
  const effectiveTab = tab === "likes" && !header.isSelf ? "posts" : tab;

  const [viewerSupport, pinned] = await Promise.all([
    header.isSelf ? Promise.resolve(null) : getViewerSupportForCreator(header.user.id),
    effectiveTab === "posts" ? getProfilePinnedPost(header.user.id) : Promise.resolve(null),
  ]);
  const paymentsEnabled = isPaymentsConfigured();

  return (
    <>
      <ProfileHeader
        user={header.user}
        isSelf={header.isSelf}
        isFollowing={header.isFollowing}
        followsYou={header.followsYou}
        viewerSupport={viewerSupport}
        paymentsEnabled={paymentsEnabled}
      />
      {pinned && effectiveTab === "posts" && (
        <ProfilePostCard post={pinned} isSelf={header.isSelf} pinnedHighlight />
      )}
      <ProfileTabs username={username} showLikesTab={header.isSelf} />
    </>
  );
}

export async function getProfileHeaderMeta(username: string, tabParam?: string) {
  const header = await getProfileHeader(username);
  if (!header) return null;
  const tab = parseProfileTab(tabParam);
  const effectiveTab: ProfileTab = tab === "likes" && !header.isSelf ? "posts" : tab;
  return { header, effectiveTab };
}
