"use server";

import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import { isSubscriptionActive } from "@/lib/creator-subscription";
import type { ConnectionTab } from "@/lib/user-connections";
import { VERIFIED_TIER_FLOOR } from "@/lib/user-connections";
import type { SupportTierLevel } from "@prisma/client";

const userSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
  supportTierSent: true,
  profile: { select: { bio: true } },
  userBadges: { select: { id: true } },
} as const;

export type ConnectionUser = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  supportTierSent: SupportTierLevel;
  bio: string | null;
  followsViewer: boolean;
  viewerFollows: boolean;
};

export type UserConnectionsPayload = {
  profile: {
    id: string;
    username: string;
    displayName: string;
    followerCount: number;
  };
  tab: ConnectionTab;
  users: ConnectionUser[];
  viewerId: string | null;
};

type FollowUser = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  supportTierSent: SupportTierLevel;
  profile: { bio: string | null } | null;
  userBadges: { id: string }[];
};

async function mapFollowRows(
  rows: Array<{ follower?: FollowUser; following?: FollowUser }>,
  pick: "follower" | "following",
  viewerId: string | null,
  _profileUserId: string
): Promise<ConnectionUser[]> {
  const userIds = rows.map((r) => (pick === "follower" ? r.follower! : r.following!)).map((u) => u.id);

  const [viewerFollowsSet, followsViewerSet] = viewerId
    ? await Promise.all([
        db.follow
          .findMany({
            where: { followerId: viewerId, followingId: { in: userIds } },
            select: { followingId: true },
          })
          .then((rows) => new Set(rows.map((r) => r.followingId))),
        db.follow
          .findMany({
            where: { followerId: { in: userIds }, followingId: viewerId },
            select: { followerId: true },
          })
          .then((rows) => new Set(rows.map((r) => r.followerId))),
      ])
    : [new Set<string>(), new Set<string>()];

  return rows.map((row) => {
    const u = (pick === "follower" ? row.follower : row.following)!;
    return {
      id: u.id,
      username: u.username,
      name: u.name,
      image: u.image,
      supportTierSent: u.supportTierSent,
      bio: u.profile?.bio ?? null,
      followsViewer: viewerId ? followsViewerSet.has(u.id) : false,
      viewerFollows: viewerId ? viewerFollowsSet.has(u.id) : false,
    };
  });
}

async function mapSubscriptionUsers(
  users: Array<{
    id: string;
    username: string;
    name: string | null;
    image: string | null;
    supportTierSent: SupportTierLevel;
    profile: { bio: string | null } | null;
    userBadges: { id: string }[];
  }>,
  viewerId: string | null
): Promise<ConnectionUser[]> {
  const userIds = users.map((u) => u.id);
  const [viewerFollowsSet, followsViewerSet] = viewerId
    ? await Promise.all([
        db.follow
          .findMany({
            where: { followerId: viewerId, followingId: { in: userIds } },
            select: { followingId: true },
          })
          .then((rows) => new Set(rows.map((r) => r.followingId))),
        db.follow
          .findMany({
            where: { followerId: { in: userIds }, followingId: viewerId },
            select: { followerId: true },
          })
          .then((rows) => new Set(rows.map((r) => r.followerId))),
      ])
    : [new Set<string>(), new Set<string>()];

  return users.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    image: u.image,
    supportTierSent: u.supportTierSent,
    bio: u.profile?.bio ?? null,
    followsViewer: viewerId ? followsViewerSet.has(u.id) : false,
    viewerFollows: viewerId ? viewerFollowsSet.has(u.id) : false,
  }));
}

export async function getUserConnections(
  username: string,
  tab: ConnectionTab
): Promise<UserConnectionsPayload | null> {
  const viewerId = await getAuthUserId();
  const profileUser = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      _count: { select: { followers: true } },
    },
  });
  if (!profileUser) return null;

  const displayName = profileUser.name?.trim() || profileUser.username;
  let users: ConnectionUser[] = [];

  if (tab === "followers") {
    const rows = await db.follow.findMany({
      where: { followingId: profileUser.id },
      take: 100,
      orderBy: { createdAt: "desc" },
      include: { follower: { select: userSelect } },
    });
    users = await mapFollowRows(rows, "follower", viewerId, profileUser.id);
  } else if (tab === "following") {
    const rows = await db.follow.findMany({
      where: { followerId: profileUser.id },
      take: 100,
      orderBy: { createdAt: "desc" },
      include: { following: { select: userSelect } },
    });
    users = await mapFollowRows(rows, "following", viewerId, profileUser.id);
  } else if (tab === "verified") {
    const rows = await db.follow.findMany({
      where: {
        followingId: profileUser.id,
        follower: {
          OR: [
            { supportTierSent: { in: [...VERIFIED_TIER_FLOOR] } },
            { userBadges: { some: {} } },
          ],
        },
      },
      take: 100,
      orderBy: { createdAt: "desc" },
      include: { follower: { select: userSelect } },
    });
    users = await mapFollowRows(rows, "follower", viewerId, profileUser.id);
  } else if (tab === "known") {
    if (!viewerId) {
      users = [];
    } else {
      const networkIds = (
        await db.follow.findMany({
          where: { followerId: viewerId },
          select: { followingId: true },
          take: 500,
        })
      ).map((f) => f.followingId);

      const rows =
        networkIds.length === 0
          ? []
          : await db.follow.findMany({
              where: {
                followingId: profileUser.id,
                follower: {
                  followers: {
                    some: { followerId: { in: networkIds } },
                  },
                },
              },
              take: 100,
              orderBy: { createdAt: "desc" },
              include: { follower: { select: userSelect } },
            });
      users = await mapFollowRows(rows, "follower", viewerId, profileUser.id);
    }
  } else if (tab === "subscribers") {
    const subs = await db.subscription.findMany({
      where: { creatorId: profileUser.id },
      take: 100,
      orderBy: { subscribedSince: "desc" },
      include: { subscriber: { select: userSelect } },
    });
    const active = subs.filter((s) => isSubscriptionActive(s));
    users = await mapSubscriptionUsers(
      active.map((s) => s.subscriber),
      viewerId
    );
  } else if (tab === "subscriptions") {
    const subs = await db.subscription.findMany({
      where: { subscriberId: profileUser.id },
      take: 100,
      orderBy: { subscribedSince: "desc" },
      include: { creator: { select: userSelect } },
    });
    const active = subs.filter((s) => isSubscriptionActive(s));
    users = await mapSubscriptionUsers(
      active.map((s) => s.creator),
      viewerId
    );
  }

  return {
    profile: {
      id: profileUser.id,
      username: profileUser.username,
      displayName,
      followerCount: profileUser._count.followers,
    },
    tab,
    users,
    viewerId,
  };
}
