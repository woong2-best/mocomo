"use client";

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
  return (
    <ProfileFollowButton
      userId={hostUserId}
      username={hostUsername}
      initialFollowing={initialFollowing}
    />
  );
}
