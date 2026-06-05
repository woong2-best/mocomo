"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuthForAction, requireAuthMinimal } from "@/lib/auth";
import { createPostForUser, type CreatePostInput } from "@/lib/create-post-core";
import { calcHotScore } from "@/lib/utils";
import { MediaType, VoteType } from "@prisma/client";
import { submitContentReport } from "@/actions/report";
import { notifyPostComment, notifyPostVote } from "@/lib/notifications";

function createPostErrorMessage(code: string): string {
  switch (code) {
    case "UNAUTHORIZED":
      return "로그인이 필요합니다. 다시 로그인한 뒤 시도해 주세요.";
    case "BANNED":
      return "이용이 제한된 계정입니다.";
    case "USER_NOT_FOUND":
      return "계정 정보를 찾을 수 없습니다. 다시 로그인해 주세요.";
    default:
      return "게시에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }
}

export async function createPost(
  data: CreatePostInput & { media?: { url: string; type: MediaType }[] }
): Promise<{ postId?: string; error?: string }> {
  try {
    const user = await requireAuthForAction();
    return await createPostForUser(user, data);
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "UNAUTHORIZED" || code === "BANNED" || code === "USER_NOT_FOUND") {
      return { error: createPostErrorMessage(code) };
    }
    console.error("[createPost]", e);
    return { error: createPostErrorMessage("") };
  }
}

export async function votePost(postId: string, type: VoteType) {
  const user = await requireAuthMinimal();
  const existing = await db.vote.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
  });
  let createdUp = false;
  if (existing) {
    if (existing.type === type) {
      await db.vote.delete({ where: { id: existing.id } });
    } else {
      await db.vote.update({ where: { id: existing.id }, data: { type } });
      createdUp = type === "UP";
    }
  } else {
    await db.vote.create({ data: { userId: user.id, postId, type } });
    createdUp = type === "UP";
  }
  const [up, down, commentCount] = await Promise.all([
    db.vote.count({ where: { postId, type: "UP" } }),
    db.vote.count({ where: { postId, type: "DOWN" } }),
    db.comment.count({ where: { postId } }),
  ]);
  const post = await db.post.findUnique({ where: { id: postId } });
  if (post) {
    const hotScore = calcHotScore(up - down, commentCount, post.createdAt);
    await db.post.update({ where: { id: postId }, data: { hotScore } });
    if (createdUp) {
      void notifyPostVote(postId, post.authorId, user.id, "UP");
    }
  }
  revalidatePath(`/post/${postId}`);
  return { success: true };
}

export async function createComment(postId: string, content: string, parentId?: string) {
  const user = await requireAuthMinimal();
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });
  let parentCommentAuthorId: string | undefined;
  if (parentId) {
    const parent = await db.comment.findFirst({
      where: { id: parentId, postId },
      select: { authorId: true },
    });
    parentCommentAuthorId = parent?.authorId;
  }
  const comment = await db.comment.create({
    data: { content, authorId: user.id, postId, parentId },
    include: { author: { select: { id: true, username: true, image: true } } },
  });
  if (post) {
    void notifyPostComment({
      postId,
      postAuthorId: post.authorId,
      commentId: comment.id,
      actorId: user.id,
      parentCommentAuthorId,
      content,
    });
  }
  revalidatePath(`/post/${postId}`);
  return { comment };
}

export async function toggleBookmark(postId: string) {
  const user = await requireAuthMinimal();
  const existing = await db.bookmark.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
  });
  if (existing) {
    await db.bookmark.delete({ where: { id: existing.id } });
    revalidatePath("/star");
    return { bookmarked: false };
  }
  await db.bookmark.create({ data: { userId: user.id, postId } });
  revalidatePath("/star");
  return { bookmarked: true };
}

/** @deprecated submitContentReport 사용 */
export async function reportContent(
  data: Parameters<typeof submitContentReport>[0]
) {
  return submitContentReport(data);
}
