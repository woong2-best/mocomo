"use server";

import { revalidatePath } from "next/cache";
import { getAuthUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { clearProfileMainPost } from "@/lib/post-profile-pin";
import { COMMUNITY_FEED_PATH } from "@/lib/site-routes";

async function assertOwnPost(postId: string, userId: string) {
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { authorId: true, isAnonymous: true, author: { select: { username: true } } },
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
  if (!userId) return { error: "common.error.authRequired" };

  const post = await assertOwnPost(postId, userId);
  if (!post) return { error: "actions.sq8pidk" };
  if (post.isAnonymous) return { error: "actions.s1w3bf6y" };

  const me = await db.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  if (!me) return { error: "actions.svypth4" };

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
  if (!userId) return { error: "common.error.authRequired" };

  const post = await assertOwnPost(postId, userId);
  if (!post) return { error: "actions.s1yc3fyi" };

  const me = await db.user.findUnique({
    where: { id: userId },
    select: { username: true, profileMainPostId: true },
  });
  if (!me) return { error: "actions.svypth4" };

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
  if (!userId) return { error: "common.error.authRequired" };

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, isAnonymous: true },
  });
  if (!post) return { error: "actions.sgr97ft" };
  if (post.isAnonymous) return { error: "actions.so79hzz" };

  const me = await db.user.findUnique({
    where: { id: userId },
    select: { username: true, profileMainPostId: true },
  });
  if (!me) return { error: "actions.svypth4" };

  const prevMainId = me.profileMainPostId;

  // 프로필 메인 슬롯은 1개 — 기존 고정/대표 글 플래그를 모두 해제한 뒤 교체
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
      ...(prevMainId
        ? [
            db.post.updateMany({
              where: { id: prevMainId, authorId: userId, isPinned: true },
              data: { isPinned: false },
            }),
          ]
        : []),
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
  if (!userId) return { error: "common.error.authRequired" };

  const me = await db.user.findUnique({
    where: { id: userId },
    select: { username: true, profileMainPostId: true },
  });
  if (!me) return { error: "actions.svypth4" };
  if (me.profileMainPostId !== postId) {
    return { error: "actions.s69yi49" };
  }

  await clearProfileMainPost(userId, postId);

  revalidateProfile(me.username, postId);
  return { ok: true };
}
