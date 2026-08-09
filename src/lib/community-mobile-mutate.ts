import { after } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { Prisma, type CommunityCategory } from "@prisma/client";
import { db } from "@/lib/db";
import { generateCommunitySlug } from "@/lib/community-slug";
import { isCommunityCategory } from "@/lib/community-labels";
import { provisionCommunityServer } from "@/lib/community-server/provision";
import { loadMemberPermissions } from "@/lib/community-server/member-permissions";
import { hasPermission } from "@/lib/community-server/permissions";
import { COMMUNITIES_LIST_CACHE_TAG } from "@/lib/cache-tags";
import { prismaErrorMessage } from "@/lib/prisma-user-error";

function revalidateCommunitiesList(slug?: string) {
  after(() => {
    try {
      revalidateTag(COMMUNITIES_LIST_CACHE_TAG);
    } catch (e) {
      console.error("[community-mobile] revalidateTag", e);
    }
    revalidatePath("/communities");
    if (slug) revalidatePath(`/c/${slug}`);
  });
}

export async function createCommunityForUser(
  userId: string,
  data: {
    name: string;
    description?: string;
    category: string;
    isNsfw?: boolean;
  }
): Promise<{ community: { id: string; slug: string; name: string } } | { error: string }> {
  const name = data.name?.trim();
  if (!name || name.length < 2) {
    return { error: "커뮤니티 이름은 2자 이상 입력해 주세요." };
  }
  if (name.length > 80) {
    return { error: "커뮤니티 이름은 80자 이하로 입력해 주세요." };
  }

  const category = data.category as CommunityCategory;
  if (!isCommunityCategory(category)) {
    return { error: "카테고리를 선택해 주세요." };
  }

  const description = data.description?.trim() || null;

  try {
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
              creatorId: userId,
              memberCount: 1,
            },
            select: { id: true, slug: true, name: true },
          });
          await tx.communityMember.create({
            data: {
              communityId: row.id,
              userId,
              role: "owner",
              presence: "ONLINE",
            },
          });
          return row;
        });

        after(async () => {
          try {
            await db.$transaction((tx) =>
              provisionCommunityServer(tx, community.id, userId, name)
            );
          } catch (e) {
            console.error("[createCommunityForUser] deferred provision", e);
          }
        });

        revalidateCommunitiesList(community.slug);
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
    console.error("[createCommunityForUser]", e);
    return { error: prismaErrorMessage(e) };
  }
}

export async function getCommunityBrandingPermissions(
  communityId: string,
  userId: string | null,
  creatorId: string
) {
  if (!userId) {
    return { isOwner: false, canEditIcon: false, canEditBanner: false };
  }
  const isOwner = creatorId === userId;
  const perms = await loadMemberPermissions(communityId, userId, isOwner);
  return {
    isOwner,
    canEditIcon: isOwner || hasPermission(perms, "editIcon"),
    canEditBanner: isOwner || hasPermission(perms, "editBanner"),
  };
}

export async function updateCommunityBrandingForUser(
  userId: string,
  slug: string,
  data: { iconUrl?: string | null; bannerUrl?: string | null }
): Promise<
  | { success: true; iconUrl: string | null; bannerUrl: string | null }
  | { error: string; status?: number }
> {
  const community = await db.community.findUnique({
    where: { slug },
    select: { id: true, slug: true, creatorId: true, iconUrl: true, bannerUrl: true },
  });
  if (!community) return { error: "커뮤니티를 찾을 수 없습니다.", status: 404 };

  const branding = await getCommunityBrandingPermissions(
    community.id,
    userId,
    community.creatorId
  );

  if (data.iconUrl !== undefined && !branding.canEditIcon) {
    return { error: "대표 이미지 변경 권한이 없습니다.", status: 403 };
  }
  if (data.bannerUrl !== undefined && !branding.canEditBanner) {
    return { error: "배너 변경 권한이 없습니다.", status: 403 };
  }
  if (data.iconUrl === undefined && data.bannerUrl === undefined) {
    return { error: "변경할 이미지가 없습니다.", status: 400 };
  }

  const updated = await db.community.update({
    where: { id: community.id },
    data: {
      ...(data.iconUrl !== undefined ? { iconUrl: data.iconUrl || null } : {}),
      ...(data.bannerUrl !== undefined ? { bannerUrl: data.bannerUrl || null } : {}),
    },
    select: { iconUrl: true, bannerUrl: true },
  });

  revalidateCommunitiesList(community.slug);
  return { success: true, iconUrl: updated.iconUrl, bannerUrl: updated.bannerUrl };
}
