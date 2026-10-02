import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getAuthUserId } from "@/lib/auth";
import { FEED_POSTS_CACHE_TAG } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { COMMUNITY_FEED_PATH } from "@/lib/site-routes";

export async function deleteOwnPost(
  postId: string
): Promise<{ ok?: true; error?: string; authorUsername?: string }> {
  const userId = await getAuthUserId();
  if (!userId) return { error: t("actions.s1mzxopt") };

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, author: { select: { username: true } } },
  });
  if (!post) return { error: t("actions.sgr97ft") };
  if (post.authorId !== userId) return { error: t("actions.si15yum") };

  await db.report.deleteMany({ where: { postId } });
  await db.post.delete({ where: { id: postId } });

  const username = post.author.username;
  revalidateTag(FEED_POSTS_CACHE_TAG);
  revalidatePath(`/u/${username}`);
  revalidatePath(`/post/${postId}`);
  revalidatePath(COMMUNITY_FEED_PATH);
  revalidatePath("/");

  return { ok: true, authorUsername: username };
}
