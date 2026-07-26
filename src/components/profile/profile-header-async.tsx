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
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { ProfilePinnedPostGate } from "@/components/profile/profile-pinned-post-gate";
import { ProfilePinnedPostVisibility } from "@/components/profile/profile-pinned-post-visibility";
import { ProfilePostCard } from "@/components/profile/profile-post-card";
import { ProfileVisitTracker } from "@/components/profile/profile-visit-tracker";
import { getAuthUserId } from "@/lib/auth";
import { getPostEngagementForUser } from "@/lib/post-engagement";
import type { UserPublicFields } from "@/lib/user-public-select";

function ActionBarSkeleton() {
  return <div className="flex gap-2 flex-wrap h-10" aria-hidden />;
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
  author,
  isSelf,
  paymentsEnabled,
  subscriptionPriceKrw,
}: {
  userId: string;
  author: UserPublicFields;
  isSelf: boolean;
  paymentsEnabled: boolean;
  subscriptionPriceKrw: number;
}) {
  const viewerId = await getAuthUserId();
  const [pinned, viewerSub] = await Promise.all([
    getProfilePinnedPost(userId, viewerId, author),
    isSelf
      ? Promise.resolve({ subscribed: false as const })
      : getViewerCreatorSubscription(userId),
  ]);

  if (!pinned) return null;

  const engagement = viewerId
    ? await getPostEngagementForUser(viewerId, [pinned.id])
    : { likedIds: [] as string[], starredIds: [] as string[], repostedIds: [] as string[] };

  return (
    <ProfilePinnedPostVisibility postId={pinned.id}>
      <ProfilePostCard
        post={pinned}
        isSelf={isSelf}
        pinnedHighlight
        paymentsEnabled={paymentsEnabled}
        authorId={userId}
        subscriptionPriceKrw={subscriptionPriceKrw}
        subscribed={"subscribed" in viewerSub ? viewerSub.subscribed : false}
        initialLiked={engagement.likedIds.includes(pinned.id)}
        initialStarred={engagement.starredIds.includes(pinned.id)}
        initialReposted={engagement.repostedIds.includes(pinned.id)}
      />
    </ProfilePinnedPostVisibility>
  );
}

export async function ProfileHeaderAsync({ username }: { username: string }) {
  const header = await getProfileHeader(username);
  if (!header) notFound();

  const paymentsEnabled = isPaymentsConfigured();
  const subscriptionPriceKrw = creatorSubscriptionPriceForUser(header.user.creatorSubscriptionPriceKrw);
  const displayName = header.user.name || header.user.username;

  return (
    <>
      {!header.isSelf && (
        <ProfileVisitTracker
          username={header.user.username}
          profileUserId={header.user.id}
        />
      )}
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
      <ProfilePinnedPostGate>
        <Suspense fallback={<PinnedPostSkeleton />}>
          <ProfilePinnedPostAsync
            userId={header.user.id}
            author={header.author}
            isSelf={header.isSelf}
            paymentsEnabled={paymentsEnabled}
            subscriptionPriceKrw={subscriptionPriceKrw}
          />
        </Suspense>
      </ProfilePinnedPostGate>
      <ProfileTabs showLikesTab={header.isSelf} isSelf={header.isSelf} />
    </>
  );
}

export async function getProfileHeaderMeta(username: string) {
  const header = await getProfileHeader(username);
  if (!header) return null;
  return { header };
}
