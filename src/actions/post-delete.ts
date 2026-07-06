"use server";

import { revalidatePath } from "next/cache";
import { getAuthUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { COMMUNITY_FEED_PATH } from "@/lib/site-routes";

export async function deleteOwnPost(
  postId: string
): Promise<{ ok?: true; error?: string; authorUsername?: string }> {
  const userId = await getAuthUserId();
  if (!userId) return { error: "로그인이 필요합니다." };

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, author: { select: { username: true } } },
  });
  if (!post) return { error: "게시물을 찾을 수 없습니다." };
  if (post.authorId !== userId) return { error: "본인 게시물만 삭제할 수 있습니다." };

  await db.report.deleteMany({ where: { postId } });
  await db.post.delete({ where: { id: postId } });

  const username = post.author.username;
  revalidatePath(`/u/${username}`);
  revalidatePath(`/post/${postId}`);
  revalidatePath(COMMUNITY_FEED_PATH);
  revalidatePath("/");

  return { ok: true, authorUsername: username };
}
