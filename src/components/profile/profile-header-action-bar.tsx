import { ProfileFollowButton } from "@/components/profile/profile-follow-button";
import { StartDmButton } from "@/components/messages/start-dm-button";
import { TipCreatorDialog } from "@/components/support/tip-creator-dialog";
import { SubscribeCreatorButton } from "@/components/monetization/subscribe-creator-button";
import { SupportTierLevel } from "@prisma/client";

export function ProfileHeaderActionBar({
  userId,
  username,
  displayName,
  initialFollowing,
  initialRequested = false,
  postsLocked = false,
  subscriptionPriceKrw,
  paymentsEnabled,
  subscribed,
  viewerSupport,
}: {
  userId: string;
  username: string;
  displayName: string;
  initialFollowing: boolean;
  initialRequested?: boolean;
  postsLocked?: boolean;
  subscriptionPriceKrw: number;
  paymentsEnabled: boolean;
  subscribed: boolean;
  viewerSupport?: {
    tier: SupportTierLevel;
    totalAmount: number;
  } | null;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      <ProfileFollowButton
        userId={userId}
        username={username}
        initialFollowing={initialFollowing}
        initialRequested={initialRequested}
        postsLocked={postsLocked}
        followingLabel="팔로잉"
        syncFollowingOnMount
      />
      <SubscribeCreatorButton
        creatorId={userId}
        username={username}
        priceKrw={subscriptionPriceKrw}
        paymentsEnabled={paymentsEnabled}
        subscribed={subscribed}
      />
      <TipCreatorDialog
        creatorId={userId}
        username={username}
        displayName={displayName}
        currentTier={viewerSupport?.tier}
        currentTotal={viewerSupport?.totalAmount}
        paymentsEnabled={paymentsEnabled}
        returnPath={`/u/${username}`}
      />
      <StartDmButton userId={userId} />
    </div>
  );
}
