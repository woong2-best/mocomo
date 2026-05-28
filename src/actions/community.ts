"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth, requireAuthMinimal } from "@/lib/auth";
import { calcHotScore, slugify } from "@/lib/utils";
import { CommunityCategory, MediaType, VoteType } from "@prisma/client";
import { z } from "zod";
import { submitContentReport } from "@/actions/report";

export async function createCommunity(data: {
  name: string;
  description?: string;
  category: CommunityCategory;
  isNsfw?: boolean;
  parentId?: string;
}) {
  const user = await requireAuth();
  const slug = slugify(data.name) + "-" + Date.now().toString(36);
  const community = await db.community.create({
    data: {
      name: data.name,
      slug,
      description: data.description,
      category: data.category,
      isNsfw: data.isNsfw ?? false,
      parentId: data.parentId,
      creatorId: user.id,
      members: { create: { userId: user.id, role: "owner" } },
      memberCount: 1,
    },
  });
  revalidatePath("/communities");
  return { community };
}

export async function createPost(data: {
  content: string;
  title?: string;
  communityId?: string;
  isNsfw?: boolean;
  tagNames?: string[];
  media?: { url: string; type: MediaType }[];
}) {
  const user = await requireAuth();
  const post = await db.post.create({
    data: {
      title: data.title,
      content: data.content,
      authorId: user.id,
      communityId: data.communityId,
      isNsfw: data.isNsfw ?? false,
      media: data.media
        ? { create: data.media.map((m, i) => ({ ...m, order: i })) }
        : undefined,
    },
    include: { author: true, media: true, community: true },
  });

  if (data.tagNames?.length) {
    for (const name of data.tagNames) {
      const slug = slugify(name);
      const tag = await db.tag.upsert({
        where: { slug },
        create: { name, slug },
        update: {},
      });
      await db.postTag.create({ data: { postId: post.id, tagId: tag.id } });
    }
  }

  await db.user.update({
    where: { id: user.id },
    data: { xp: { increment: 10 } },
  });

  if (data.communityId) revalidatePath(`/c/${data.communityId}`);
  revalidatePath("/");
  return { post };
}

export async function votePost(postId: string, type: VoteType) {
  const user = await requireAuthMinimal();
  const existing = await db.vote.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
  });
  if (existing) {
    if (existing.type === type) {
      await db.vote.delete({ where: { id: existing.id } });
    } else {
      await db.vote.update({ where: { id: existing.id }, data: { type } });
    }
  } else {
    await db.vote.create({ data: { userId: user.id, postId, type } });
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
  }
  revalidatePath(`/post/${postId}`);
  return { success: true };
}

export async function createComment(postId: string, content: string, parentId?: string) {
  const user = await requireAuthMinimal();
  const comment = await db.comment.create({
    data: { content, authorId: user.id, postId, parentId },
    include: { author: { select: { id: true, username: true, image: true } } },
  });
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
