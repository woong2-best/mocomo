import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isPaymentsConfigured } from "@/lib/payments";
import {
  getProfileHeader,
  getProfilePinnedPost,
  getViewerCreatorSubscription,
} from "@/actions/profile-page";
import { creatorSubscriptionPriceForUser } from "@/lib/creator-subscription";
import { getViewerSupportForCreator } from "@/actions/support";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileHeaderActionBar } from "@/components/profile/profile-header-action-bar";
import { parseProfileTab } from "@/lib/profile-queries";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { ProfilePostCard } from "@/components/profile/profile-post-card";
import { getAuthUserId } from "@/lib/auth";

function ActionBarSkeleton() {
  return <div className="pt-3 flex gap-2 flex-wrap justify-end h-10" aria-hidden />;
}

function PinnedPostSkeleton() {
  return <div className="h-28 border-b border-border/60 bg-muted/20 animate-pulse" aria-hidden />;
}

async function ProfileHeaderActionBarAsync({
  userId,
  username,
  displayName,
  isFollowing,
  subscriptionPriceKrw,
  paymentsEnabled,
}: {
  userId: string;
  username: string;
  displayName: string;
  isFollowing: boolean;
  subscriptionPriceKrw: number;
  paymentsEnabled: boolean;
}) {
  const [viewerSupport, viewerSub] = await Promise.all([
    getViewerSupportForCreator(userId),
    getViewerCreatorSubscription(userId),
  ]);

  return (
    <ProfileHeaderActionBar
      userId={userId}
      username={username}
      displayName={displayName}
      initialFollowing={isFollowing}
      subscriptionPriceKrw={subscriptionPriceKrw}
      paymentsEnabled={paymentsEnabled}
      subscribed={"subscribed" in viewerSub ? viewerSub.subscribed : false}
      viewerSupport={viewerSupport}
    />
  );
}

async function ProfilePinnedPostAsync({
  userId,
  username,
  tabParam,
  isSelf,
  paymentsEnabled,
  subscriptionPriceKrw,
}: {
  userId: string;
  username: string;
  tabParam?: string;
  isSelf: boolean;
  paymentsEnabled: boolean;
  subscriptionPriceKrw: number;
}) {
  const tab = parseProfileTab(tabParam);
  const effectiveTab = tab === "likes" && !isSelf ? "posts" : tab;
  if (effectiveTab !== "posts") return null;

  const header = await getProfileHeader(username);
  if (!header) return null;

  const viewerId = await getAuthUserId();
  const [pinned, viewerSub] = await Promise.all([
    getProfilePinnedPost(userId, viewerId, header.author),
    isSelf
      ? Promise.resolve({ subscribed: false as const })
      : getViewerCreatorSubscription(userId),
  ]);

  if (!pinned) return null;

  return (
    <ProfilePostCard
      post={pinned}
      isSelf={isSelf}
      pinnedHighlight
      paymentsEnabled={paymentsEnabled}
      authorId={userId}
      subscriptionPriceKrw={subscriptionPriceKrw}
      subscribed={"subscribed" in viewerSub ? viewerSub.subscribed : false}
    />
  );
}

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
  const paymentsEnabled = isPaymentsConfigured();
  const subscriptionPriceKrw = creatorSubscriptionPriceForUser(header.user.creatorSubscriptionPriceKrw);
  const displayName = header.user.name || header.user.username;

  return (
    <>
      <ProfileHeader
        user={header.user}
        isSelf={header.isSelf}
        isFollowing={header.isFollowing}
        followsYou={header.followsYou}
        blockedByViewer={header.relationship.blockedByViewer}
        blockedViewer={header.relationship.blockedViewer}
        mutedByViewer={header.relationship.mutedByViewer}
        actionBar={
          header.isSelf ? undefined : header.relationship.blockedByViewer || header.relationship.blockedViewer ? null : (
            <Suspense fallback={<ActionBarSkeleton />}>
              <ProfileHeaderActionBarAsync
                userId={header.user.id}
                username={header.user.username}
                displayName={displayName}
                isFollowing={header.isFollowing}
                subscriptionPriceKrw={subscriptionPriceKrw}
                paymentsEnabled={paymentsEnabled}
              />
            </Suspense>
          )
        }
      />
      <Suspense fallback={effectiveTab === "posts" ? <PinnedPostSkeleton /> : null}>
        <ProfilePinnedPostAsync
          userId={header.user.id}
          username={username}
          tabParam={tabParam}
          isSelf={header.isSelf}
          paymentsEnabled={paymentsEnabled}
          subscriptionPriceKrw={subscriptionPriceKrw}
        />
      </Suspense>
      <ProfileTabs username={username} showLikesTab={header.isSelf} isSelf={header.isSelf} />
    </>
  );
}

export async function getProfileHeaderMeta(username: string, tabParam?: string) {
  const header = await getProfileHeader(username);
  if (!header) return null;
  const tab = parseProfileTab(tabParam);
  const effectiveTab = tab === "likes" && !header.isSelf ? "posts" : tab;
  return { header, effectiveTab };
}
