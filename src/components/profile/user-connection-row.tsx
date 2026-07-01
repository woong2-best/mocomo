"use client";

import Link from "next/link";
import { UserCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileFollowButton } from "@/components/profile/profile-follow-button";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { userDisplayName } from "@/lib/user-public-select";
import type { ConnectionUser } from "@/actions/user-connections";

export function UserConnectionRow({
  user,
  viewerId,
  profileUserId,
  tabKind,
}: {
  user: ConnectionUser;
  viewerId: string | null;
  profileUserId: string;
  tabKind: "followers" | "following" | "subscribers" | "subscriptions";
}) {
  const displayName = userDisplayName(user);
  const isSelf = viewerId === user.id;
  const viewingOwnList = viewerId === profileUserId;
  const showFollowsYou =
    tabKind === "followers" &&
    (viewingOwnList || user.followsViewer);

  const followLabel =
    user.followsViewer && !user.viewerFollows ? "맞팔로우하기" : "팔로우";
  const followingLabel = "팔로잉";

  return (
    <li className="flex gap-3 px-4 py-3 border-b border-border/60 hover:bg-muted/20 transition-colors">
      <Link href={`/u/${user.username}`} className="shrink-0">
        <Avatar className="h-11 w-11 ring-1 ring-border/40">
          <AvatarImage src={user.image ?? undefined} alt="" />
          <AvatarFallback className="text-sm font-semibold">
            {displayName[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1 min-w-0 flex gap-2 items-start">
        <Link href={`/u/${user.username}`} className="flex-1 min-w-0">
          {showFollowsYou && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
              <UserCheck className="h-3 w-3 shrink-0" />
              나를 팔로우합니다
            </p>
          )}
          <DisplayNameWithSupportTier
            name={displayName}
            tier={user.supportTierSent}
            nameClassName="font-bold text-[15px] leading-tight"
            compact
          />
          <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
          {user.bio && (
            <p className="text-sm text-foreground/85 line-clamp-2 mt-1 whitespace-pre-wrap">
              {user.bio}
            </p>
          )}
        </Link>

        {viewerId && !isSelf && (
          <ProfileFollowButton
            userId={user.id}
            username={user.username}
            initialFollowing={user.viewerFollows}
            followLabel={followLabel}
            followingLabel={followingLabel}
            size="sm"
            className="shrink-0"
          />
        )}
      </div>
    </li>
  );
}
