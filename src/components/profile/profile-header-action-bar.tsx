import { ProfileFollowButton } from "@/components/profile/profile-follow-button";
import { StartDmButton } from "@/components/messages/start-dm-button";

export function ProfileHeaderActionBar({
  userId,
  username,
  initialFollowing,
  initialRequested = false,
  postsLocked = false,
}: {
  userId: string;
  username: string;
  initialFollowing: boolean;
  initialRequested?: boolean;
  postsLocked?: boolean;
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
      <StartDmButton userId={userId} variant="profile" />
    </div>
  );
}
