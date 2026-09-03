import type { Prisma, UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { ADULT_MIN_AGE } from "@/lib/adult-verification/constants";
import { isAdultAge } from "@/lib/adult-verification/is-verified";
import { hasStripeAdultEstablishment } from "@/lib/stripe-adult-access";

/** Site roles that may bypass NSFW age gates (moderation). */
const NSFW_BYPASS_ROLES = new Set<UserRole>([
  "ADMIN",
  "MODERATOR",
  "SENIOR_MODERATOR",
  "SUPER_ADMIN",
  "OWNER",
]);

/** Fields needed to decide whether a viewer may see or publish NSFW content. */
export const nsfwViewerSelect = {
  id: true,
  birthDate: true,
  role: true,
} as const;

export type NsfwViewer = {
  id: string;
  birthDate: Date | null;
  role?: UserRole | null;
};

export type PostNsfwBlocked = { nsfwBlocked: true };

export const NSFW_PUBLISH_BLOCKED_MSG = `만 ${ADULT_MIN_AGE}세 이상 계정만 성인 콘텐츠를 게시할 수 있습니다.`;

export const NSFW_VIEW_BLOCKED_MSG =
  "성인 콘텐츠는 로그인 후 생년월일 기준 만 19세 이상 계정에서만 볼 수 있습니다.";

export const NSFW_BIRTHDATE_REQUIRED_MSG =
  "성인 콘텐츠 이용을 위해 프로필에 생년월일을 등록해 주세요.";

function hasNsfwBypassRole(role: UserRole | null | undefined): boolean {
  return !!role && NSFW_BYPASS_ROLES.has(role);
}

/**
 * Free NSFW browsing (feed, search, profiles, live hub listings).
 * Global standard: logged-in + birthDate proving age ≥ 19. No PortOne / ID scan.
 */
export function canViewNsfwContent(
  viewer:
    | NsfwViewer
    | { id?: string | null; birthDate?: Date | null; role?: UserRole | null }
    | null
    | undefined
): boolean {
  if (!viewer?.id) return false;
  if (hasNsfwBypassRole(viewer.role ?? null)) return true;
  if (!viewer.birthDate) return false;
  return isAdultAge(viewer.birthDate);
}

/**
 * Paid / creator monetization paths: birthDate 19+ OR Stripe card/Connect establishment.
 */
export async function canAccessPaidAdultContent(
  userId: string,
  viewer?: (NsfwViewer & {
    stripeCustomerId?: string | null;
    stripeConnectAccountId?: string | null;
    stripeConnectOnboardedAt?: Date | null;
  }) | null
): Promise<boolean> {
  if (viewer && canViewNsfwContent(viewer)) return true;
  if (!viewer) {
    const row = await db.user.findUnique({
      where: { id: userId },
      select: {
        ...nsfwViewerSelect,
        stripeCustomerId: true,
        stripeConnectAccountId: true,
        stripeConnectOnboardedAt: true,
      },
    });
    if (canViewNsfwContent(row)) return true;
    return hasStripeAdultEstablishment(userId, row);
  }
  return hasStripeAdultEstablishment(userId, viewer);
}

export async function resolveCanViewNsfw(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const viewer = await db.user.findUnique({
    where: { id: userId },
    select: nsfwViewerSelect,
  });
  return canViewNsfwContent(viewer);
}

export async function getNsfwViewer(userId: string | null | undefined): Promise<NsfwViewer | null> {
  if (!userId) return null;
  return db.user.findUnique({ where: { id: userId }, select: nsfwViewerSelect });
}

/** Prisma WHERE fragment — exclude NSFW rows for blocked viewers. */
export function nsfwExclusionWhere(canView: boolean): { isNsfw?: false } {
  return canView ? {} : { isNsfw: false };
}

export function nsfwPostWhere(canView: boolean): Prisma.PostWhereInput {
  return nsfwExclusionWhere(canView);
}

export function nsfwCommunityWhere(canView: boolean): Prisma.CommunityWhereInput {
  return nsfwExclusionWhere(canView);
}

export function nsfwListingWhere(canView: boolean): { isNsfw?: false } {
  return nsfwExclusionWhere(canView);
}

export function assertCanPublishNsfwContent(
  user: { id: string; birthDate: Date | null; role?: UserRole | null },
  isNsfw: boolean
): string | null {
  if (!isNsfw) return null;
  return canViewNsfwContent(user) ? null : NSFW_PUBLISH_BLOCKED_MSG;
}

export function filterNsfwItems<T extends { isNsfw?: boolean | null }>(
  items: T[],
  canView: boolean
): T[] {
  if (canView) return items;
  return items.filter((item) => !item.isNsfw);
}

export function filterNsfwChannels<
  T extends { isNsfw?: boolean | null; contentRating?: string | null },
>(items: T[], canView: boolean): T[] {
  if (canView) return items;
  return items.filter(
    (item) => !(item.isNsfw === true || item.contentRating === "ADULT")
  );
}

export function isPostDetailNsfwBlocked(
  detail: { nsfwBlocked?: boolean } | null
): detail is PostNsfwBlocked {
  return !!detail && "nsfwBlocked" in detail && detail.nsfwBlocked === true;
}

/** Direct URL access — owner always sees own NSFW; others need adult eligibility. */
export async function canViewNsfwResource(opts: {
  viewerId?: string | null;
  ownerId?: string | null;
  isNsfw: boolean;
}): Promise<boolean> {
  if (!opts.isNsfw) return true;
  if (opts.viewerId && opts.ownerId && opts.viewerId === opts.ownerId) return true;
  return resolveCanViewNsfw(opts.viewerId);
}
