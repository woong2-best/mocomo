import { db } from "@/lib/db";
import { FEED_POSTS_CACHE_TAG } from "@/lib/cache-tags";
import { prismaErrorMessage } from "@/lib/prisma-user-error";
import { calcHotScore, tagSlugFromName } from "@/lib/utils";
import type { MediaType } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { notifyNewPostMentions } from "@/lib/notifications";
import {
  CollaboratorError,
  inviteCollaborators,
} from "@/lib/post-collaborators";
import {
  pollClosesAtFromDuration,
  validatePostPollInput,
  type CreatePostPollInput,
} from "@/lib/post-poll";
import { enqueuePostMediaHlsPackaging } from "@/lib/post-media-hls";
import { clampMediaInt } from "@/lib/video-metadata";
import { assertSettlementAccount, settlementRequiredResult } from "@/lib/settlement-account";

export type CreatePostMediaInput = {
  url: string;
  type: MediaType;
  priceKrw?: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
};

export type CreatePostInput = {
  content: string;
  title?: string;
  communityId?: string;
  animeId?: string;
  isNsfw?: boolean;
  tagNames?: string[];
  visibility?: import("@prisma/client").ContentVisibility;
  instantPurchasePriceKrw?: number;
  media?: CreatePostMediaInput[];
  poll?: CreatePostPollInput;
  /** User IDs to invite as PENDING collaborators on create */
  collaboratorUserIds?: string[];
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

  const content = data.content?.trim() ?? "";
  const hasMediaInput = (data.media ?? []).some(
    (m) => m.url && isPersistableMediaUrl(String(m.url))
  );

  if (data.poll) {
    const pollErr = validatePostPollInput(data.poll);
    if (pollErr) return { error: pollErr };
    if (!content) return { error: "투표 질문을 본문에 적어 주세요." };
  } else if (!content && !hasMediaInput) {
    return { error: "내용을 입력해 주세요." };
  }

  const instantPrice = Math.max(0, Math.floor(data.instantPurchasePriceKrw ?? 0));
  const paidMediaInput = (data.media ?? []).some(
    (m) => m.url && isPersistableMediaUrl(String(m.url)) && Math.max(0, Math.floor(m.priceKrw ?? 0)) > 0
  );
  if (instantPrice > 0 || paidMediaInput) {
    const seller = await db.user.findUnique({
      where: { id: user.id },
      select: { bankVerifiedAt: true, phoneVerified: true, username: true },
    });
    const settlementErr = assertSettlementAccount(seller);
    if (settlementErr) {
      const back = seller?.username ? `/u/${seller.username}` : "/";
      return settlementRequiredResult(back);
    }
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
        width: clampMediaInt(m.width),
        height: clampMediaInt(m.height),
        duration: clampMediaInt(m.duration, 86_400),
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
        visibility: data.visibility ?? "PUBLIC",
        instantPurchasePriceKrw: Math.max(0, Math.floor(data.instantPurchasePriceKrw ?? 0)),
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
      select: {
        id: true,
        media: { select: { id: true, url: true, type: true } },
      },
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
      revalidateTag(FEED_POSTS_CACHE_TAG);
    } catch (e) {
      console.error("[createPost] revalidateTag", e);
    }

    void notifyNewPostMentions(post.id, user.id, data.title, content);

    const videoMedia = post.media
      .filter((m) => m.type === "VIDEO")
      .map((m) => ({ id: m.id, url: m.url }));
    enqueuePostMediaHlsPackaging(videoMedia);

    const collabIds = (data.collaboratorUserIds ?? [])
      .map((id) => String(id).trim())
      .filter(Boolean);
    if (collabIds.length > 0) {
      try {
        await inviteCollaborators(post.id, user.id, collabIds);
      } catch (e) {
        console.error("[createPost] collaborators", e);
        // Post already created — surface invite error without rolling back.
        const msg =
          e instanceof CollaboratorError
            ? e.message
            : "공동작업자 초대에 실패했습니다.";
        return { postId: post.id, error: msg };
      }
    }

    return { postId: post.id };
  } catch (e) {
    console.error("[createPostForUser]", e);
    return { error: prismaErrorMessage(e) };
  }
}
