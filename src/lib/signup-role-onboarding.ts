import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { userDisplayName } from "@/lib/user-public-select";

export const NEEDS_SIGNUP_ROLE_COOKIE = "mocomo_needs_signup_role";

export type SignupOnboardingRole = "fan" | "coser";

export type OnboardingCosplayerItem = {
  userId: string;
  username: string;
  displayName: string;
  image: string | null;
  photoUrl: string | null;
  bio: string | null;
  followerCount: number;
  following: boolean;
};

export async function markSignupNeedsRole() {
  const jar = await cookies();
  jar.set(NEEDS_SIGNUP_ROLE_COOKIE, "1", {
    path: "/",
    maxAge: 60 * 60,
    sameSite: "lax",
    httpOnly: true,
  });
}

export async function clearSignupNeedsRole() {
  const jar = await cookies();
  jar.delete(NEEDS_SIGNUP_ROLE_COOKIE);
}

export async function hasSignupNeedsRoleCookie(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(NEEDS_SIGNUP_ROLE_COOKIE)?.value === "1";
}

/** Popular Culture Wiki cosplayers for post-signup follow suggestions. */
export async function listOnboardingCosplayers(opts?: {
  take?: number;
  viewerId?: string | null;
}): Promise<OnboardingCosplayerItem[]> {
  const take = Math.min(Math.max(opts?.take ?? 24, 1), 40);
  const viewerId = opts?.viewerId ?? null;

  const rows = await db.cosplayerProfile.findMany({
    take,
    orderBy: [{ followerCount: "desc" }, { updatedAt: "desc" }],
    where: viewerId ? { userId: { not: viewerId } } : undefined,
    select: {
      bio: true,
      followerCount: true,
      userId: true,
      user: { select: { username: true, name: true, image: true } },
      photos: { take: 1, orderBy: { createdAt: "asc" }, select: { url: true } },
    },
  });

  let followingIds = new Set<string>();
  if (viewerId && rows.length > 0) {
    const follows = await db.follow.findMany({
      where: {
        followerId: viewerId,
        followingId: { in: rows.map((r) => r.userId) },
      },
      select: { followingId: true },
    });
    followingIds = new Set(follows.map((f) => f.followingId));
  }

  return rows.map((r) => ({
    userId: r.userId,
    username: r.user.username,
    displayName: userDisplayName(r.user),
    image: r.user.image,
    photoUrl: r.photos[0]?.url ?? null,
    bio: r.bio,
    followerCount: r.followerCount,
    following: followingIds.has(r.userId),
  }));
}

export function signupRoleContinuePath(dest?: string | null): string {
  const path = dest?.trim() ?? "";
  const safe = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  return `/auth/complete-avatar?dest=${encodeURIComponent(safe)}`;
}

export function signupRoleEntryPath(dest?: string | null): string {
  const path = dest?.trim() ?? "";
  const safe = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  return `/auth/complete-role?dest=${encodeURIComponent(safe)}`;
}
