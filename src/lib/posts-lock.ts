import { db } from "@/lib/db";

/** 잠금 계정의 글/미디어를 볼 수 있는지 (본인·승인 팔로워만) */
export async function canViewLockedAccountContent(
  authorId: string,
  viewerId: string | null | undefined,
  postsLocked?: boolean
): Promise<boolean> {
  if (viewerId && viewerId === authorId) return true;

  let locked = postsLocked;
  if (locked === undefined) {
    const author = await db.user.findUnique({
      where: { id: authorId },
      select: { postsLocked: true },
    });
    if (!author) return false;
    locked = author.postsLocked;
  }

  if (!locked) return true;
  if (!viewerId) return false;

  const follow = await db.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: viewerId,
        followingId: authorId,
      },
    },
    select: { followerId: true },
  });
  return !!follow;
}

/** 피드 등에서 잠금 작성자 글을 뷰어 기준으로 걸러냄 */
export async function filterPostsByAudienceLock<
  T extends { authorId?: string; author?: { id: string; postsLocked?: boolean } | null },
>(posts: T[], viewerId: string | null | undefined): Promise<T[]> {
  if (posts.length === 0) return posts;

  const lockedAuthorIds = new Set<string>();
  for (const post of posts) {
    const authorId = post.authorId ?? post.author?.id;
    if (!authorId) continue;
    if (viewerId && authorId === viewerId) continue;
    const locked = post.author?.postsLocked;
    if (locked === true) lockedAuthorIds.add(authorId);
    else if (locked === undefined) {
      // author select에 postsLocked가 없으면 일괄 조회
      lockedAuthorIds.add(authorId);
    }
  }

  if (lockedAuthorIds.size === 0) return posts;

  const ids = [...lockedAuthorIds];
  const [lockedUsers, follows] = await Promise.all([
    db.user.findMany({
      where: { id: { in: ids }, postsLocked: true },
      select: { id: true },
    }),
    viewerId
      ? db.follow.findMany({
          where: { followerId: viewerId, followingId: { in: ids } },
          select: { followingId: true },
        })
      : Promise.resolve([] as { followingId: string }[]),
  ]);

  const actuallyLocked = new Set(lockedUsers.map((u) => u.id));
  if (actuallyLocked.size === 0) return posts;

  const followingSet = new Set(follows.map((f) => f.followingId));

  return posts.filter((post) => {
    const authorId = post.authorId ?? post.author?.id;
    if (!authorId) return true;
    if (viewerId && authorId === viewerId) return true;
    if (!actuallyLocked.has(authorId)) return true;
    return followingSet.has(authorId);
  });
}

export async function isFollowingUser(
  viewerId: string,
  targetId: string
): Promise<boolean> {
  const row = await db.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: viewerId,
        followingId: targetId,
      },
    },
    select: { followerId: true },
  });
  return !!row;
}

export async function hasFollowRequest(
  requesterId: string,
  targetId: string
): Promise<boolean> {
  const row = await db.followRequest.findUnique({
    where: {
      requesterId_targetId: { requesterId, targetId },
    },
    select: { id: true },
  });
  return !!row;
}
