"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { ProfileFollowButton } from "@/components/profile/profile-follow-button";

export function LiveRoomFollowButton({
  hostUserId,
  hostUsername,
  initialFollowing,
}: {
  hostUserId: string;
  hostUsername: string;
  initialFollowing: boolean;
}) {
  const { t } = useLocale();
  return (
    <ProfileFollowButton
      userId={hostUserId}
      username={hostUsername}
      initialFollowing={initialFollowing}
      followLabel={t("live.svtgiw")}
      followingLabel={t("live.s1w16iuo")}
      syncFollowingOnMount
    />
  );
}
