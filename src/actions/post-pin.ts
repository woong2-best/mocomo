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

export async function pinPostToProfile(postId: string): Promise<{ ok?: true; error?: string }> {
  const userId = await getAuthUserId();
  if (!userId) return { error: "로그인이 필요합니다." };

  const post = await assertOwnPost(postId, userId);
  if (!post) return { error: "본인 게시물만 고정할 수 있습니다." };

  await db.$transaction([
    db.post.updateMany({
      where: { authorId: userId, isPinned: true },
      data: { isPinned: false },
    }),
    db.post.update({
      where: { id: postId },
      data: { isPinned: true },
    }),
  ]);

  revalidateProfile(post.author.username, postId);
  return { ok: true };
}

export async function unpinPostFromProfile(postId: string): Promise<{ ok?: true; error?: string }> {
  const userId = await getAuthUserId();
  if (!userId) return { error: "로그인이 필요합니다." };

  const post = await assertOwnPost(postId, userId);
  if (!post) return { error: "본인 게시물만 고정 해제할 수 있습니다." };

  await db.post.updateMany({
    where: { id: postId, authorId: userId, isPinned: true },
    data: { isPinned: false },
  });

  revalidateProfile(post.author.username, postId);
  return { ok: true };
}
