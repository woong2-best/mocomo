import { ProfileFollowButton } from "@/components/profile/profile-follow-button";
import { StartDmButton } from "@/components/messages/start-dm-button";

export function ProfileHeaderActionBar({
  userId,
  username,
  initialFollowing,
  initialRequested = false,
  postsLocked = false,
  canMessage = true,
}: {
  userId: string;
  username: string;
  initialFollowing: boolean;
  initialRequested?: boolean;
  postsLocked?: boolean;
  canMessage?: boolean;
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
      {canMessage ? <StartDmButton userId={userId} variant="profile" /> : null}
    </div>
  );
}
