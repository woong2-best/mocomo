import { after } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { Prisma, type CommunityCategory } from "@prisma/client";
import { db } from "@/lib/db";
import { generateCommunitySlug } from "@/lib/community-slug";
import { isCommunityCategory, validateCustomCategoryLabel } from "@/lib/community-labels";
import { provisionCommunityServer } from "@/lib/community-server/provision";
import { loadMemberPermissions } from "@/lib/community-server/member-permissions";
import { hasPermission } from "@/lib/community-server/permissions";
import { COMMUNITIES_LIST_CACHE_TAG } from "@/lib/cache-tags";
import { prismaErrorMessage } from "@/lib/prisma-user-error";
import { assertCanPublishNsfwContent, nsfwViewerSelect } from "@/lib/nsfw-viewer-access";

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
    customCategoryLabel?: string;
    isNsfw?: boolean;
  }
): Promise<{ community: { id: string; slug: string; name: string } } | { error: string }> {
  const name = data.name?.trim();
  if (!name || name.length < 2) {
    return { error: "Community name must be at least 2 characters." };
  }
  if (name.length > 80) {
    return { error: "Community name must be 80 characters or fewer." };
  }

  const category = data.category as CommunityCategory;
  if (!isCommunityCategory(category)) {
    return { error: "Select a category." };
  }

  let customCategoryLabel: string | null = null;
  if (category === "CUSTOM") {
    const customErr = validateCustomCategoryLabel(data.customCategoryLabel);
    if (customErr) return { error: customErr };
    customCategoryLabel = data.customCategoryLabel!.trim();
  }

  const description = data.description?.trim() || null;
  const isNsfw = data.isNsfw ?? false;

  if (isNsfw) {
    const nsfwUser = await db.user.findUnique({
      where: { id: userId },
      select: nsfwViewerSelect,
    });
    const publishErr = assertCanPublishNsfwContent(
      nsfwUser ?? { id: userId, birthDate: null },
      true
    );
    if (publishErr) return { error: publishErr };
  }

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
              customCategoryLabel,
              isNsfw,
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
    return { error: "That community URL is taken. Choose a different name." };
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
  data: { iconUrl?: string | null; coverUrl?: string | null; bannerUrl?: string | null; bannerVideoUrl?: string | null }
): Promise<
  | {
      success: true;
      iconUrl: string | null;
      coverUrl: string | null;
      bannerUrl: string | null;
      bannerVideoUrl: string | null;
    }
  | { error: string; status?: number }
> {
  const community = await db.community.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      creatorId: true,
      iconUrl: true,
      coverUrl: true,
      bannerUrl: true,
      bannerVideoUrl: true,
    },
  });
  if (!community) return { error: "Community not found.", status: 404 };

  const branding = await getCommunityBrandingPermissions(
    community.id,
    userId,
    community.creatorId
  );

  if (data.iconUrl !== undefined && !branding.canEditIcon) {
    return { error: "You can't change the profile image.", status: 403 };
  }
  if (data.coverUrl !== undefined && !branding.canEditIcon) {
    return { error: "You can't change the card cover.", status: 403 };
  }
  if (data.bannerUrl !== undefined && !branding.canEditBanner) {
    return { error: "You can't change the banner.", status: 403 };
  }
  if (data.bannerVideoUrl !== undefined && !branding.canEditBanner) {
    return { error: "You can't change the banner.", status: 403 };
  }
  if (
    data.iconUrl === undefined &&
    data.coverUrl === undefined &&
    data.bannerUrl === undefined &&
    data.bannerVideoUrl === undefined
  ) {
    return { error: "No image to update.", status: 400 };
  }

  const bannerUrl = data.bannerUrl !== undefined ? data.bannerUrl || null : undefined;
  const bannerVideoUrl =
    data.bannerVideoUrl !== undefined ? data.bannerVideoUrl || null : undefined;

  const updated = await db.community.update({
    where: { id: community.id },
    data: {
      ...(data.iconUrl !== undefined ? { iconUrl: data.iconUrl || null } : {}),
      ...(data.coverUrl !== undefined ? { coverUrl: data.coverUrl || null } : {}),
      ...(bannerUrl !== undefined
        ? { bannerUrl, ...(bannerUrl ? { bannerVideoUrl: null } : {}) }
        : {}),
      ...(bannerVideoUrl !== undefined
        ? { bannerVideoUrl, ...(bannerVideoUrl ? { bannerUrl: null } : {}) }
        : {}),
    },
    select: { iconUrl: true, coverUrl: true, bannerUrl: true, bannerVideoUrl: true },
  });

  revalidateCommunitiesList(community.slug);
  return {
    success: true,
    iconUrl: updated.iconUrl,
    coverUrl: updated.coverUrl,
    bannerUrl: updated.bannerUrl,
    bannerVideoUrl: updated.bannerVideoUrl,
  };
}
