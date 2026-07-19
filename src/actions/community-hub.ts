"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth, getCachedCurrentUser } from "@/lib/auth";
import { generateCommunitySlug, normalizeCommunitySlugParam } from "@/lib/community-slug";
import { prismaErrorMessage } from "@/lib/prisma-user-error";
import { notifyCommunityJoin } from "@/lib/notifications";
import type { CommunityCategory } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { postMediaPreview } from "@/lib/post-media-select";
import { userPublicSelect } from "@/lib/user-public-select";
import { provisionCommunityServer } from "@/lib/community-server/provision";

const COMMUNITY_CATEGORIES = [
  "ANIME",
  "MANGA",
  "GAME",
  "VTUBER",
  "COSPLAY",
  "FIGURE",
  "ART",
  "MUSIC",
  "AI_ART",
  "LIGHT_NOVEL",
  "GOODS",
  "OTHER",
] as const satisfies readonly CommunityCategory[];

export async function isCommunityDbReady() {
  try {
    await db.community.findFirst({ select: { id: true } });
    await db.communityMember.findFirst({ select: { id: true } });
    return true;
  } catch {
    return false;
  }
}

export async function createCommunity(data: {
  name: string;
  description?: string;
  category: string;
  isNsfw?: boolean;
  parentId?: string;
}): Promise<
  | { community: { id: string; slug: string; name: string } }
  | { error: string }
> {
  try {
    const user = await requireAuth();
    const name = data.name?.trim();
    if (!name || name.length < 2) {
      return { error: "커뮤니티 이름은 2자 이상 입력해 주세요." };
    }
    if (name.length > 80) {
      return { error: "커뮤니티 이름은 80자 이하로 입력해 주세요." };
    }

    const category = data.category as CommunityCategory;
    if (!COMMUNITY_CATEGORIES.includes(category as (typeof COMMUNITY_CATEGORIES)[number])) {
      return { error: "카테고리를 선택해 주세요." };
    }

    const description = data.description?.trim() || null;

    for (let attempt = 0; attempt < 4; attempt++) {
      const slug =
        attempt === 0 ? generateCommunitySlug(name) : `${generateCommunitySlug(name)}-${attempt}`;
      try {
        const community = await db.$transaction(async (tx) => {
          const row = await tx.community.create({
            data: {
              name,
              slug,
              description,
              category,
              isNsfw: data.isNsfw ?? false,
              parentId: data.parentId ?? null,
              creatorId: user.id,
              memberCount: 1,
            },
            select: { id: true, slug: true, name: true },
          });
          await tx.communityMember.create({
            data: {
              communityId: row.id,
              userId: user.id,
              role: "owner",
              presence: "ONLINE",
            },
          });
          await provisionCommunityServer(tx, row.id, user.id, name);
          return row;
        });

        revalidatePath("/communities");
        revalidatePath(`/c/${community.slug}`);
        return { community };
      } catch (inner) {
        if (
          inner instanceof Prisma.PrismaClientKnownRequestError &&
          inner.code === "P2002" &&
          attempt < 3
        ) {
          continue;
        }
        throw inner;
      }
    }

    return { error: "커뮤니티 주소가 겹칩니다. 이름을 바꿔 주세요." };
  } catch (e) {
    console.error("[createCommunity]", e);
    return { error: prismaErrorMessage(e) };
  }
}

export async function getCommunityBySlug(slug: string) {
  const normalizedSlug = normalizeCommunitySlugParam(slug);
  if (!normalizedSlug) return null;

  try {
    const user = await getCachedCurrentUser();

    const community = await db.community.findUnique({
      where: { slug: normalizedSlug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        isNsfw: true,
        memberCount: true,
        creatorId: true,
        children: {
          take: 24,
          select: { id: true, name: true, slug: true, memberCount: true },
        },
      },
    });
    if (!community) return null;

    let posts: Array<{
      id: string;
      title: string | null;
      content: string;
      createdAt: Date;
      isNsfw: boolean;
      author: {
        id: string;
        username: string;
        name: string | null;
        image: string | null;
        level: number;
        supportTierSent: import("@prisma/client").SupportTierLevel;
      };
      community: { name: string; slug: string } | null;
      media: { url: string; type: string; priceKrw: number | null }[];
      _count: { likes: number; comments: number; votes: number };
    }> = [];
    try {
      posts = await db.post.findMany({
        where: { communityId: community.id },
        take: 30,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        include: {
          author: { select: userPublicSelect },
          community: { select: { name: true, slug: true } },
          media: postMediaPreview,
          _count: { select: { likes: true, comments: true, votes: true, media: true } },
        },
      });
    } catch (postsErr) {
      console.error("[getCommunityBySlug] posts load failed", postsErr);
    }

    let membership: { role: string } | null = null;
    if (user) {
      try {
        membership = await db.communityMember.findUnique({
          where: { communityId_userId: { communityId: community.id, userId: user.id } },
          select: { role: true },
        });
      } catch (memberErr) {
        console.error("[getCommunityBySlug] membership load failed", memberErr);
      }
    }

    return {
      community: { ...community, posts },
      viewer: user
        ? {
            userId: user.id,
            isMember: !!membership,
            role: membership?.role ?? null,
            isOwner: membership?.role === "owner" || community.creatorId === user.id,
          }
        : null,
    };
  } catch (e) {
    console.error("[getCommunityBySlug]", e);
    return null;
  }
}

export async function joinCommunity(communityId: string, inviteCode?: string) {
  const { joinCommunityServer } = await import("@/actions/community-join");
  const result = await joinCommunityServer(communityId, inviteCode);
  if ("error" in result && result.error) return { error: result.error };
  if ("pending" in result && result.pending) return { error: result.message };
  return { success: true as const };
}

export async function leaveCommunity(communityId: string) {
  try {
    const user = await requireAuth();
    const member = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: user.id } },
      include: { community: { select: { slug: true, creatorId: true } } },
    });
    if (!member) return { success: true as const };
    if (member.role === "owner" || member.community.creatorId === user.id) {
      return { error: "개설자는 탈퇴할 수 없습니다. 커뮤니티 설정에서 삭제하세요." };
    }

    await db.$transaction([
      db.communityMember.delete({ where: { id: member.id } }),
      db.community.update({
        where: { id: communityId },
        data: { memberCount: { decrement: 1 } },
      }),
    ]);

    revalidatePath(`/c/${member.community.slug}`);
    return { success: true as const };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function getCommunityMembers(communityId: string, take = 50) {
  try {
    const rows = await db.communityMember.findMany({
      where: { communityId },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      take,
    });
    const userIds = rows.map((r) => r.userId);
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, image: true, name: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return {
      members: rows.map((r) => ({
        id: r.id,
        role: r.role,
        joinedAt: r.joinedAt,
        user: byId.get(r.userId) ?? null,
      })),
    };
  } catch {
    return { members: [] };
  }
}

export async function updateCommunity(
  communityId: string,
  data: {
    name?: string;
    description?: string;
    category?: string;
    isNsfw?: boolean;
    iconUrl?: string;
    bannerUrl?: string;
    isPublic?: boolean;
  }
) {
  try {
    const user = await requireAuth();
    const community = await db.community.findUnique({ where: { id: communityId } });
    if (!community) return { error: "커뮤니티를 찾을 수 없습니다." };

    const { loadMemberPermissions } = await import("@/lib/community-server/member-permissions");
    const { hasPermission } = await import("@/lib/community-server/permissions");
    const isOwner = community.creatorId === user.id;
    const perms = await loadMemberPermissions(communityId, user.id, isOwner);
    if (!isOwner && !hasPermission(perms, "editServerInfo") && !hasPermission(perms, "manageServer")) {
      return { error: "수정 권한이 없습니다." };
    }
    if (data.isPublic !== undefined && !isOwner && !hasPermission(perms, "setVisibility")) {
      return { error: "공개 설정 변경 권한이 없습니다." };
    }
    if ((data.iconUrl !== undefined || data.bannerUrl !== undefined) && !isOwner) {
      if (!hasPermission(perms, "editIcon") && !hasPermission(perms, "editBanner")) {
        return { error: "이미지 변경 권한이 없습니다." };
      }
    }

    const name = data.name?.trim();
    if (name !== undefined && (name.length < 2 || name.length > 80)) {
      return { error: "이름은 2~80자로 입력해 주세요." };
    }

    let category: CommunityCategory | undefined;
    if (data.category) {
      category = data.category as CommunityCategory;
      if (!COMMUNITY_CATEGORIES.includes(category as (typeof COMMUNITY_CATEGORIES)[number])) {
        return { error: "카테고리를 확인해 주세요." };
      }
    }

    await db.community.update({
      where: { id: communityId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(data.description !== undefined
          ? { description: data.description.trim() || null }
          : {}),
        ...(category ? { category } : {}),
        ...(data.isNsfw !== undefined ? { isNsfw: data.isNsfw } : {}),
        ...(data.iconUrl !== undefined ? { iconUrl: data.iconUrl || null } : {}),
        ...(data.bannerUrl !== undefined ? { bannerUrl: data.bannerUrl || null } : {}),
        ...(data.isPublic !== undefined ? { isPublic: data.isPublic } : {}),
      },
    });

    revalidatePath(`/c/${community.slug}`);
    revalidatePath("/communities");
    return { success: true as const };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function deleteCommunity(communityId: string) {
  try {
    const user = await requireAuth();
    const community = await db.community.findUnique({
      where: { id: communityId },
      select: { id: true, slug: true, creatorId: true },
    });
    if (!community) return { error: "커뮤니티를 찾을 수 없습니다." };

    const { loadMemberPermissions } = await import("@/lib/community-server/member-permissions");
    const { hasPermission } = await import("@/lib/community-server/permissions");
    const isOwner = community.creatorId === user.id;
    const perms = await loadMemberPermissions(communityId, user.id, isOwner);
    if (!isOwner && !hasPermission(perms, "deleteServer")) {
      return { error: "삭제 권한이 없습니다." };
    }

    await db.community.delete({ where: { id: communityId } });
    revalidatePath("/communities");
    return { success: true as const, slug: community.slug };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}
