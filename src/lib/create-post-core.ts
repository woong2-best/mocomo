import { db } from "@/lib/db";
import { FEED_POSTS_CACHE_TAG } from "@/lib/cache-tags";
import { prismaErrorMessage } from "@/lib/prisma-user-error";
import { calcHotScore, tagSlugFromName } from "@/lib/utils";
import type { MediaType } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { notifyNewPostMentions } from "@/lib/notifications";
import {
  pollClosesAtFromDuration,
  validatePostPollInput,
  type CreatePostPollInput,
} from "@/lib/post-poll";

export type CreatePostInput = {
  content: string;
  title?: string;
  communityId?: string;
  animeId?: string;
  isNsfw?: boolean;
  tagNames?: string[];
  media?: { url: string; type: MediaType; priceKrw?: number }[];
  poll?: CreatePostPollInput;
};

function isPersistableMediaUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  if (u.startsWith("blob:") || u.startsWith("data:")) return false;
  return u.startsWith("http://") || u.startsWith("https://") || u.startsWith("/");
}

export async function createPostForUser(
  user: { id: string; username: string | null; isBanned?: boolean },
  data: CreatePostInput
): Promise<{ postId?: string; error?: string }> {
  if (user.isBanned) {
    return { error: "이용이 제한된 계정입니다." };
  }

  const content = data.content?.trim();
  if (!content) return { error: "내용을 입력해 주세요." };

  if (data.poll) {
    const pollErr = validatePostPollInput(data.poll);
    if (pollErr) return { error: pollErr };
  }

  try {
    let communityId: string | undefined = data.communityId?.trim() || undefined;
    if (communityId) {
      const community = await db.community.findUnique({
        where: { id: communityId },
        select: { id: true },
      });
      if (!community) communityId = undefined;
    }

    let animeId: string | undefined = data.animeId?.trim() || undefined;
    if (animeId) {
      const anime = await db.anime.findUnique({
        where: { id: animeId },
        select: { id: true },
      });
      if (!anime) animeId = undefined;
    }

    const mediaRows = (data.media ?? [])
      .filter((m) => m.url && isPersistableMediaUrl(m.url))
      .map((m) => ({
        url: m.url.trim(),
        type: m.type,
        priceKrw: Math.max(0, Math.floor(m.priceKrw ?? 0)),
      }));

    const pollOptions = data.poll
      ? data.poll.options.map((o) => o.trim()).filter(Boolean)
      : [];

    const post = await db.post.create({
      data: {
        title: data.title?.trim() || null,
        content,
        authorId: user.id,
        communityId,
        animeId,
        isNsfw: data.isNsfw ?? false,
        hotScore: calcHotScore(0, 0, new Date()),
        media:
          mediaRows.length > 0
            ? { create: mediaRows.map((m, i) => ({ ...m, order: i })) }
            : undefined,
        poll:
          data.poll && pollOptions.length >= 2
            ? {
                create: {
                  closesAt: pollClosesAtFromDuration(data.poll.durationMinutes),
                  options: {
                    create: pollOptions.map((label, order) => ({ label, order })),
                  },
                },
              }
            : undefined,
      },
      select: { id: true },
    });

    const tagNames = (data.tagNames ?? []).map((t) => t.trim()).filter(Boolean);
    for (const name of tagNames) {
      try {
        const slug = tagSlugFromName(name);
        if (!slug) continue;
        const tag = await db.tag.upsert({
          where: { slug },
          create: { name, slug },
          update: {},
        });
        await db.postTag.create({ data: { postId: post.id, tagId: tag.id } });
      } catch (tagErr) {
        console.error("[createPost] tag", name, tagErr);
      }
    }

    try {
      await db.user.update({
        where: { id: user.id },
        data: { xp: { increment: 10 } },
      });
    } catch (e) {
      console.error("[createPost] xp", e);
    }

    try {
      revalidateTag(FEED_POSTS_CACHE_TAG);
    } catch (e) {
      console.error("[createPost] revalidateTag", e);
    }

    void notifyNewPostMentions(post.id, user.id, data.title, content);

    return { postId: post.id };
  } catch (e) {
    console.error("[createPostForUser]", e);
    return { error: prismaErrorMessage(e) };
  }
}
