import { db } from "@/lib/db";
import { FEED_POSTS_CACHE_TAG } from "@/lib/cache-tags";
import { prismaErrorMessage } from "@/lib/prisma-user-error";
import { calcHotScore, tagSlugFromName } from "@/lib/utils";
import type { MediaType } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { notifyNewPostMentions, notifyQuotedPosts } from "@/lib/notifications";
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
import { validateSaleMediaPricing } from "@/lib/money";
import { assertAdultContentNotMonetized } from "@/lib/adult-monetization-ban";
import { extractHashtagNames } from "@/lib/linkify";
import { isCommunityScopedPost } from "@/lib/post-scope";
import { loadMemberPermissions } from "@/lib/community-server/member-permissions";
import { hasPermission } from "@/lib/community-server/permissions";
import {
  assertCanPublishNsfwContent,
  nsfwViewerSelect,
} from "@/lib/nsfw-viewer-access";

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
  contentRating?: import("@prisma/client").ContentRating;
  isNsfw?: boolean;
  tagNames?: string[];
  visibility?: import("@prisma/client").ContentVisibility;
  instantPurchasePriceKrw?: number;
  media?: CreatePostMediaInput[];
  poll?: CreatePostPollInput;
  /** QnA only — stored on Post.authorId, hidden in public UI */
  isAnonymous?: boolean;
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

  const requestedCommunityId = data.communityId?.trim() || undefined;
  if (
    requestedCommunityId &&
    (Math.max(0, Math.floor(data.instantPurchasePriceKrw ?? 0)) > 0 ||
      (data.media ?? []).some((m) => Math.max(0, Math.floor(m.priceKrw ?? 0)) > 0))
  ) {
    return { error: "QnA에는 유료 파일을 올릴 수 없습니다." };
  }

  const instantPrice = Math.max(0, Math.floor(data.instantPurchasePriceKrw ?? 0));
  const mediaPrices = (data.media ?? [])
    .filter((m) => m.url && isPersistableMediaUrl(String(m.url)))
    .map((m) => Math.max(0, Math.floor(m.priceKrw ?? 0)));
  const maxMediaPrice = mediaPrices.length > 0 ? Math.max(...mediaPrices) : 0;

  const contentRating =
    data.contentRating ?? (data.isNsfw ? "ADULT" : "GENERAL");
  const adultMonetizationErr = assertAdultContentNotMonetized(contentRating, {
    hasInstantPurchase: instantPrice > 0,
    hasPaidMedia: mediaPrices.some((p) => p > 0),
  });
  if (adultMonetizationErr) return { error: adultMonetizationErr };

  if (contentRating === "ADULT") {
    const nsfwUser = await db.user.findUnique({
      where: { id: user.id },
      select: nsfwViewerSelect,
    });
    const publishErr = assertCanPublishNsfwContent(
      nsfwUser ?? { id: user.id, birthDate: null },
      true
    );
    if (publishErr) return { error: publishErr };
  }

  const pricingErr = validateSaleMediaPricing(maxMediaPrice, instantPrice);
  if (pricingErr) return { error: pricingErr };

  const paidMediaInput = mediaPrices.some((p) => p > 0);
  if (instantPrice > 0 || paidMediaInput) {
    const seller = await db.user.findUnique({
      where: { id: user.id },
      select: { stripeOnboardingCompleted: true, stripeConnectOnboardedAt: true, phoneVerified: true, username: true },
    });
    const settlementErr = assertSettlementAccount(seller);
    if (settlementErr) {
      const back = seller?.username ? `/u/${seller.username}` : "/";
      return settlementRequiredResult(back);
    }
  }

  try {
    let communityId: string | undefined = requestedCommunityId;
    if (communityId) {
      const community = await db.community.findUnique({
        where: { id: communityId },
        select: { id: true, creatorId: true },
      });
      if (!community) {
        return { error: "QnA를 찾을 수 없습니다." };
      }
      const isOwner = community.creatorId === user.id;
      const perms = await loadMemberPermissions(communityId, user.id, isOwner);
      if (!isOwner && !hasPermission(perms, "createPosts")) {
        return { error: "게시글 작성 권한이 없습니다." };
      }
    }
    const isAnonymous = Boolean(communityId);

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
        priceKrw: communityId ? 0 : Math.max(0, Math.floor(m.priceKrw ?? 0)),
        width: clampMediaInt(m.width),
        height: clampMediaInt(m.height),
        duration: clampMediaInt(m.duration, 86_400),
      }));

    const pollOptions = data.poll
      ? data.poll.options.map((o) => o.trim()).filter(Boolean)
      : [];

    const contentRating =
      data.contentRating ?? (data.isNsfw ? "ADULT" : "GENERAL");

    const post = await db.post.create({
      data: {
        title: data.title?.trim() || null,
        content,
        authorId: user.id,
        communityId,
        animeId,
        contentRating,
        isNsfw: contentRating === "ADULT",
        isAnonymous,
        visibility: data.visibility ?? "PUBLIC",
        instantPurchasePriceKrw: communityId
          ? 0
          : Math.max(0, Math.floor(data.instantPurchasePriceKrw ?? 0)),
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

    const explicitTags = (data.tagNames ?? []).map((t) => t.trim()).filter(Boolean);
    const contentTags = extractHashtagNames(content);
    const tagKeySet = new Set<string>();
    const tagNames: string[] = [];
    for (const name of [...explicitTags, ...contentTags]) {
      const key = name.toLowerCase();
      if (tagKeySet.has(key)) continue;
      tagKeySet.add(key);
      tagNames.push(name);
    }
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
      if (!isCommunityScopedPost({ communityId })) {
        revalidateTag(FEED_POSTS_CACHE_TAG);
      }
    } catch (e) {
      console.error("[createPost] revalidateTag", e);
    }

    if (!isCommunityScopedPost({ communityId })) {
      void notifyNewPostMentions(post.id, user.id, data.title, content);
    }
    void notifyQuotedPosts({
      content,
      actorId: user.id,
      quotePostId: post.id,
    });

    const videoMedia = post.media
      .filter((m) => m.type === "VIDEO")
      .map((m) => ({ id: m.id, url: m.url }));
    enqueuePostMediaHlsPackaging(videoMedia);

    const collabIds = isAnonymous
      ? []
      : (data.collaboratorUserIds ?? []).map((id) => String(id).trim()).filter(Boolean);
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
