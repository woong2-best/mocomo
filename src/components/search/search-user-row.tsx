"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { ProfileFollowButton } from "@/components/profile/profile-follow-button";
import { userDisplayName } from "@/lib/user-public-select";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import type { SearchPageUser } from "@/lib/search-page-shared";

export function SearchUserRow({
  user,
  viewerId,
  className,
}: {
  user: SearchPageUser;
  viewerId?: string | null;
  className?: string;
}) {
  const { t } = useLocale();
  const displayName = userDisplayName(user);
  const isSelf = Boolean(viewerId && viewerId === user.id);
  const relation =
    user.isFollowing && user.followsYou
      ? t("search.slg0ed9")
      : user.followsYou
        ? t("search.s1asyh7h")
        : null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors",
        className
      )}
    >
      <Link href={`/u/${user.username}`} className="shrink-0">
        <Avatar className="h-12 w-12 ring-1 ring-border/50">
          <AvatarImage src={user.image ?? undefined} alt="" />
          <AvatarFallback className="text-sm bg-violet-500/10 text-violet-700 dark:text-violet-300">
            {displayName[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <Link href={`/u/${user.username}`} className="min-w-0 flex-1">
        <DisplayNameWithSupportTier
          name={displayName}
          tier={user.supportTierSent}
          nameClassName="text-[15px] font-semibold leading-tight truncate block"
          compact
        />
        <p className="truncate text-[13px] text-muted-foreground">@{user.username}</p>
        {relation ? (
          <p className="mt-0.5 text-[12px] text-muted-foreground">{relation}</p>
        ) : null}
        {user.bio ? (
          <p className="mt-1 line-clamp-2 text-[14px] leading-snug text-foreground/90">{user.bio}</p>
        ) : null}
      </Link>

      {!isSelf ? (
        <ProfileFollowButton
          userId={user.id}
          username={user.username}
          initialFollowing={!!user.isFollowing}
          postsLocked={user.postsLocked}
          size="sm"
          followLabel={t("profile.svtgiw")}
          followingLabel={t("search.s1w16mzd")}
        />
      ) : null}
    </div>
  );
}
