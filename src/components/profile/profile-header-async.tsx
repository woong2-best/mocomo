import { notFound } from "next/navigation";
import { isPaymentsConfigured } from "@/lib/payments";
import {
  getProfileHeader,
  getProfilePinnedPost,
  getViewerCreatorSubscription,
} from "@/actions/profile-page";
import { creatorSubscriptionPriceForUser } from "@/lib/creator-subscription";
import { getViewerSupportForCreator } from "@/actions/support";
import { ProfileHeader } from "@/components/profile/profile-header";
import { parseProfileTab, type ProfileTab } from "@/lib/profile-queries";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { ProfilePostCard } from "@/components/profile/profile-post-card";
import { getAuthUserId } from "@/lib/auth";

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
  const viewerId = await getAuthUserId();

  const [viewerSupport, pinned, viewerSub] = await Promise.all([
    header.isSelf ? Promise.resolve(null) : getViewerSupportForCreator(header.user.id),
    effectiveTab === "posts" ? getProfilePinnedPost(header.user.id, viewerId) : Promise.resolve(null),
    header.isSelf
      ? Promise.resolve({ subscribed: false as const })
      : getViewerCreatorSubscription(header.user.id),
  ]);
  const paymentsEnabled = isPaymentsConfigured();
  const subscriptionPriceKrw = creatorSubscriptionPriceForUser(header.user.creatorSubscriptionPriceKrw);

  return (
    <>
      <ProfileHeader
        user={header.user}
        isSelf={header.isSelf}
        isFollowing={header.isFollowing}
        followsYou={header.followsYou}
        viewerSupport={viewerSupport}
        paymentsEnabled={paymentsEnabled}
        subscriptionPriceKrw={subscriptionPriceKrw}
        subscribed={"subscribed" in viewerSub ? viewerSub.subscribed : false}
        blockedByViewer={header.relationship.blockedByViewer}
        blockedViewer={header.relationship.blockedViewer}
        mutedByViewer={header.relationship.mutedByViewer}
      />
      {pinned && effectiveTab === "posts" && (
        <ProfilePostCard
          post={pinned}
          isSelf={header.isSelf}
          pinnedHighlight
          paymentsEnabled={paymentsEnabled}
          authorId={header.user.id}
          subscriptionPriceKrw={subscriptionPriceKrw}
          subscribed={"subscribed" in viewerSub ? viewerSub.subscribed : false}
        />
      )}
      <ProfileTabs username={username} showLikesTab={header.isSelf} isSelf={header.isSelf} />
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
