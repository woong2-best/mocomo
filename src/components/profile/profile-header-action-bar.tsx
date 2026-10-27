import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

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
        followingLabel={t("lib.user.connections.s44bb989270")}
        syncFollowingOnMount
      />
      {canMessage ? <StartDmButton userId={userId} variant="profile" /> : null}
    </div>
  );
}
