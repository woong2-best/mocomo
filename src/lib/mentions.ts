import type { MentionAudience, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { extractMentionUsernames } from "@/lib/mention-utils";
import { blockedIdList, getBlockedUserIdSet } from "@/lib/user-block";

export const MAX_MENTIONS_PER_CONTENT = 20;
export const MENTION_TOO_MANY_ERROR = "You can mention up to 20 people.";
export const MENTION_NOT_ALLOWED_ERROR = "You can't mention this user.";

export type MentionState = "active" | "blocked" | "denied";
export type MentionStateMap = Record<string, MentionState>;

export type MentionSearchHit = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
};

export type ResolvedMentions = {
  mentionedUserIds: string[];
  mentionStates: MentionStateMap;
  notifyUserIds: string[];
};

export function parseMentionStates(raw: unknown): MentionStateMap | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: MentionStateMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === "active" || value === "blocked" || value === "denied") {
      out[key.toLowerCase()] = value;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

export function mentionStatesOf(
  value: { mentionStates?: unknown } | null | undefined
): MentionStateMap | undefined {
  return parseMentionStates(value?.mentionStates);
}

export function mentionWriteFields(resolved: ResolvedMentions): {
  mentionedUserIds: string[];
  mentionStates: Prisma.InputJsonValue;
} {
  return {
    mentionedUserIds: resolved.mentionedUserIds,
    mentionStates: resolved.mentionStates,
  };
}

function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "").slice(0, 32);
}

async function findUsersByMentionHandles(handles: string[]) {
  if (handles.length === 0) return [];

  const users = await db.user.findMany({
    where: {
      username: { in: handles, mode: "insensitive" },
      deletedAt: null,
    },
    select: {
      id: true,
      username: true,
      mentionAudience: true,
    },
  });

  const foundKeys = new Set(users.map((user) => user.username.toLowerCase()));
  const missing = handles.filter((handle) => !foundKeys.has(handle.toLowerCase()));
  if (missing.length === 0) return users;

  const logs = await db.usernameChangeLog.findMany({
    where: { oldUsername: { in: missing, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    select: { userId: true, oldUsername: true },
  });

  const extraIds = [
    ...new Set(
      logs
        .filter((row) => !users.some((user) => user.id === row.userId))
        .map((row) => row.userId)
    ),
  ];
  if (extraIds.length === 0) return users;

  const extraUsers = await db.user.findMany({
    where: { id: { in: extraIds }, deletedAt: null },
    select: { id: true, username: true, mentionAudience: true },
  });
  return [...users, ...extraUsers];
}

function mentionAllowed(
  audience: MentionAudience,
  mentionedFollowsActor: boolean
): boolean {
  if (audience === "NOBODY") return false;
  if (audience === "FOLLOWING_ONLY") return mentionedFollowsActor;
  return true;
}

/**
 * Parse @handles, cap count, apply block + mention privacy.
 * Privacy-denied handles fail the write. Blocked handles stay as plain text.
 */
export async function resolveContentMentions(
  text: string,
  actorId: string
): Promise<ResolvedMentions | { error: string }> {
  const handles = extractMentionUsernames(text);
  if (handles.length === 0) {
    return { mentionedUserIds: [], mentionStates: {}, notifyUserIds: [] };
  }
  if (handles.length > MAX_MENTIONS_PER_CONTENT) {
    return { error: MENTION_TOO_MANY_ERROR };
  }

  const users = await findUsersByMentionHandles(handles);
  if (users.length === 0) {
    return { mentionedUserIds: [], mentionStates: {}, notifyUserIds: [] };
  }

  const blocked = await getBlockedUserIdSet(actorId);
  const needsFollowCheck = users.filter(
    (user) => user.id !== actorId && user.mentionAudience === "FOLLOWING_ONLY" && !blocked.has(user.id)
  );
  const follows = needsFollowCheck.length
    ? await db.follow.findMany({
        where: {
          followingId: actorId,
          followerId: { in: needsFollowCheck.map((user) => user.id) },
        },
        select: { followerId: true },
      })
    : [];
  const mentionedFollowsActor = new Set(follows.map((row) => row.followerId));

  const mentionedUserIds: string[] = [];
  const notifyUserIds: string[] = [];
  const mentionStates: MentionStateMap = {};
  const denied: string[] = [];

  const byHandle = new Map<string, (typeof users)[number]>();
  for (const user of users) {
    byHandle.set(user.username.toLowerCase(), user);
  }

  const logs =
    users.length < handles.length
      ? await db.usernameChangeLog.findMany({
          where: {
            oldUsername: { in: handles, mode: "insensitive" },
            userId: { in: users.map((user) => user.id) },
          },
          select: { userId: true, oldUsername: true },
        })
      : [];
  for (const log of logs) {
    const user = users.find((row) => row.id === log.userId);
    if (user) byHandle.set(log.oldUsername.toLowerCase(), user);
  }

  for (const handle of handles) {
    const user = byHandle.get(handle.toLowerCase());
    if (!user) continue;
    const key = handle.toLowerCase();
    if (user.id === actorId) {
      mentionStates[key] = "active";
      mentionedUserIds.push(user.id);
      continue;
    }
    if (blocked.has(user.id)) {
      mentionStates[key] = "blocked";
      continue;
    }
    if (!mentionAllowed(user.mentionAudience, mentionedFollowsActor.has(user.id))) {
      mentionStates[key] = "denied";
      denied.push(user.username);
      continue;
    }
    mentionStates[key] = "active";
    mentionedUserIds.push(user.id);
    notifyUserIds.push(user.id);
  }

  if (denied.length > 0) {
    return { error: MENTION_NOT_ALLOWED_ERROR };
  }

  return {
    mentionedUserIds: [...new Set(mentionedUserIds)],
    mentionStates,
    notifyUserIds: [...new Set(notifyUserIds)],
  };
}

export async function searchUsersForMention(
  viewerId: string,
  rawQuery: string
): Promise<MentionSearchHit[]> {
  const q = normalizeHandle(rawQuery);
  if (q.length < 1) return [];

  const excludeIds = blockedIdList(await getBlockedUserIdSet(viewerId));
  const hits = await db.user.findMany({
    where: {
      id: { notIn: excludeIds },
      deletedAt: null,
      mentionAudience: { not: "NOBODY" },
      OR: [
        { username: { startsWith: q, mode: "insensitive" } },
        { name: { startsWith: q, mode: "insensitive" } },
      ],
    },
    take: 20,
    orderBy: { username: "asc" },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      mentionAudience: true,
    },
  });

  const restricted = hits.filter((user) => user.mentionAudience === "FOLLOWING_ONLY");
  const follows = restricted.length
    ? await db.follow.findMany({
        where: {
          followingId: viewerId,
          followerId: { in: restricted.map((user) => user.id) },
        },
        select: { followerId: true },
      })
    : [];
  const mentionedFollowsViewer = new Set(follows.map((row) => row.followerId));

  return hits
    .filter(
      (user) =>
        user.id === viewerId ||
        user.mentionAudience === "EVERYONE" ||
        mentionedFollowsViewer.has(user.id)
    )
    .map(({ id, username, name, image }) => ({ id, username, name, image }));
}

export type MentionCard = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  followRequested: boolean;
  postsLocked: boolean;
  missing?: never;
};

export async function loadMentionCard(
  username: string,
  viewerId: string | null
): Promise<MentionCard | { missing: true }> {
  const handle = normalizeHandle(username);
  if (!handle) return { missing: true };

  let user = await db.user.findFirst({
    where: { username: { equals: handle, mode: "insensitive" }, deletedAt: null },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      postsLocked: true,
      profile: { select: { bio: true } },
      _count: { select: { followers: true, following: true } },
    },
  });

  if (!user) {
    const log = await db.usernameChangeLog.findFirst({
      where: { oldUsername: { equals: handle, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      select: { userId: true },
    });
    if (log) {
      user = await db.user.findFirst({
        where: { id: log.userId, deletedAt: null },
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          postsLocked: true,
          profile: { select: { bio: true } },
          _count: { select: { followers: true, following: true } },
        },
      });
    }
  }

  if (!user) return { missing: true };

  if (viewerId && viewerId !== user.id) {
    const blocked = await getBlockedUserIdSet(viewerId);
    if (blocked.has(user.id)) return { missing: true };
  }

  let isFollowing = false;
  let followRequested = false;
  if (viewerId && viewerId !== user.id) {
    const [follow, request] = await Promise.all([
      db.follow.findUnique({
        where: {
          followerId_followingId: { followerId: viewerId, followingId: user.id },
        },
        select: { id: true },
      }),
      user.postsLocked
        ? db.followRequest.findUnique({
            where: {
              requesterId_targetId: { requesterId: viewerId, targetId: user.id },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);
    isFollowing = !!follow;
    followRequested = !!request;
  }

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    image: user.image,
    bio: user.profile?.bio?.trim().slice(0, 160) || null,
    followerCount: user._count.followers,
    followingCount: user._count.following,
    isFollowing,
    followRequested,
    postsLocked: user.postsLocked,
  };
}
