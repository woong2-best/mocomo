"use server";

import { revalidatePath } from "next/cache";
import { getAuthUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { COMMUNITY_FEED_PATH } from "@/lib/site-routes";

async function assertOwnPost(postId: string, userId: string) {
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { authorId: true, author: { select: { username: true } } },
  });
  if (!post) return null;
  if (post.authorId !== userId) return null;
  return post;
}

function revalidateProfile(username: string, postId: string) {
  revalidatePath(`/u/${username}`);
  revalidatePath(`/post/${postId}`);
  revalidatePath(COMMUNITY_FEED_PATH);
}

/** 본인 게시물을 프로필 메인에 고정 (기존 isPinned + profileMainPostId) */
export async function pinPostToProfile(postId: string): Promise<{ ok?: true; error?: string }> {
  const userId = await getAuthUserId();
  if (!userId) return { error: "로그인이 필요합니다." };

  const post = await assertOwnPost(postId, userId);
  if (!post) return { error: "본인 게시물만 고정할 수 있습니다." };

  const me = await db.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  if (!me) return { error: "사용자를 찾을 수 없습니다." };

  await db.$transaction([
    db.post.updateMany({
      where: { authorId: userId, isPinned: true },
      data: { isPinned: false },
    }),
    db.post.update({
      where: { id: postId },
      data: { isPinned: true },
    }),
    db.user.update({
      where: { id: userId },
      data: { profileMainPostId: postId },
    }),
  ]);

  revalidateProfile(me.username, postId);
  return { ok: true };
}

export async function unpinPostFromProfile(postId: string): Promise<{ ok?: true; error?: string }> {
  const userId = await getAuthUserId();
  if (!userId) return { error: "로그인이 필요합니다." };

  const post = await assertOwnPost(postId, userId);
  if (!post) return { error: "본인 게시물만 고정 해제할 수 있습니다." };

  const me = await db.user.findUnique({
    where: { id: userId },
    select: { username: true, profileMainPostId: true },
  });
  if (!me) return { error: "사용자를 찾을 수 없습니다." };

  await db.$transaction([
    db.post.updateMany({
      where: { id: postId, authorId: userId, isPinned: true },
      data: { isPinned: false },
    }),
    ...(me.profileMainPostId === postId
      ? [
          db.user.update({
            where: { id: userId },
            data: { profileMainPostId: null },
          }),
        ]
      : []),
  ]);

  revalidateProfile(me.username, postId);
  return { ok: true };
}

/** 타인(또는 본인) 게시물을 내 프로필 메인에 올리기 */
export async function featurePostOnMyProfile(
  postId: string
): Promise<{ ok?: true; error?: string }> {
  const userId = await getAuthUserId();
  if (!userId) return { error: "로그인이 필요합니다." };

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });
  if (!post) return { error: "게시물을 찾을 수 없습니다." };

  const me = await db.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  if (!me) return { error: "사용자를 찾을 수 없습니다." };

  // 본인 글이면 isPinned도 동기화, 타인 글이면 profileMainPostId만
  if (post.authorId === userId) {
    await db.$transaction([
      db.post.updateMany({
        where: { authorId: userId, isPinned: true },
        data: { isPinned: false },
      }),
      db.post.update({
        where: { id: postId },
        data: { isPinned: true },
      }),
      db.user.update({
        where: { id: userId },
        data: { profileMainPostId: postId },
      }),
    ]);
  } else {
    await db.$transaction([
      db.post.updateMany({
        where: { authorId: userId, isPinned: true },
        data: { isPinned: false },
      }),
      db.user.update({
        where: { id: userId },
        data: { profileMainPostId: postId },
      }),
    ]);
  }

  revalidateProfile(me.username, postId);
  return { ok: true };
}

export async function unfeaturePostFromMyProfile(
  postId: string
): Promise<{ ok?: true; error?: string }> {
  const userId = await getAuthUserId();
  if (!userId) return { error: "로그인이 필요합니다." };

  const me = await db.user.findUnique({
    where: { id: userId },
    select: { username: true, profileMainPostId: true },
  });
  if (!me) return { error: "사용자를 찾을 수 없습니다." };
  if (me.profileMainPostId !== postId) {
    return { error: "프로필 메인에 올린 게시물이 아닙니다." };
  }

  await db.user.update({
    where: { id: userId },
    data: { profileMainPostId: null },
  });

  revalidateProfile(me.username, postId);
  return { ok: true };
}
