"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuthForAction } from "@/lib/auth";
import { applyProfileUpdateForUser } from "@/lib/profile-update-service";

export const NEEDS_AVATAR_COOKIE = "mocomo_needs_avatar";

export async function markSignupNeedsAvatar() {
  const jar = await cookies();
  jar.set(NEEDS_AVATAR_COOKIE, "1", {
    path: "/",
    maxAge: 60 * 60,
    sameSite: "lax",
    httpOnly: true,
  });
}

export async function clearSignupNeedsAvatar() {
  const jar = await cookies();
  jar.delete(NEEDS_AVATAR_COOKIE);
}

export async function completeAvatarOnboarding(input: {
  image: string;
  dest?: string;
}): Promise<{ error?: string }> {
  const user = await requireAuthForAction();
  const image = input.image?.trim() ?? "";
  if (!image) {
    return { error: "프로필 사진을 설정해 주세요." };
  }

  const result = await applyProfileUpdateForUser(user.id, { image });
  if (result.error) return { error: result.error };

  await clearSignupNeedsAvatar();
  revalidatePath("/settings/profile");
  revalidatePath("/");

  const dest = input.dest?.trim();
  if (dest && dest.startsWith("/") && !dest.startsWith("//")) {
    redirect(dest);
  }
  redirect("/");
}
