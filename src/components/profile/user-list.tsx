import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileFollowButton } from "@/components/profile/profile-follow-button";
import { getAuthUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";

export async function UserListPage({
  username,
  type,
}: {
  username: string;
  type: "followers" | "following";
}) {
  const viewerId = await getAuthUserId();
  const profileUser = await db.user.findUnique({
    where: { username },
    select: { id: true, username: true, name: true },
  });
  if (!profileUser) return null;

  const where =
    type === "followers"
      ? { followingId: profileUser.id }
      : { followerId: profileUser.id };

  const rows = await db.follow.findMany({
    where,
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      follower: {
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          supportTierSent: true,
          profile: { select: { bio: true } },
        },
      },
      following: {
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          supportTierSent: true,
          profile: { select: { bio: true } },
        },
      },
    },
  });

  const users = rows.map((r) => (type === "followers" ? r.follower : r.following));
  const title = type === "followers" ? "팔로워" : "팔로잉";

  const followingIds = viewerId
    ? new Set(
        (
          await db.follow.findMany({
            where: { followerId: viewerId },
            take: 500,
            select: { followingId: true },
          })
        ).map((f) => f.followingId)
      )
    : new Set<string>();

  return (
    <div className="max-w-2xl mx-auto min-h-screen border-x border-border/40">
      <div className="sticky top-14 z-20 flex items-center gap-4 px-4 py-3 bg-background/90 backdrop-blur border-b border-border/60">
        <Link href={`/u/${username}`} className="p-2 -ml-2 rounded-full hover:bg-muted/80">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">@{username}</p>
        </div>
      </div>

      {users.length === 0 ? (
        <p className="text-center text-muted-foreground py-16 text-sm">
          {type === "followers" ? "팔로워가 없습니다." : "팔로잉한 사용자가 없습니다."}
        </p>
      ) : (
        <ul>
          {users.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-border/60 hover:bg-muted/30"
            >
              <Link href={`/u/${u.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarImage src={u.image ?? undefined} />
                  <AvatarFallback>{u.username[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <DisplayNameWithSupportTier
                    name={u.name || u.username}
                    tier={u.supportTierSent}
                    nameClassName="font-bold"
                    compact
                  />
                  <p className="text-sm text-muted-foreground truncate">@{u.username}</p>
                  {u.profile?.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{u.profile.bio}</p>
                  )}
                </div>
              </Link>
              {viewerId && viewerId !== u.id && (
                <ProfileFollowButton
                  userId={u.id}
                  username={u.username}
                  initialFollowing={followingIds.has(u.id)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
